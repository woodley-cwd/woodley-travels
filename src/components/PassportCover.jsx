import { motion } from 'framer-motion'
import { useEffect } from 'react'

/* The cover-open. Spec calls for Lottie here; this is a Framer Motion + CSS 3D
   build so the moment ships now with no binary asset and no network fetch. A
   hand-crafted Lottie can replace the inner block in Phase 6 without touching
   the callers.

   The cover is hinged on its left edge and swings back ~160°, revealing the
   guilloché data page underneath. */

const EASE = [0.16, 1, 0.3, 1]

export default function PassportCover({ onOpened }) {
  useEffect(() => {
    const t = setTimeout(onOpened, 2600)
    return () => clearTimeout(t)
  }, [onOpened])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-deep"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Warm pool of light behind the book */}
      <motion.div
        className="pointer-events-none absolute h-[70vmin] w-[70vmin] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgb(201 162 39 / 0.20), transparent 65%)',
        }}
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.6, ease: EASE }}
      />

      <div
        className="relative h-[62vh] max-h-[520px] w-[72vw] max-w-[340px]"
        style={{ perspective: '1400px' }}
      >
        {/* Data page revealed underneath */}
        <motion.div
          className="card-paper guilloche texture-paper absolute inset-0 rounded-r-lg rounded-l-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <div className="rule-gold h-px w-16" />
            <p className="font-sans text-[10px] tracking-stamp text-emerald uppercase">
              United States of
            </p>
            <h1 className="font-display text-4xl leading-none text-emerald-deep">
              Woodley
            </h1>
            <p className="font-sans text-[10px] tracking-stamp text-emerald uppercase">
              Travels
            </p>
            <div className="rule-gold h-px w-16" />
          </div>
        </motion.div>

        {/* The cover itself */}
        <motion.div
          className="texture-leather absolute inset-0 rounded-r-lg rounded-l-sm"
          style={{
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
            boxShadow:
              'inset 0 0 60px rgb(0 0 0 / 0.45), 0 24px 50px -18px rgb(0 0 0 / 0.7)',
          }}
          initial={{ rotateY: 0 }}
          animate={{ rotateY: -162 }}
          transition={{ delay: 1.05, duration: 1.5, ease: EASE }}
        >
          {/* Gold border rule inset from the edge, like a real cover */}
          <div className="absolute inset-3 rounded-sm border border-gold/30" />

          <div className="emboss flex h-full flex-col items-center justify-center gap-5 px-8 text-center">
            <p className="foil font-sans text-[9px] tracking-stamp uppercase">
              Passport
            </p>

            <motion.svg
              width="76"
              height="76"
              viewBox="0 0 24 24"
              fill="none"
              stroke="url(#foilStroke)"
              strokeWidth="0.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.35, duration: 0.9, ease: EASE }}
            >
              <defs>
                <linearGradient id="foilStroke" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8f6f1c" />
                  <stop offset="45%" stopColor="#f4e3a8" />
                  <stop offset="100%" stopColor="#a8862f" />
                </linearGradient>
              </defs>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
              <path d="M3.5 9h17M3.5 15h17" />
            </motion.svg>

            <div>
              <h2 className="foil font-display text-2xl leading-tight">
                Woodley Travels
              </h2>
              <p className="foil mt-1 font-sans text-[8px] tracking-stamp uppercase">
                A passport for every place
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
