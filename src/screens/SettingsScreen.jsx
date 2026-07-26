import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  loadPrefs, savePrefs, requestNotificationPermission, notificationSupport,
} from '../lib/reminders'
import { downloadBackup, parseBackup, restoreBackup, summarize } from '../lib/backup'
import { setPin, hasCustomPin } from '../lib/pin'
import { Back, Bell, Lock, Compass, Wallet } from '../components/Icons'
import { Field, inputClass, EASE } from '../components/Form'

function Section({ icon: Icon, title, children }) {
  return (
    <section className="card-paper texture-paper mt-4 rounded-xl px-5 py-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold/70" />
        <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
          {title}
        </span>
      </div>
      {children}
    </section>
  )
}

const Note = ({ children }) => (
  <p className="mt-2 font-sans text-[11px] leading-relaxed text-navy/75">{children}</p>
)

export default function SettingsScreen({ onClose, onOpenDocs }) {
  const [prefs, setPrefs] = useState(loadPrefs)
  const [permission, setPermission] = useState(
    notificationSupport() ? Notification.permission : 'unsupported'
  )

  const [status, setStatus] = useState(null) // { kind, message }
  const [pending, setPending] = useState(null) // parsed backup awaiting confirm
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')

  const update = (patch) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    savePrefs(next)
  }

  const toggle = async () => {
    if (prefs.enabled) return update({ enabled: false })
    setPermission(await requestNotificationPermission())
    update({ enabled: true })
  }

  const onExport = async () => {
    setBusy(true)
    setStatus(null)
    try {
      const backup = await downloadBackup()
      const s = summarize(backup)
      setStatus({
        kind: 'ok',
        message: `Saved ${s.trips} trips, ${s.food} food entries, ${s.postcards} postcards, ${s.localImages} device-only photos${s.hasVault ? ', and your encrypted docs' : ''}.`,
      })
    } catch {
      setStatus({ kind: 'error', message: "Couldn't build the backup." })
    } finally {
      setBusy(false)
    }
  }

  const onPickFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setStatus(null)
    try {
      setPending(parseBackup(await file.text()))
    } catch (err) {
      setStatus({ kind: 'error', message: err.message })
    }
  }

  const confirmRestore = async () => {
    setBusy(true)
    try {
      await restoreBackup(pending)
      // A reload is the honest way to get every screen onto the restored data
      // — patching a dozen caches in place would leave stale state around.
      window.location.reload()
    } catch {
      setStatus({ kind: 'error', message: 'Restore failed. Nothing was changed.' })
      setBusy(false)
      setPending(null)
    }
  }

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin1)) {
      return setStatus({ kind: 'error', message: 'The PIN must be 4 digits.' })
    }
    if (pin1 !== pin2) {
      return setStatus({ kind: 'error', message: "The two PINs don't match." })
    }
    await setPin(pin1)
    setPin1('')
    setPin2('')
    setStatus({ kind: 'ok', message: 'PIN updated. It takes effect next time you open the app.' })
  }

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
        <h1 className="foil font-display text-xl">Settings</h1>
        <div className="w-10" />
      </header>

      {status && (
        <p
          className={`rounded-lg px-4 py-3 font-sans text-[12px] leading-relaxed ${
            status.kind === 'error'
              ? 'border border-burgundy/50 bg-burgundy/20 text-cream'
              : 'border border-gold/35 bg-gold/10 text-cream'
          }`}
        >
          {status.message}
        </p>
      )}

      {/* Travel docs */}
      <Section icon={Lock} title="Travel documents">
        <Note>
          Passport, insurance, and emergency contacts, encrypted with AES-GCM
          behind a passphrase separate from your PIN. Stored on this device
          only — never synced.
        </Note>
        <button
          onClick={onOpenDocs}
          className="mt-4 w-full rounded-md bg-emerald-deep py-3.5 font-sans text-[10px] tracking-stamp text-gold-light uppercase"
        >
          Open travel docs
        </button>
      </Section>

      {/* Backup */}
      <Section icon={Wallet} title="Backup">
        <Note>
          One JSON file with every trip, entry, and list, plus photos that exist
          only on this phone. Your encrypted documents ride along as ciphertext —
          still useless without the passphrase.
        </Note>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={onExport}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-md bg-emerald-deep py-3.5 font-sans text-[10px] tracking-stamp text-gold-light uppercase disabled:opacity-40"
          >
            {busy && <Compass className="animate-compass h-4 w-4" />}
            Export a backup
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="rounded-md border border-emerald/25 py-3 font-sans text-[10px] tracking-stamp text-emerald uppercase disabled:opacity-40"
          >
            Restore from a file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onPickFile}
            className="hidden"
          />
        </div>
      </Section>

      {/* PIN */}
      <Section icon={Lock} title="App PIN">
        <Note>
          {hasCustomPin()
            ? 'You’ve set your own PIN on this device.'
            : 'Currently using the PIN this app was built with. Setting one here overrides it.'}{' '}
          A 4-digit PIN keeps casual eyes out; it isn’t real security. That’s
          what the documents passphrase is for.
        </Note>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Field label="New PIN">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className={inputClass}
              value={pin1}
              onChange={(e) => setPin1(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
          <Field label="Confirm">
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className={inputClass}
              value={pin2}
              onChange={(e) => setPin2(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>
        <button
          onClick={savePin}
          disabled={!pin1 || !pin2}
          className="mt-3 w-full rounded-md border border-emerald/25 py-3 font-sans text-[10px] tracking-stamp text-emerald uppercase disabled:opacity-35"
        >
          Update PIN
        </button>
      </Section>

      {/* Reminders */}
      <Section icon={Bell} title="Trip reminders">
        <button
          type="button"
          onClick={toggle}
          role="switch"
          aria-checked={prefs.enabled}
          className="mt-4 flex w-full items-center justify-between"
        >
          <span className="font-sans text-[14px] text-navy-deep">
            Remind me before a trip
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              prefs.enabled ? 'bg-emerald' : 'bg-emerald/20'
            }`}
          >
            <motion.span
              className="absolute top-0.5 h-5 w-5 rounded-full bg-cream shadow"
              animate={{ left: prefs.enabled ? 22 : 2 }}
              transition={{ duration: 0.25, ease: EASE }}
            />
          </span>
        </button>

        <div className="mt-5">
          <Field label="How far ahead">
            <select
              className={inputClass}
              value={prefs.leadDays}
              onChange={(e) => update({ leadDays: Number(e.target.value) })}
            >
              {[1, 3, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} {d === 1 ? 'day' : 'days'} before
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-5 border-t border-emerald/10 pt-4">
          <Note>
            Reminders appear on the passport page whenever you open the app —
            that part always works, online or off.
          </Note>
          <Note>
            System notifications need a server that can wake the app while it's
            closed, which this app doesn't have. So a notification only appears
            when you open it and something is due. On iPhone, notifications also
            require installing the app to your home screen first.
          </Note>
          {permission === 'denied' && (
            <p className="mt-3 font-sans text-[11px] leading-relaxed text-burgundy">
              Notifications are blocked in your browser settings. In-app
              reminders still work.
            </p>
          )}
        </div>
      </Section>

      {/* Restore confirmation — destructive, so it gets its own gate */}
      <AnimatePresence>
        {pending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-deep/85 px-8 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              className="card-paper texture-paper w-full max-w-[340px] rounded-xl px-6 py-7"
            >
              <h2 className="text-center font-display text-2xl text-emerald-deep">
                Replace everything?
              </h2>
              {(() => {
                const s = summarize(pending)
                return (
                  <p className="mt-3 font-sans text-[12px] leading-relaxed text-navy/75">
                    This backup is from{' '}
                    {new Date(s.exported_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    and holds {s.trips} trips, {s.food} food entries,{' '}
                    {s.postcards} postcards, and {s.localImages} device-only
                    photos.
                    <br />
                    <br />
                    Restoring <strong>erases everything currently on this
                    device</strong> and replaces it with the file. Export first
                    if you're not sure.
                  </p>
                )
              })()}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={confirmRestore}
                  disabled={busy}
                  className="rounded-md bg-burgundy py-3 font-sans text-[10px] tracking-stamp text-cream uppercase disabled:opacity-50"
                >
                  {busy ? 'Restoring…' : 'Replace my data'}
                </button>
                <button
                  onClick={() => setPending(null)}
                  className="py-2 font-sans text-[10px] tracking-stamp text-navy/75 uppercase"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
