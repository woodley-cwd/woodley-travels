import { read, write } from './store'
import { computeStats } from './trips'

/* Badges are derived from the data, never stored as state — so they can't drift
   out of sync with the trips that earned them. The only thing persisted is the
   date each one was first seen as earned, which is what makes "date earned"
   meaningful and lets us celebrate exactly once. */

const EARNED_KEY = 'wt.badges.v1'
// Marks that badges have been evaluated at least once on this device.
const INIT_KEY = 'wt.badges.init.v1'

export const BADGES = [
  { id: 'first-stamp',  name: 'First Stamp',      hint: 'Complete your first trip',        test: (d) => d.trips >= 1 },
  { id: 'five-trips',   name: 'Seasoned',         hint: 'Five trips stamped',              test: (d) => d.trips >= 5 },
  { id: 'ten-trips',    name: 'Well Travelled',   hint: 'Ten trips stamped',               test: (d) => d.trips >= 10 },
  { id: 'twentyfive',   name: 'Collector',        hint: 'Twenty-five trips stamped',       test: (d) => d.trips >= 25 },

  { id: 'first-state',  name: 'Homeland',         hint: 'Visit your first state',          test: (d) => d.states >= 1 },
  { id: 'five-states',  name: 'Roadtripper',      hint: 'Five states visited',             test: (d) => d.states >= 5 },
  { id: 'ten-states',   name: 'Coast to Coast',   hint: 'Ten states visited',              test: (d) => d.states >= 10 },
  { id: 'all-states',   name: 'Fifty Stars',      hint: 'All fifty states',                test: (d) => d.states >= 50 },

  { id: 'first-abroad', name: 'Passport Opened',  hint: 'Your first country abroad',       test: (d) => d.countries >= 1 },
  { id: 'five-abroad',  name: 'Globetrotter',     hint: 'Five countries visited',          test: (d) => d.countries >= 5 },
  { id: 'ten-abroad',   name: 'Old Hand',         hint: 'Ten countries visited',           test: (d) => d.countries >= 10 },

  { id: 'thirty-nights', name: 'Month Away',      hint: 'Thirty nights on the road',       test: (d) => d.nights >= 30 },
  { id: 'hundred-nights', name: 'Hundred Nights', hint: 'One hundred nights away',         test: (d) => d.nights >= 100 },

  { id: 'ten-dishes',   name: 'Well Fed',         hint: 'Log ten dishes',                  test: (d) => d.food >= 10 },
  { id: 'five-cards',   name: 'Wish You Were Here', hint: 'Five postcards kept',           test: (d) => d.postcards >= 5 },
  { id: 'companion',    name: 'Better Together',  hint: 'Travel with someone',             test: (d) => d.withSomeone >= 1 },
]

function metrics(trips, entries) {
  const stats = computeStats(trips)
  const completedIds = new Set(
    trips.filter((t) => t.status === 'completed').map((t) => t.id)
  )
  return {
    trips: stats.trips,
    states: stats.states,
    countries: stats.countries,
    nights: stats.nights,
    food: (entries.food ?? []).filter((f) => completedIds.has(f.trip_id)).length,
    postcards: (entries.postcards ?? []).filter((p) => completedIds.has(p.trip_id)).length,
    withSomeone: trips.filter(
      (t) => t.status === 'completed' && (t.traveled_with ?? '').trim()
    ).length,
  }
}

const loadEarned = () => read(EARNED_KEY, {})

/* Returns every badge with its earned state, plus the ids earned *this* call —
   the caller uses those to fire the celebration. */
export function evaluateBadges(trips, entries) {
  const data = metrics(trips, entries)
  const earned = loadEarned()
  const now = new Date().toISOString()
  const freshlyEarned = []

  /* A passport that already has trips when badges first appear shouldn't fire
     a dozen celebrations at once — that first pass backfills silently. Every
     evaluation after it celebrates properly, including badges crossed while
     the app was closed. */
  const firstEverRun = !read(INIT_KEY, false)

  const list = BADGES.map((badge) => {
    const has = badge.test(data)
    if (has && !earned[badge.id]) {
      earned[badge.id] = now
      freshlyEarned.push(badge)
    }
    // Losing the qualifying data (a deleted trip) revokes the badge, so the
    // shelf always reflects reality.
    if (!has && earned[badge.id]) delete earned[badge.id]

    return { ...badge, earned: has, earnedAt: has ? earned[badge.id] : null }
  })

  write(EARNED_KEY, earned)
  write(INIT_KEY, true)
  return { badges: list, freshlyEarned: firstEverRun ? [] : freshlyEarned }
}
