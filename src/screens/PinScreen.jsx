import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock } from '../components/Icons'
import { verifyPin } from '../lib/pin'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export default function PinScreen({ onUnlock }) {
  const [entry, setEntry] = useState('')
  const [shake, setShake] = useState(false)
  const [checking, setChecking] = useState(false)

  const press = (key) => {
    if (key === '' || checking) return
    if (key === '⌫') return setEntry((e) => e.slice(0, -1))
    if (entry.length >= 4) return

    const next = entry + key
    setEntry(next)
    if (next.length < 4) return

    // Verification is async now that the PIN is hashed rather than compared
    // against a build-time constant.
    setChecking(true)
    verifyPin(next).then((ok) => {
      setChecking(false)
      if (ok) {
        setTimeout(onUnlock, 220)
      } else {
        setShake(true)
        setTimeout(() => {
          setShake(false)
          setEntry('')
        }, 520)
      }
    })
  }

  return (
    <div className="texture-leather flex min-h-full flex-col items-center justify-center px-8 safe-t safe-b">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex w-full max-w-[300px] flex-col items-center"
      >
        <Lock className="mb-5 h-6 w-6 text-gold/70" />
        <h1 className="foil font-display text-3xl">Woodley Travels</h1>
        <p className="mt-1 font-sans text-[9px] tracking-stamp text-cream/70 uppercase">
          Enter passcode
        </p>

        <motion.div
          className="mt-9 flex gap-4"
          animate={shake ? { x: [0, -9, 8, -6, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* The fill is a class toggle, not a Framer `animate` value — Framer
              silently drops backgroundColor here, so CSS owns the color and
              Framer owns only the scale pop. */}
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              className={`h-3 w-3 rounded-full border transition-colors duration-200 ${
                shake
                  ? 'border-rose'
                  : 'border-gold/50'
              } ${
                i < entry.length
                  ? shake
                    ? 'bg-rose'
                    : 'bg-gold'
                  : 'bg-transparent'
              }`}
              animate={{ scale: i === entry.length - 1 ? [1, 1.35, 1] : 1 }}
              transition={{ duration: 0.25 }}
            />
          ))}
        </motion.div>

        <div className="mt-12 grid w-full grid-cols-3 gap-x-5 gap-y-3">
          {KEYS.map((key, i) => (
            <motion.button
              key={i}
              type="button"
              disabled={key === ''}
              onClick={() => press(key)}
              whileTap={key ? { scale: 0.9 } : undefined}
              className={`h-16 rounded-full font-display text-2xl text-cream/85 transition-colors ${
                key === ''
                  ? 'pointer-events-none opacity-0'
                  : 'border border-gold/15 bg-cream/5 active:bg-gold/15'
              } ${key === '⌫' ? 'font-sans text-base text-cream/50' : ''}`}
            >
              {key}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
