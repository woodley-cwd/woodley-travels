import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { forTrip, money } from '../lib/entries'
import { formatRange } from '../lib/trips'
import { regionName, flagEmoji } from '../lib/places'
import { fold } from '../lib/text'
import { toAtlasName } from '../lib/places'
import MediaImage from '../components/MediaImage'
import { EASE } from '../components/Form'
import { Fork, Mail, Camera, Heart, Globe } from '../components/Icons'

const TABS = [
  ['all', 'All'],
  ['trips', 'Trips'],
  ['food', 'Food'],
  ['postcards', 'Cards'],
]

const norm = fold

export default function SearchScreen({ trips, entries, onOpen }) {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState('all')
  const [againOnly, setAgainOnly] = useState(false)

  const tripById = useMemo(
    () => Object.fromEntries(trips.map((t) => [t.id, t])),
    [trips]
  )

  const results = useMemo(() => {
    const needle = norm(q).trim()
    const match = (...fields) =>
      !needle || fields.some((f) => norm(f).includes(needle))

    // The atlas spelling is searchable too, so "Turkey" finds Türkiye.
    const matchedTrips = trips.filter((t) => {
      const place = regionName(t.scope, t.region_code)
      return match(
        t.name,
        t.destination,
        place,
        toAtlasName(place),
        t.traveled_with,
        t.journal_note
      )
    })

    // Food and postcards inherit their trip's searchable text, so "Italy"
    // finds the dishes eaten there even though the dish never says Italy.
    const matchedFood = (entries.food ?? []).filter((f) => {
      const trip = tripById[f.trip_id]
      if (againOnly && !f.again) return false
      return match(f.dish, f.restaurant, f.city, f.cuisine, f.notes, trip?.name, regionName(trip?.scope, trip?.region_code))
    })

    const matchedCards = (entries.postcards ?? []).filter((p) => {
      const trip = tripById[p.trip_id]
      return match(p.location, p.back_note, trip?.name, regionName(trip?.scope, trip?.region_code))
    })

    return { trips: matchedTrips, food: matchedFood, postcards: matchedCards }
  }, [q, trips, entries, tripById, againOnly])

  const show = (kind) => tab === 'all' || tab === kind
  const total =
    (show('trips') ? results.trips.length : 0) +
    (show('food') ? results.food.length : 0) +
    (show('postcards') ? results.postcards.length : 0)

  const foodTotal = results.food.reduce((s, f) => s + (Number(f.cost_usd) || 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto w-full max-w-[560px] px-5 pb-28 safe-t"
    >
      <header className="pt-3 pb-5 text-center">
        <h1 className="foil font-display text-3xl leading-none">Everything</h1>
        <div className="rule-gold mx-auto mt-2.5 h-px w-24" />
      </header>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search trips, dishes, places…"
        className="w-full rounded-md border border-gold/25 bg-cream/10 px-4 py-3 font-sans text-[15px] text-cream outline-none placeholder:text-cream/45 focus:border-gold/60"
      />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 font-sans text-[10px] tracking-stamp uppercase transition-colors ${
              tab === id
                ? 'border-gold/60 bg-gold/20 text-gold-light'
                : 'border-gold/25 text-cream/70'
            }`}
          >
            {label}
          </button>
        ))}
        {show('food') && (
          <button
            onClick={() => setAgainOnly((v) => !v)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-sans text-[10px] tracking-stamp uppercase transition-colors ${
              againOnly
                ? 'border-burgundy bg-burgundy/40 text-cream'
                : 'border-gold/25 text-cream/70'
            }`}
          >
            <Heart className="h-3 w-3" />
            Again
          </button>
        )}
      </div>

      <p className="mt-4 font-sans text-[9px] tracking-stamp text-cream/70 uppercase">
        {total} {total === 1 ? 'result' : 'results'}
        {show('food') && results.food.length > 0 && ` · ${money(foodTotal)} eaten`}
      </p>

      {total === 0 && (
        <div className="mt-8 text-center">
          <Globe className="mx-auto h-7 w-7 text-gold/70" />
          <p className="mt-3 font-display text-xl text-cream/85">Nothing found</p>
          <p className="mt-1 font-sans text-[11px] text-cream/70">
            {q ? 'Try a different word.' : 'Add a trip to fill this up.'}
          </p>
        </div>
      )}

      {show('trips') && results.trips.length > 0 && (
        <Section label="Trips">
          <div className="flex flex-col gap-2.5">
            {results.trips.map((t) => (
              <button
                key={t.id}
                onClick={() => onOpen(t)}
                className="card-paper texture-paper w-full rounded-lg px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">
                    {t.scope === 'international' ? flagEmoji(t.region_code) || '🌍' : '🇺🇸'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-lg text-emerald-deep">{t.name}</h3>
                    <p className="truncate font-sans text-[10px] text-navy/75">
                      {[t.destination, regionName(t.scope, t.region_code)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="shrink-0 font-sans text-[10px] text-navy/75">
                    {formatRange(t.start_date, t.end_date)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Section>
      )}

      {show('food') && results.food.length > 0 && (
        <Section label="Food" icon={Fork}>
          <div className="grid grid-cols-2 gap-3">
            {results.food.map((f) => {
              const trip = tripById[f.trip_id]
              return (
                <button
                  key={f.id}
                  onClick={() => trip && onOpen(trip)}
                  className="card-paper texture-paper overflow-hidden rounded-lg text-left"
                >
                  <div className="relative">
                    <MediaImage src={f.photo_url} alt={f.dish} className="aspect-square w-full object-cover" />
                    {f.again && (
                      <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-burgundy/85">
                        <Heart className="h-3.5 w-3.5 text-cream" />
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5">
                    <h3 className="truncate font-display text-base leading-tight text-emerald-deep">{f.dish}</h3>
                    <p className="truncate font-sans text-[10px] text-navy/75">
                      {[f.restaurant, f.cuisine].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {trip && (
                      <p className="mt-0.5 truncate font-sans text-[9px] tracking-stamp text-emerald uppercase">
                        {trip.name}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Section>
      )}

      {show('postcards') && results.postcards.length > 0 && (
        <Section label="Postcards" icon={Mail}>
          <div className="grid grid-cols-2 gap-3">
            {results.postcards.map((p) => {
              const trip = tripById[p.trip_id]
              return (
                <button
                  key={p.id}
                  onClick={() => trip && onOpen(trip)}
                  className="card-paper texture-paper overflow-hidden rounded-lg text-left"
                >
                  <MediaImage src={p.front_url} alt={p.location || 'Postcard'} className="aspect-[3/2] w-full object-cover" />
                  <div className="px-3 py-2">
                    <p className="truncate font-display text-[15px] text-emerald-deep">
                      {p.location || 'Untitled'}
                    </p>
                    {trip && (
                      <p className="truncate font-sans text-[9px] tracking-stamp text-emerald uppercase">
                        {trip.name}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Section>
      )}
    </motion.div>
  )
}

function Section({ label, icon: Icon, children }) {
  return (
    <section className="mt-6">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-gold-light/90" />}
        <span className="font-sans text-[9px] tracking-stamp whitespace-nowrap text-gold-light/90 uppercase">
          {label}
        </span>
        <span className="rule-gold h-px flex-1" />
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}
