/* App PIN.

   Until now the PIN came from VITE_PASSCODE, which is baked into the bundle at
   build time and therefore both readable and unchangeable without a redeploy.
   A PIN set here is stored as a PBKDF2 hash instead, so the code itself isn't
   sitting in localStorage in the clear.

   Be clear-eyed about what this is: a 4-digit PIN has 10,000 possibilities.
   Hashing stops a casual glance at devtools, not a determined attacker with
   the device. It's a "keep other people out of my passport book" gate. The
   travel-docs vault is the part with real cryptographic strength behind it,
   and it uses a separate passphrase for exactly that reason. */

const KEY = 'wt.pin.v1'
const ITERATIONS = 200_000

const enc = new TextEncoder()
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

const envPin = () => import.meta.env.VITE_PASSCODE ?? ''

async function hash(pin, salt) {
  const material = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    256
  )
  return toB64(bits)
}

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

export const hasCustomPin = () => Boolean(read()?.hash)

export async function setPin(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  localStorage.setItem(
    KEY,
    JSON.stringify({ v: 1, salt: toB64(salt), hash: await hash(pin, salt) })
  )
}

export async function verifyPin(pin) {
  const stored = read()
  // No custom PIN set yet — fall back to the build-time one.
  if (!stored?.hash) return pin === envPin()

  // Constant-time-ish: compare fixed-length base64 of the same derivation.
  const candidate = await hash(pin, fromB64(stored.salt))
  if (candidate.length !== stored.hash.length) return false
  let diff = 0
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ stored.hash.charCodeAt(i)
  }
  return diff === 0
}

export const clearPin = () => localStorage.removeItem(KEY)
