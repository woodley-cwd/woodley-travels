import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import BadgeSeal from './BadgeSeal'

const BRAND = ['#C9A227', '#E2C569', '#1F7A63', '#F7F1E4', '#7D2B3F']

/* Playful, bouncy, short — the one deliberately un-elegant moment in the app.
   Queued badges are shown one at a time by the caller. */

export default function BadgeCelebration({ badge, onDone }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!reduced) {
      const burst = (originX, delay) =>
        setTimeout(
          () =>
            confetti({
              particleCount: 45,
              spread: 68,
              startVelocity: 38,
              scalar: 0.85,
              ticks: 160,
              colors: BRAND,
              origin: { x: originX, y: 0.55 },
              disableForReducedMotion: true,
            }),
          delay
        )

      const timers = [burst(0.5, 260), burst(0.3, 460), burst(0.7, 520)]
      const done = setTimeout(onDone, 2600)
      return () => {
        timers.forEach(clearTimeout)
        clearTimeout(done)
      }
    }

    const done = setTimeout(onDone, 1400)
    return () => clearTimeout(done)
  }, [badge.id, onDone])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-deep/92 px-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onDone}
    >
      <motion.div
        initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 0.15 }}
      >
        <BadgeSeal size={132} earned />
      </motion.div>

      <motion.p
        className="mt-7 font-sans text-[9px] tracking-stamp text-gold-light uppercase"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
      >
        Badge earned
      </motion.p>

      <motion.h2
        className="mt-1.5 text-center font-display text-4xl text-cream"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {badge.name}
      </motion.h2>

      <motion.p
        className="mt-2 text-center font-sans text-[12px] text-cream/75"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.85, duration: 0.5 }}
      >
        {badge.hint}
      </motion.p>
    </motion.div>
  )
}
