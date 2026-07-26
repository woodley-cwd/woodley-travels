import { createStore, flushQueue } from './store'

export { flushQueue }

const TRIP_COLUMNS = [
  'id', 'name', 'destination', 'scope', 'region_code', 'country', 'status',
  'start_date', 'end_date', 'traveled_with', 'cover_photo', 'journal_note',
  'created_at', 'updated_at',
]

// Newest first — the passport reads most-recent-stamp down.
const byDateDesc = (a, b) =>
  (b.start_date || b.created_at || '').localeCompare(
    a.start_date || a.created_at || ''
  )

const store = createStore({
  table: 'travel_trips',
  cacheKey: 'wt.trips.v1',
  columns: TRIP_COLUMNS,
  sort: byDateDesc,
})

export const loadCache = store.loadCache
export const fetchTrips = store.fetchAll
export const saveTrip = store.save
export const deleteTrip = store.remove

export const emptyTrip = () => ({
  id: crypto.randomUUID(),
  name: '',
  destination: '',
  scope: 'domestic',
  region_code: '',
  country: '',
  status: 'planning',
  start_date: '',
  end_date: '',
  traveled_with: '',
  cover_photo: '',
  journal_note: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

/* — Stats ——————————————————————————————————————
   Only completed trips count toward the passport totals; a planned trip
   hasn't been stamped yet. */

export function computeStats(trips) {
  const completed = trips.filter((t) => t.status === 'completed')

  const states = new Set(
    completed.filter((t) => t.scope === 'domestic' && t.region_code).map((t) => t.region_code)
  )
  const countries = new Set(
    completed
      .filter((t) => t.scope === 'international' && t.region_code)
      .map((t) => t.region_code)
  )

  const nights = completed.reduce((sum, t) => sum + tripNights(t), 0)

  const upcoming = trips
    .filter((t) => t.status === 'planning' && t.start_date)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))

  return {
    states: states.size,
    countries: countries.size,
    trips: completed.length,
    nights,
    recent: completed.slice(0, 4),
    upNext: upcoming[0] ?? null,
  }
}

export function tripNights(trip) {
  if (!trip?.start_date || !trip?.end_date) return 0
  const days = Math.round(
    (new Date(trip.end_date) - new Date(trip.start_date)) / 86_400_000
  )
  return Math.max(0, days)
}

/* On this day: a completed trip that was underway on today's month and day in
   an earlier year. Compared as month/day rather than by elapsed time so it
   surfaces on the anniversary regardless of leap years. */
export function onThisDay(trips, today = new Date()) {
  const mmdd = (d) => (d.getMonth() + 1) * 100 + d.getDate()
  const target = mmdd(today)
  const thisYear = today.getFullYear()

  const hits = []
  for (const trip of trips) {
    if (trip.status !== 'completed' || !trip.start_date) continue

    const start = new Date(`${trip.start_date}T00:00:00`)
    const end = new Date(`${trip.end_date || trip.start_date}T00:00:00`)
    if (start.getFullYear() >= thisYear) continue

    // Walk the trip's days — trips are short, and this handles a range that
    // crosses into January without any date arithmetic edge cases.
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (mmdd(d) === target) {
        hits.push({ trip, yearsAgo: thisYear - start.getFullYear() })
        break
      }
    }
  }
  return hits.sort((a, b) => a.yearsAgo - b.yearsAgo)
}

export function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(`${date}T00:00:00`) - today) / 86_400_000)
}

export function formatRange(start, end) {
  if (!start) return 'Dates to come'
  const opts = { month: 'short', day: 'numeric' }
  const s = new Date(`${start}T00:00:00`)
  const from = s.toLocaleDateString('en-US', opts)
  if (!end) return `${from}, ${s.getFullYear()}`

  const e = new Date(`${end}T00:00:00`)
  const to = e.toLocaleDateString('en-US', opts)
  return s.getFullYear() === e.getFullYear()
    ? `${from} – ${to}, ${e.getFullYear()}`
    : `${from}, ${s.getFullYear()} – ${to}, ${e.getFullYear()}`
}
