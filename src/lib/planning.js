import { createStore } from './store'

/* Phase 4 planning tools. Cards, wishlist and templates are standalone;
   checklist items belong to a trip. */

export const cards = createStore({
  table: 'travel_cards',
  cacheKey: 'wt.cards.v1',
  columns: ['id', 'name', 'program', 'kind', 'points', 'notes', 'created_at', 'updated_at'],
  sort: (a, b) => (a.name || '').localeCompare(b.name || ''),
})

export const wishlist = createStore({
  table: 'travel_wishlist',
  cacheKey: 'wt.wishlist.v1',
  columns: [
    'id', 'destination', 'scope', 'region_code', 'notes', 'created_at', 'updated_at',
  ],
})

export const templates = createStore({
  table: 'travel_packing_templates',
  cacheKey: 'wt.templates.v1',
  columns: ['id', 'name', 'trip_type', 'items', 'created_at', 'updated_at'],
  sort: (a, b) => (a.name || '').localeCompare(b.name || ''),
})

export const checklist = createStore({
  table: 'travel_checklist',
  cacheKey: 'wt.checklist.v1',
  columns: [
    'id', 'trip_id', 'label', 'category', 'done', 'sort', 'created_at', 'updated_at',
  ],
  sort: (a, b) => (a.sort ?? 0) - (b.sort ?? 0),
})

export const PLANNING_STORES = { cards, wishlist, templates, checklist }

const stamp = () => ({
  id: crypto.randomUUID(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

export const emptyCard = () => ({
  ...stamp(),
  name: '',
  program: '',
  kind: 'airline',
  points: '',
  notes: '',
})

export const emptyWish = () => ({
  ...stamp(),
  destination: '',
  scope: 'international',
  region_code: '',
  notes: '',
})

export const emptyTemplate = () => ({
  ...stamp(),
  name: '',
  trip_type: 'city',
  items: [],
})

export const emptyChecklistItem = (trip_id, category = 'packing', sort = 0) => ({
  ...stamp(),
  trip_id,
  label: '',
  category,
  done: false,
  sort,
})

export const TRIP_TYPES = [
  ['beach', 'Beach'],
  ['city', 'City'],
  ['cruise', 'Cruise'],
  ['outdoors', 'Outdoors'],
  ['ski', 'Ski'],
  ['business', 'Business'],
]

export const CARD_KINDS = [
  ['airline', 'Airline'],
  ['hotel', 'Hotel'],
  ['other', 'Other'],
]

/* Checklist progress for a trip, split so the Up Next card can say
   "booked" and "packed" separately rather than one meaningless number. */
export function checklistProgress(items) {
  const count = (cat) => {
    const set = items.filter((i) => i.category === cat)
    return { done: set.filter((i) => i.done).length, total: set.length }
  }
  return {
    booking: count('booking'),
    packing: count('packing'),
    all: { done: items.filter((i) => i.done).length, total: items.length },
  }
}

export const formatPoints = (n) => {
  const v = Number(n)
  return Number.isFinite(v) ? v.toLocaleString('en-US') : '0'
}
