import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  cryptoAvailable, vaultExists, createVault, unlockVault, readDocs, writeDocs,
  DOC_TYPES, emptyDoc,
} from '../lib/vault'
import { Back, Lock, Plus, Trash, Compass } from '../components/Icons'
import { Field, inputClass, Sheet, SubmitRow, EASE } from '../components/Form'

// The decrypted key is dropped after this long without interaction, so an
// unlocked vault left open on a table doesn't stay readable.
const AUTO_LOCK_MS = 5 * 60 * 1000
const MIN_PASSPHRASE = 10

export default function DocsScreen({ onClose }) {
  const [key, setKey] = useState(null) // CryptoKey — memory only
  const [docs, setDocs] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [revealed, setRevealed] = useState({})

  const existing = vaultExists()
  const lockTimer = useRef(null)

  const lock = useCallback(() => {
    setKey(null)
    setDocs([])
    setRevealed({})
    setEditing(null)
  }, [])

  // Any interaction pushes the auto-lock back out.
  useEffect(() => {
    if (!key) return
    const bump = () => {
      clearTimeout(lockTimer.current)
      lockTimer.current = setTimeout(lock, AUTO_LOCK_MS)
    }
    bump()
    const events = ['pointerdown', 'keydown']
    events.forEach((e) => window.addEventListener(e, bump))
    return () => {
      clearTimeout(lockTimer.current)
      events.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [key, lock])

  // Lock when the app is backgrounded, so a task-switch doesn't leave it open.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && lock()
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [lock])

  const save = async (next) => {
    setDocs(await writeDocs(key, next))
    setEditing(null)
  }

  if (!cryptoAvailable()) {
    return (
      <Shell onClose={onClose}>
        <p className="card-paper texture-paper rounded-xl px-5 py-6 font-sans text-[12px] leading-relaxed text-navy/75">
          This browser doesn't provide the Web Crypto API, so documents can't be
          encrypted here. Rather than store passport details in plain text, this
          screen is disabled.
        </p>
      </Shell>
    )
  }

  if (!key) {
    return (
      <Shell onClose={onClose}>
        <Gate
          existing={existing}
          busy={busy}
          error={error}
          onSubmit={async (passphrase, confirm) => {
            setError(null)
            if (!existing) {
              if (passphrase.length < MIN_PASSPHRASE) {
                return setError(
                  `Use at least ${MIN_PASSPHRASE} characters — this is the only thing protecting your passport details.`
                )
              }
              if (passphrase !== confirm) return setError("The two passphrases don't match.")
            }

            setBusy(true)
            try {
              const k = existing
                ? await unlockVault(passphrase)
                : await createVault(passphrase)
              if (!k) return setError('That passphrase is wrong.')
              setKey(k)
              setDocs(await readDocs(k))
            } catch {
              setError('Could not open the vault.')
            } finally {
              setBusy(false)
            }
          }}
        />
      </Shell>
    )
  }

  return (
    <Shell onClose={onClose} onLock={lock}>
      {docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gold/30 px-5 py-10 text-center font-sans text-[11px] text-cream/70">
          Nothing stored yet. Passport, insurance, emergency contacts — all
          encrypted on this device.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {docs.map((d) => (
            <div key={d.id} className="card-paper texture-paper rounded-lg px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="truncate font-display text-lg text-emerald-deep">
                  {d.label || 'Untitled'}
                </h3>
                <span className="shrink-0 font-sans text-[9px] tracking-stamp text-emerald uppercase">
                  {DOC_TYPES.find(([t]) => t === d.type)?.[1] ?? d.type}
                </span>
              </div>

              <div className="mt-2 flex flex-col gap-1.5">
                {(d.fields ?? [])
                  .filter((f) => f.name || f.value)
                  .map((f, i) => {
                    const id = `${d.id}:${i}`
                    const show = revealed[id]
                    return (
                      <div key={i} className="flex items-baseline justify-between gap-3">
                        <span className="font-sans text-[11px] text-navy/75">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setRevealed((r) => ({ ...r, [id]: !r[id] }))}
                          className="text-right font-sans text-[13px] text-navy-deep"
                          aria-label={show ? `Hide ${f.name}` : `Reveal ${f.name}`}
                        >
                          {show ? f.value : '•'.repeat(Math.min(12, (f.value || '').length || 6))}
                        </button>
                      </div>
                    )
                  })}
              </div>

              {d.notes && (
                <p className="mt-2 font-sans text-[11px] leading-relaxed text-navy/75">
                  {d.notes}
                </p>
              )}

              <button
                onClick={() => setEditing(d)}
                className="mt-3 font-sans text-[9px] tracking-stamp text-emerald uppercase"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setEditing(emptyDoc())}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-gold/40 py-3.5 font-sans text-[10px] tracking-stamp text-gold-light uppercase"
      >
        <Plus className="h-4 w-4" />
        Add document
      </button>

      <p className="mt-5 text-center font-sans text-[10px] leading-relaxed text-cream/60">
        Encrypted with AES-GCM on this device only — never synced. If you forget
        the passphrase there is no way to recover these.
      </p>

      <AnimatePresence>
        {editing && (
          <DocSheet
            doc={editing}
            onSave={(d) =>
              save(docs.some((x) => x.id === d.id)
                ? docs.map((x) => (x.id === d.id ? d : x))
                : [...docs, d])
            }
            onDelete={(d) => save(docs.filter((x) => x.id !== d.id))}
            onClose={() => setEditing(null)}
          />
        )}
      </AnimatePresence>
    </Shell>
  )
}

function Shell({ children, onClose, onLock }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="mx-auto w-full max-w-[520px] px-5 pb-24 safe-t"
    >
      <header className="flex items-center justify-between py-3">
        <button onClick={onClose} aria-label="Back" className="-ml-2 flex h-10 w-10 items-center justify-center text-cream/70">
          <Back className="h-5 w-5" />
        </button>
        <h1 className="foil font-display text-xl">Travel Docs</h1>
        {onLock ? (
          <button onClick={onLock} aria-label="Lock" className="-mr-2 flex h-10 w-10 items-center justify-center text-cream/70">
            <Lock className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>
      {children}
    </motion.div>
  )
}

function Gate({ existing, busy, error, onSubmit }) {
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(pass, confirm)
      }}
      className="card-paper texture-paper rounded-xl px-5 py-6"
    >
      <div className="text-center">
        <Lock className="mx-auto h-6 w-6 text-gold/70" />
        <h2 className="mt-3 font-display text-2xl text-emerald-deep">
          {existing ? 'Unlock your documents' : 'Set a passphrase'}
        </h2>
        <p className="mt-2 font-sans text-[11px] leading-relaxed text-navy/75">
          {existing
            ? 'This is separate from your app PIN.'
            : `Separate from your 4-digit PIN — a 4-digit code is too short to protect a passport number. Use at least ${MIN_PASSPHRASE} characters you won't forget.`}
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Field label="Passphrase">
          <input
            autoFocus
            type="password"
            autoComplete={existing ? 'current-password' : 'new-password'}
            className={inputClass}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </Field>

        {!existing && (
          <Field label="Confirm passphrase">
            <input
              type="password"
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
        )}

        {error && (
          <p className="font-sans text-[11px] leading-relaxed text-burgundy">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy || !pass}
          className="flex items-center justify-center gap-2 rounded-md bg-emerald-deep py-3.5 font-sans text-[10px] tracking-stamp text-gold-light uppercase disabled:opacity-35"
        >
          {busy && <Compass className="animate-compass h-4 w-4" />}
          {busy ? 'Deriving key…' : existing ? 'Unlock' : 'Create vault'}
        </button>

        {!existing && (
          <p className="font-sans text-[10px] leading-relaxed text-navy/75">
            There is no password reset. If you forget this, the documents cannot
            be recovered by anyone — including me.
          </p>
        )}
      </div>
    </form>
  )
}

function DocSheet({ doc, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(doc)
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const setField = (i, patch) =>
    set({ fields: draft.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) })

  return (
    <Sheet title={draft.label ? 'Edit Document' : 'Add Document'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.label.trim()) onSave(draft)
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Label">
          <input
            autoFocus
            className={`${inputClass} font-display text-xl`}
            value={draft.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="My passport"
          />
        </Field>

        <Field label="Type">
          <select
            className={inputClass}
            value={draft.type}
            onChange={(e) => set({ type: e.target.value })}
          >
            {DOC_TYPES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>

        <Field label="Details">
          <div className="flex flex-col gap-2">
            {draft.fields.map((f, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={`${inputClass} flex-1`}
                  value={f.name}
                  onChange={(e) => setField(i, { name: e.target.value })}
                  placeholder="Number"
                />
                <input
                  className={`${inputClass} flex-1`}
                  value={f.value}
                  onChange={(e) => setField(i, { value: e.target.value })}
                  placeholder="…"
                />
                <button
                  type="button"
                  aria-label="Remove field"
                  onClick={() => set({ fields: draft.fields.filter((_, j) => j !== i) })}
                  className="shrink-0 px-1 text-burgundy/70"
                >
                  <Trash className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ fields: [...draft.fields, { name: '', value: '' }] })}
              className="self-start font-sans text-[9px] tracking-stamp text-emerald uppercase"
            >
              + Add field
            </button>
          </div>
        </Field>

        <Field label="Notes">
          <textarea
            rows={3}
            className={`${inputClass} resize-none leading-relaxed`}
            value={draft.notes}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>

        <SubmitRow
          label="Save"
          disabled={!draft.label.trim()}
          onDelete={doc.label ? () => onDelete(draft) : null}
        />
      </form>
    </Sheet>
  )
}
