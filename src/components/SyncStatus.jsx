import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { read, SYNC_ERROR_KEY } from '../lib/store'

/* Offline / pending-sync indicator.

   The app has always worked offline, but silently — there was no way to tell
   whether a change had reached the server. This surfaces both facts: whether
   you're offline, and how many writes are still queued. It stays out of the
   way when everything is synced. */

const QUEUE_KEY = 'wt.queue.v2'
const MEDIA_KEY = 'wt.media.pending.v1'

const pendingCount = () =>
  read(QUEUE_KEY, []).length + read(MEDIA_KEY, []).length

export default function SyncStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  const [pending, setPending] = useState(pendingCount)
  const [error, setError] = useState(() => localStorage.getItem(SYNC_ERROR_KEY))

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)

    // localStorage has no change event for same-tab writes, so poll. Cheap:
    // two JSON.parse calls on small arrays.
    const timer = setInterval(() => {
      setPending(pendingCount())
      setError(localStorage.getItem(SYNC_ERROR_KEY))
    }, 2000)

    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      clearInterval(timer)
    }
  }, [])

  const show = !online || pending > 0
  const label = !online
    ? pending > 0
      ? `Offline · ${pending} waiting to sync`
      : 'Offline · changes saved here'
    : error
      ? `${pending} change${pending === 1 ? '' : 's'} can't sync`
      : `Syncing ${pending} change${pending === 1 ? '' : 's'}…`

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center"
          style={{ top: 'max(0.5rem, env(safe-area-inset-top))' }}
          role="status"
          aria-live="polite"
        >
          <span
            className={`flex flex-col items-center rounded-full border px-3.5 py-1.5 font-sans text-[9px] tracking-stamp uppercase backdrop-blur-md ${
              online && !error
                ? 'border-gold/40 bg-emerald-deep/90 text-gold-light'
                : 'border-burgundy/60 bg-burgundy/40 text-cream'
            }`}
          >
            {label}
            {online && error && (
              <span className="mt-0.5 max-w-[260px] truncate normal-case tracking-normal text-cream/80">
                {error}
              </span>
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
