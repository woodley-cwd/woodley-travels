import { createStore } from './store'

/* The four kinds of trip content. All of them belong to a trip — the spec is
   explicit that food and postcards have no standalone entries. */

export const hotels = createStore({
  table: 'travel_hotels',
  cacheKey: 'wt.hotels.v1',
  columns: [
    'id', 'trip_id', 'name', 'check_in', 'check_out', 'cost_usd', 'cost_local',
    'currency', 'confirmation', 'notes', 'created_at', 'updated_at',
  ],
  sort: (a, b) => (a.check_in || '').localeCompare(b.check_in || ''),
  emptyAsNull: ['check_in', 'check_out', 'cost_usd', 'cost_local'],
})

/* Times are a date plus a plain clock string, never a timestamp: a flight's
   times belong to each airport's own zone, and a real timestamp would re-render
   in the reader's zone and quote the wrong boarding time. */
export const flights = createStore({
  table: 'travel_flights',
  cacheKey: 'wt.flights.v1',
  columns: [
    'id', 'trip_id', 'airline', 'flight_number', 'origin', 'destination',
    'depart_date', 'depart_time', 'arrive_date', 'arrive_time', 'seat',
    'confirmation', 'cost_usd', 'cost_local', 'currency', 'notes',
    'created_at', 'updated_at',
  ],
  sort: (a, b) =>
    `${a.depart_date || ''}${a.depart_time || ''}`.localeCompare(
      `${b.depart_date || ''}${b.depart_time || ''}`
    ),
  emptyAsNull: ['depart_date', 'arrive_date', 'cost_usd', 'cost_local'],
})

/* Undated items sort last: they're the "sometime while we're there" list, and
   burying the scheduled days under them would defeat the point. */
export const itinerary = createStore({
  table: 'travel_itinerary',
  cacheKey: 'wt.itinerary.v1',
  columns: [
    'id', 'trip_id', 'title', 'day', 'at_time', 'location', 'notes', 'done',
    'sort', 'created_at', 'updated_at',
  ],
  sort: (a, b) =>
    `${a.day || '9999'}${a.at_time || '99:99'}${String(a.sort ?? 0).padStart(4, '0')}`
      .localeCompare(
        `${b.day || '9999'}${b.at_time || '99:99'}${String(b.sort ?? 0).padStart(4, '0')}`
      ),
  emptyAsNull: ['day'],
})

export const food = createStore({
  table: 'travel_food',
  cacheKey: 'wt.food.v1',
  columns: [
    'id', 'trip_id', 'photo_url', 'dish', 'restaurant', 'city', 'cuisine',
    'cost_usd', 'cost_local', 'currency', 'again', 'notes',
    'created_at', 'updated_at',
  ],
  emptyAsNull: ['cost_usd', 'cost_local'],
})

export const postcards = createStore({
  table: 'travel_postcards',
  cacheKey: 'wt.postcards.v1',
  columns: [
    'id', 'trip_id', 'front_url', 'back_url', 'back_note', 'location',
    'created_at', 'updated_at',
  ],
})

export const photos = createStore({
  table: 'travel_photos',
  cacheKey: 'wt.photos.v1',
  columns: ['id', 'trip_id', 'url', 'caption', 'created_at', 'updated_at'],
})

export const STORES = { flights, hotels, itinerary, food, postcards, photos }

const stamp = (trip_id) => ({
  id: crypto.randomUUID(),
  trip_id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const emptyFlight = (trip_id) => ({
  ...stamp(trip_id),
  airline: '',
  flight_number: '',
  origin: '',
  destination: '',
  depart_date: '',
  depart_time: '',
  arrive_date: '',
  arrive_time: '',
  seat: '',
  confirmation: '',
  cost_usd: '',
  cost_local: '',
  currency: '',
  notes: '',
})

export const emptyItineraryItem = (trip_id, sort = 0) => ({
  ...stamp(trip_id),
  title: '',
  day: '',
  at_time: '',
  location: '',
  notes: '',
  done: false,
  sort,
})

export const emptyHotel = (trip_id) => ({
  ...stamp(trip_id),
  name: '',
  check_in: '',
  check_out: '',
  cost_usd: '',
  cost_local: '',
  currency: '',
  confirmation: '',
  notes: '',
})

export const emptyFood = (trip_id) => ({
  ...stamp(trip_id),
  photo_url: '',
  dish: '',
  restaurant: '',
  city: '',
  cuisine: '',
  cost_usd: '',
  cost_local: '',
  currency: '',
  again: false,
  notes: '',
})

export const emptyPostcard = (trip_id) => ({
  ...stamp(trip_id),
  front_url: '',
  back_url: '',
  back_note: '',
  location: '',
})

export const emptyPhoto = (trip_id) => ({
  ...stamp(trip_id),
  url: '',
  caption: '',
})

export const forTrip = (list, tripId) => list.filter((e) => e.trip_id === tripId)

/* Itinerary grouped into day headings. The store already sorts undated items
   last, so preserving encounter order is enough — no second sort here. */
export function byDay(items) {
  const groups = []
  for (const item of items) {
    const key = item.day || ''
    const group = groups.find((g) => g.day === key)
    if (group) group.items.push(item)
    else groups.push({ day: key, items: [item] })
  }
  return groups
}

export const itineraryProgress = (items) => ({
  done: items.filter((i) => i.done).length,
  total: items.length,
})

/* "Thu, Jul 16" — plus the trip-relative day number, which is how people
   actually talk about an itinerary ("day three we did the glacier"). */
export function dayHeading(day, tripStart) {
  if (!day) return { label: 'Any day', sub: '' }
  const d = new Date(`${day}T00:00:00`)
  const label = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  if (!tripStart) return { label, sub: '' }
  const n = Math.round((d - new Date(`${tripStart}T00:00:00`)) / 86_400_000) + 1
  return { label, sub: n >= 1 ? `Day ${n}` : '' }
}

/* — Cost totals ————————————————————————————————
   Auto-calculated from linked entries; the trip itself stores no totals, so
   they can never drift out of sync with the rows they summarise. */

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function tripTotals({ flights: fl = [], hotels: h = [], food: f = [] }) {
  const air = fl.reduce((s, x) => s + num(x.cost_usd), 0)
  const lodging = h.reduce((s, x) => s + num(x.cost_usd), 0)
  const dining = f.reduce((s, x) => s + num(x.cost_usd), 0)
  return { air, lodging, dining, total: air + lodging + dining }
}

export const money = (n) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  })
