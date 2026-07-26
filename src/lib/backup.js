import { exportLocalMedia, importLocalMedia } from './media'
import { exportVaultBlob, importVaultBlob } from './vault'

/* Export / restore.

   A backup is a single JSON file containing every record, plus any photo that
   exists only on this device (base64), plus the travel-docs vault as
   ciphertext. The vault is safe to include precisely because it stays
   encrypted — the passphrase is not in the file and is still required to read
   it after a restore. */

const VERSION = 1

// Every localStorage key the app owns. Chat transcripts are deliberately
// excluded: they're conversational scratch, not records worth restoring.
const KEYS = [
  'wt.trips.v1',
  'wt.hotels.v1',
  'wt.food.v1',
  'wt.postcards.v1',
  'wt.photos.v1',
  'wt.cards.v1',
  'wt.wishlist.v1',
  'wt.templates.v1',
  'wt.checklist.v1',
  'wt.badges.v1',
  'wt.badges.init.v1',
  'wt.reminders.prefs.v1',
  'wt.queue.v2',
  'wt.media.pending.v1',
]

const read = (k) => {
  const raw = localStorage.getItem(k)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

export async function buildBackup() {
  const records = {}
  for (const k of KEYS) {
    const v = read(k)
    if (v !== undefined) records[k] = v
  }

  return {
    app: 'woodley-travels',
    version: VERSION,
    exported_at: new Date().toISOString(),
    records,
    media: await exportLocalMedia(),
    vault: exportVaultBlob(), // ciphertext; useless without the passphrase
  }
}

export function backupFilename(date = new Date()) {
  return `woodley-travels-backup-${date.toISOString().slice(0, 10)}.json`
}

export async function downloadBackup() {
  const backup = await buildBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = backupFilename()
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick — revoking synchronously can cancel the download
  // in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)

  return backup
}

export function summarize(backup) {
  const count = (k) => (Array.isArray(backup.records?.[k]) ? backup.records[k].length : 0)
  return {
    trips: count('wt.trips.v1'),
    hotels: count('wt.hotels.v1'),
    food: count('wt.food.v1'),
    postcards: count('wt.postcards.v1'),
    photos: count('wt.photos.v1'),
    wishlist: count('wt.wishlist.v1'),
    cards: count('wt.cards.v1'),
    templates: count('wt.templates.v1'),
    localImages: Object.keys(backup.media ?? {}).length,
    hasVault: Boolean(backup.vault?.payload),
    exported_at: backup.exported_at,
  }
}

export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON.")
  }
  if (data?.app !== 'woodley-travels') {
    throw new Error("That doesn't look like a Woodley Travels backup.")
  }
  if (typeof data.version !== 'number' || data.version > VERSION) {
    throw new Error('That backup was made by a newer version of the app.')
  }
  if (!data.records || typeof data.records !== 'object') {
    throw new Error('That backup has no records in it.')
  }
  return data
}

/* Restore REPLACES everything currently on this device. The caller is
   responsible for confirming — there is no undo beyond a prior export. */
export async function restoreBackup(backup) {
  for (const k of KEYS) localStorage.removeItem(k)

  for (const [k, v] of Object.entries(backup.records)) {
    if (!KEYS.includes(k)) continue // ignore unknown keys rather than trusting them
    localStorage.setItem(k, JSON.stringify(v))
  }

  await importLocalMedia(backup.media ?? {})
  if (backup.vault?.payload) importVaultBlob(backup.vault)
}
