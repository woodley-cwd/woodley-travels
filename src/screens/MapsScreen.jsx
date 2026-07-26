import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { loadUsMap, loadWorldMap, toAtlasName, NOT_ON_MAP } from '../lib/geo'
import { regionName } from '../lib/places'
import { Segmented, EASE } from '../components/Form'
import { Compass, Pin, Globe } from '../components/Icons'

/* Watercolor bloom: turbulence displaces the fill edge so it bleeds like ink
   into paper instead of ending on a hard vector line. Each visited region
   fades and swells in from its own centre, staggered across the map. */

function Defs() {
  return (
    <defs>
      <filter id="watercolor" x="-15%" y="-15%" width="130%" height="130%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.022"
          numOctaves="4"
          seed="7"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="7"
          xChannelSelector="R"
          yChannelSelector="G"
          result="bled"
        />
        <feGaussianBlur in="bled" stdDeviation="0.9" />
      </filter>

      {/* Uneven pigment density, like a wash that pooled */}
      <radialGradient id="wash" cx="42%" cy="38%" r="72%">
        <stop offset="0%" stopColor="#1F7A63" />
        <stop offset="55%" stopColor="#145C4B" />
        <stop offset="100%" stopColor="#0B3B32" />
      </radialGradient>

      <radialGradient id="washRose" cx="42%" cy="38%" r="72%">
        <stop offset="0%" stopColor="#A8455C" />
        <stop offset="100%" stopColor="#7D2B3F" />
      </radialGradient>
    </defs>
  )
}

function MapCanvas({ map, visited, onPick }) {
  return (
    <svg
      viewBox={map.viewBox}
      className="h-auto w-full"
      role="img"
      aria-label="Travel map"
    >
      <Defs />

      {/* Unvisited: faint engraved outlines, like a blank passport page */}
      <g>
        {map.regions.map((r) => (
          <path
            key={r.name}
            d={r.d}
            fill="rgba(247,241,228,0.045)"
            stroke="rgba(201,162,39,0.28)"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>

      {/* Visited: the wash blooms in */}
      <g filter="url(#watercolor)">
        {map.regions
          .filter((r) => visited.has(r.name))
          .map((r, i) => (
            <motion.path
              key={r.name}
              d={r.d}
              fill={visited.get(r.name).upcoming ? 'url(#washRose)' : 'url(#wash)'}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                delay: 0.15 + i * 0.09,
                duration: 1.1,
                ease: [0.22, 1, 0.28, 1],
              }}
            />
          ))}
      </g>

      {/* Crisp gold edge on top of the wash so regions stay legible */}
      <g>
        {map.regions
          .filter((r) => visited.has(r.name))
          .map((r, i) => (
            <motion.path
              key={r.name}
              d={r.d}
              fill="transparent"
              stroke="rgba(226,197,105,0.85)"
              strokeWidth={0.9}
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer"
              onClick={() => onPick(visited.get(r.name).trip)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.09, duration: 0.6 }}
            >
              <title>{r.name}</title>
            </motion.path>
          ))}
      </g>
    </svg>
  )
}

export default function MapsScreen({ trips, onOpen }) {
  const [view, setView] = useState('domestic')
  const [map, setMap] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const load = view === 'domestic' ? loadUsMap : loadWorldMap

    load()
      .then((m) => {
        if (alive) {
          setMap(m)
          setLoading(false)
        }
      })
      .catch(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [view])

  /* A region fills once any trip touches it. Completed trips wash emerald;
     a trip that's still planned washes rose, so the map doubles as a preview
     of where you're going next. */
  const { visited, offMap } = useMemo(() => {
    const hits = new Map()
    const off = []

    for (const trip of trips) {
      if (trip.scope !== view || !trip.region_code) continue
      const proper = regionName(trip.scope, trip.region_code)
      if (!proper) continue

      const upcoming = trip.status !== 'completed'
      if (NOT_ON_MAP.has(proper)) {
        if (!off.some((o) => o.name === proper)) off.push({ name: proper, trip, upcoming })
        continue
      }

      const key = toAtlasName(proper)
      // A completed trip outranks a planned one for the same region.
      if (!hits.has(key) || (!upcoming && hits.get(key).upcoming)) {
        hits.set(key, { trip, upcoming })
      }
    }
    return { visited: hits, offMap: off }
  }, [trips, view])

  const count = visited.size + offMap.length
  const [one, many] =
    view === 'domestic' ? ['state', 'states'] : ['country', 'countries']

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto w-full max-w-[560px] px-5 pb-28 safe-t"
    >
      <header className="pt-3 pb-5 text-center">
        <h1 className="foil font-display text-3xl leading-none">Where I've Been</h1>
        <div className="rule-gold mx-auto mt-2.5 h-px w-24" />
        <p className="mt-2.5 font-sans text-[9px] tracking-stamp text-cream/70 uppercase">
          {count} {count === 1 ? one : many}
        </p>
      </header>

      <Segmented
        group="mapview"
        value={view}
        onChange={setView}
        options={[
          ['domestic', 'States'],
          ['international', 'World'],
        ]}
      />

      <div className="card-paper texture-paper mt-5 overflow-hidden rounded-xl px-3 py-4">
        {loading || !map ? (
          <div className="flex justify-center py-16">
            <Compass className="animate-compass h-7 w-7 text-gold/70" />
          </div>
        ) : (
          <MapCanvas map={map} visited={visited} onPick={onOpen} />
        )}
      </div>

      {/* Regions the atlas can't draw are listed rather than quietly dropped */}
      {offMap.length > 0 && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {offMap.map(({ name, trip }) => (
            <button
              key={name}
              onClick={() => onOpen(trip)}
              className="flex items-center gap-1.5 rounded-full border border-gold/35 px-3 py-1.5 font-sans text-[10px] tracking-stamp text-cream/80 uppercase"
            >
              <Pin className="h-3 w-3 text-gold-light" />
              {name}
            </button>
          ))}
        </div>
      )}

      {count === 0 && !loading && (
        <p className="mt-5 text-center font-sans text-[11px] text-cream/70">
          {view === 'domestic'
            ? 'No states stamped yet.'
            : 'No countries stamped yet.'}
        </p>
      )}

      <div className="mt-6 flex items-center justify-center gap-5">
        <Legend swatch="bg-emerald" label="Stamped" />
        <Legend swatch="bg-burgundy" label="Planned" />
      </div>
    </motion.div>
  )
}

function Legend({ swatch, label }) {
  return (
    <span className="flex items-center gap-2 font-sans text-[9px] tracking-stamp text-cream/70 uppercase">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
      {label}
    </span>
  )
}
