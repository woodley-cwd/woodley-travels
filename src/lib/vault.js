/* Encrypted travel documents.

   This holds passport numbers, emergency contacts, and insurance details, so
   it uses real cryptography rather than obfuscation:

   - AES-GCM 256, which is authenticated — a wrong key fails to decrypt rather
     than returning plausible garbage, and tampering with the ciphertext is
     detected.
   - The key is derived from a passphrase with PBKDF2-HMAC-SHA256 at 600,000
     iterations (the current OWASP figure), with a random 16-byte salt.
   - The derived key lives in memory only. It is never written to disk, never
     put in localStorage, and never sent anywhere.

   DELIBERATE CHOICES, and their consequences:

   1. The vault passphrase is SEPARATE from the 4-digit app PIN. A 4-digit PIN
      has 10,000 possibilities; anyone holding the ciphertext could exhaust
      that offline regardless of the iteration count. A passphrase is the only
      thing that makes the encryption meaningful.

   2. Documents are stored on this device only — they are not synced to
      Supabase. The Supabase anon key ships inside the client bundle, so a
      synced vault would put your passport ciphertext somewhere readable by
      anyone who has the app, with only the passphrase in the way. Keeping it
      local means the ciphertext never leaves the device. The cost is that
      travel docs don't appear on your other devices, and clearing site data
      erases them — so export a backup.

   3. There is no recovery. Forget the passphrase and the documents are gone.
      That is what it means for encryption to work. */

const STORE_KEY = 'wt.vault.v1'
const ITERATIONS = 600_000
const KEY_LENGTH = 256

const enc = new TextEncoder()
const dec = new TextDecoder()

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export const cryptoAvailable = () =>
  typeof crypto !== 'undefined' && !!crypto.subtle

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // non-extractable: the key cannot be read back out of the browser
    ['encrypt', 'decrypt']
  )
}

const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY))
  } catch {
    return null
  }
}

export const vaultExists = () => Boolean(readStore()?.payload)

/* Create a brand-new vault. Overwrites any existing one — callers must
   confirm first, because the old contents become unrecoverable. */
export async function createVault(passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(passphrase, salt)
  const store = {
    v: 1,
    iterations: ITERATIONS,
    salt: toB64(salt),
    payload: null,
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
  await writeDocs(key, [])
  return key
}

/* Returns the in-memory key on success, or null if the passphrase is wrong.
   AES-GCM's authentication tag is what makes this a reliable check — there is
   no separate password hash to leak. */
export async function unlockVault(passphrase) {
  const store = readStore()
  if (!store) return null

  const key = await deriveKey(passphrase, fromB64(store.salt))
  try {
    await readDocs(key)
    return key
  } catch {
    return null // wrong passphrase, or the ciphertext was tampered with
  }
}

export async function readDocs(key) {
  const store = readStore()
  if (!store?.payload) return []

  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(store.payload.iv) },
    key,
    fromB64(store.payload.ct)
  )
  return JSON.parse(dec.decode(plain))
}

export async function writeDocs(key, docs) {
  const store = readStore()
  if (!store) throw new Error('No vault')

  // A fresh IV per write. Reusing an IV with the same key breaks AES-GCM
  // badly, so this must never be hoisted out or cached.
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(docs))
  )

  store.payload = { iv: toB64(iv), ct: toB64(ct) }
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
  return docs
}

/* Change the passphrase: decrypt with the old key, re-derive against a new
   salt, re-encrypt. Returns the new key, or null if the old one was wrong. */
export async function changePassphrase(oldPassphrase, newPassphrase) {
  const oldKey = await unlockVault(oldPassphrase)
  if (!oldKey) return null

  const docs = await readDocs(oldKey)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const newKey = await deriveKey(newPassphrase, salt)

  const store = readStore()
  store.salt = toB64(salt)
  store.iterations = ITERATIONS
  localStorage.setItem(STORE_KEY, JSON.stringify(store))

  await writeDocs(newKey, docs)
  return newKey
}

export function destroyVault() {
  localStorage.removeItem(STORE_KEY)
}

// The raw encrypted blob, for inclusion in a backup export. Safe to hand out:
// without the passphrase it's inert.
export const exportVaultBlob = () => readStore()
export function importVaultBlob(blob) {
  if (!blob?.salt || !blob?.payload) throw new Error('Not a vault backup')
  localStorage.setItem(STORE_KEY, JSON.stringify(blob))
}

export const DOC_TYPES = [
  ['passport', 'Passport'],
  ['id', 'ID / License'],
  ['insurance', 'Insurance'],
  ['contact', 'Emergency contact'],
  ['other', 'Other'],
]

export const emptyDoc = () => ({
  id: crypto.randomUUID(),
  type: 'passport',
  label: '',
  fields: [{ name: '', value: '' }],
  notes: '',
  created_at: new Date().toISOString(),
})
