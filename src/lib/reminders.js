import { read, write } from './store'
import { daysUntil } from './trips'
import { checklistProgress } from './planning'

/* Trip reminders.

   IMPORTANT LIMITATION: a PWA cannot wake itself up. Genuine scheduled push —
   a notification that arrives while the app is closed — requires a server
   holding Web Push subscriptions, which this app deliberately doesn't have.
   On iOS the restrictions are tighter still.

   So reminders are computed on open: the app works out what's due, shows it
   in-app (which always works), and additionally raises a system notification
   if permission was granted. Each reminder fires at most once per day. */

const PREFS_KEY = 'wt.reminders.prefs.v1'
const SENT_KEY = 'wt.reminders.sent.v1'

export const defaultPrefs = { enabled: false, leadDays: 7 }

export const loadPrefs = () => ({ ...defaultPrefs, ...read(PREFS_KEY, {}) })
export const savePrefs = (prefs) => write(PREFS_KEY, prefs)

export const notificationSupport = () =>
  typeof window !== 'undefined' && 'Notification' in window

export async function requestNotificationPermission() {
  if (!notificationSupport()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/* What needs attention right now. Pure — no side effects — so the same list
   drives both the in-app banner and the system notification. */
export function dueReminders(trips, checklistItems, prefs = loadPrefs()) {
  const out = []

  for (const trip of trips) {
    if (trip.status !== 'planning' || !trip.start_date) continue

    const days = daysUntil(trip.start_date)
    if (days === null || days < 0 || days > prefs.leadDays) continue

    const items = checklistItems.filter((i) => i.trip_id === trip.id)
    const progress = checklistProgress(items)

    if (progress.all.total === 0) {
      out.push({
        id: `${trip.id}:empty`,
        trip,
        days,
        title: `${trip.name} in ${days} ${days === 1 ? 'day' : 'days'}`,
        body: 'Nothing on the checklist yet.',
      })
      continue
    }

    const remaining = progress.all.total - progress.all.done
    if (remaining > 0) {
      out.push({
        id: `${trip.id}:open-${remaining}`,
        trip,
        days,
        title:
          days === 0
            ? `${trip.name} — today`
            : `${trip.name} in ${days} ${days === 1 ? 'day' : 'days'}`,
        body: `${remaining} thing${remaining === 1 ? '' : 's'} still to do.`,
      })
    }
  }

  return out.sort((a, b) => a.days - b.days)
}

const today = () => new Date().toISOString().slice(0, 10)

/* Raise system notifications for anything not yet shown today. Safe to call on
   every open — the per-day ledger keeps it from nagging. */
export function notifyDue(reminders, prefs = loadPrefs()) {
  if (!prefs.enabled || !notificationSupport()) return 0
  if (Notification.permission !== 'granted') return 0

  const sent = read(SENT_KEY, {})
  const day = today()
  let fired = 0

  for (const r of reminders) {
    if (sent[r.id] === day) continue
    try {
      new Notification(r.title, { body: r.body, tag: r.id, icon: '/favicon.svg' })
      sent[r.id] = day
      fired += 1
    } catch {
      // Some platforms reject construction outside a service worker; the
      // in-app banner still covers it.
    }
  }

  // Drop ledger entries from previous days so it can't grow forever.
  write(
    SENT_KEY,
    Object.fromEntries(Object.entries(sent).filter(([, d]) => d === day))
  )
  return fired
}
