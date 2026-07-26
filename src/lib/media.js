import { supabase, isConfigured } from './supabase'
import { read, write, withTimeout } from './store'

/* Photos are the one thing too big for localStorage, so they live in IndexedDB
   locally and in Supabase Storage remotely.

   A media reference is either a real https URL (uploaded) or `local:<id>`
   (still only on this device). Anything still local is listed in PENDING_KEY
   and retried later. */

const BUCKET = 'travel-photos'
const DB_NAME = 'wt-media'
const STORE = 'blobs'
const PENDING_KEY = 'wt.media.pending.v1'

const MAX_EDGE = 1400
const QUALITY = 0.72

/* — IndexedDB ————————————————————————————————— */

let dbPromise
const openDB = () => {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function idb(mode, fn) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const putBlob = (id, blob) => idb('readwrite', (s) => s.put(blob, id))
const getBlob = (id) => idb('readonly', (s) => s.get(id))
const delBlob = (id) => idb('readwrite', (s) => s.delete(id))

/* — Compression ————————————————————————————————
   Downscale before anything else touches the file: a 12MP phone photo is
   ~4MB, and we neither want to store nor upload that. */

function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
        'image/jpeg',
        QUALITY
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('not an image'))
    }
    img.src = url
  })
}

/* — Public API ————————————————————————————————— */

const pending = () => read(PENDING_KEY, [])

async function upload(id, blob) {
  const { error } = await withTimeout(
    supabase.storage.from(BUCKET).upload(`${id}.jpg`, blob, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  )
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${id}.jpg`)
  return data.publicUrl
}

// Returns a media ref to store on the row.
export async function saveImage(file) {
  const blob = await compress(file)
  const id = crypto.randomUUID()

  // Always keep the local copy — it's what makes the gallery work offline,
  // and it's the retry source if the upload fails.
  await putBlob(id, blob)

  if (isConfigured && navigator.onLine) {
    try {
      const url = await upload(id, blob)
      return url
    } catch {
      // fall through to local-only
    }
  }

  write(PENDING_KEY, [...pending(), id])
  return `local:${id}`
}

// Resolve a ref to something an <img src> accepts.
export async function resolveMedia(ref) {
  if (!ref) return ''
  if (!ref.startsWith('local:')) return ref
  const blob = await getBlob(ref.slice(6))
  return blob ? URL.createObjectURL(blob) : ''
}

export async function deleteImage(ref) {
  if (!ref) return
  if (ref.startsWith('local:')) {
    const id = ref.slice(6)
    await delBlob(id).catch(() => {})
    write(PENDING_KEY, pending().filter((p) => p !== id))
    return
  }
  const name = ref.split('/').pop()
  if (isConfigured && navigator.onLine && name) {
    await supabase.storage.from(BUCKET).remove([name]).catch(() => {})
  }
}

/* — Backup support ————————————————————————————
   Images that only exist on this device would be lost in a restore if the
   backup carried nothing but the rows referencing them, so they travel as
   base64 inside the export. Uploaded photos are already safe in Supabase
   Storage and are referenced by URL. */

const blobToB64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export async function exportLocalMedia() {
  const ids = await idb('readonly', (s) => s.getAllKeys())
  const out = {}
  for (const id of ids) {
    const blob = await getBlob(id)
    if (blob) out[id] = await blobToB64(blob)
  }
  return out
}

export async function importLocalMedia(map = {}) {
  for (const [id, b64] of Object.entries(map)) {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    await putBlob(id, new Blob([bytes], { type: 'image/jpeg' }))
  }
}

/* Retry local-only images. `rewrite(oldRef, newUrl)` is supplied by the caller
   so this module doesn't need to know which tables reference media. */
export async function flushMedia(rewrite) {
  if (!isConfigured || !navigator.onLine) return
  const ids = pending()
  if (ids.length === 0) return

  const stuck = []
  for (const id of ids) {
    try {
      const blob = await getBlob(id)
      if (!blob) continue // nothing left to upload; drop it
      const url = await upload(id, blob)
      await rewrite(`local:${id}`, url)
    } catch {
      stuck.push(id)
    }
  }
  write(PENDING_KEY, stuck)
}
