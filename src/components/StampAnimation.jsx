import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { regionName } from '../lib/places'

/* The signature moment: planning → stamped.

   Spec calls for Lottie; this is Framer Motion so it ships without a binary
   asset. The weight comes from the timing — a slow rise, a hard fast drop, a
   recoil, then ink bleeding outward as the stamp lifts away. */

const EASE_DROP = [0.7, 0, 0.84, 0] // fast at the end — the impact
const EASE_OUT = [0.16, 1, 0.3, 1]

export default function StampAnimation({ trip, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2900)
    return () => clearTimeout(t)
  }, [onDone])

  const place =
    regionName(trip.scope, trip.region_code) || trip.destination || ''
  const date = trip.end_date || trip.start_date
  const dateLabel = date
    ? new Date(`${date}T00:00:00`)
        .toLocaleDateString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
        .toUpperCase()
    : ''

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-deep/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* The page being stamped */}
      <div className="card-paper guilloche texture-paper relative flex h-[52vh] max-h-[420px] w-[74vw] max-w-[330px] items-center justify-center overflow-hidden rounded-lg">
        {/* Ink bleed — expands outward just after impact */}
        <motion.div
          className="absolute h-44 w-44 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(125,43,63,0.22), transparent 70%)' }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.15, 1.4], opacity: [0, 0.9, 0] }}
          transition={{ delay: 1.15, duration: 1.4, ease: EASE_OUT }}
        />

        {/* The stamp mark itself */}
        <motion.div
          className="relative flex h-40 w-40 flex-col items-center justify-center rounded-full text-burgundy"
          style={{ border: '3px double currentColor', rotate: -13 }}
          initial={{ scale: 4.5, opacity: 0 }}
          animate={{
            scale: [4.5, 4.5, 1, 1.08, 1],
            opacity: [0, 0.9, 1, 1, 1],
          }}
          transition={{
            duration: 1.5,
            times: [0, 0.5, 0.76, 0.85, 1],
            ease: EASE_DROP,
          }}
        >
          <span className="font-sans text-[8px] tracking-stamp uppercase">Admitted</span>
          <span className="mt-1 max-w-[7rem] text-center font-display text-lg leading-tight font-semibold">
            {place}
          </span>
          <span className="mt-1 font-sans text-[8px] tracking-stamp">{dateLabel}</span>
        </motion.div>

        {/* Impact jolt on the page */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          animate={{ x: [0, 0, -3, 3, -1, 0], y: [0, 0, 2, -2, 1, 0] }}
          transition={{ duration: 1.5, times: [0, 0.74, 0.78, 0.82, 0.9, 1] }}
        />
      </div>

      <motion.p
        className="foil absolute bottom-[18%] font-sans text-[9px] tracking-stamp uppercase"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6, duration: 0.7, ease: EASE_OUT }}
      >
        {trip.name} · Stamped
      </motion.p>
    </motion.div>
  )
}
