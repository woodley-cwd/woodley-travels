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
})

export const food = createStore({
  table: 'travel_food',
  cacheKey: 'wt.food.v1',
  columns: [
    'id', 'trip_id', 'photo_url', 'dish', 'restaurant', 'city', 'cuisine',
    'cost_usd', 'cost_local', 'currency', 'again', 'notes',
    'created_at', 'updated_at',
  ],
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

export const STORES = { hotels, food, postcards, photos }

const stamp = (trip_id) => ({
  id: crypto.randomUUID(),
  trip_id,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
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

/* — Cost totals ————————————————————————————————
   Auto-calculated from linked entries; the trip itself stores no totals, so
   they can never drift out of sync with the rows they summarise. */

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function tripTotals({ hotels: h = [], food: f = [] }) {
  const lodging = h.reduce((s, x) => s + num(x.cost_usd), 0)
  const dining = f.reduce((s, x) => s + num(x.cost_usd), 0)
  return { lodging, dining, total: lodging + dining }
}

export const money = (n) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  })
