import { motion } from 'framer-motion'

/* Playful, quick, tiny: the tick draws itself along its own path and the box
   gives one small pop. Nothing here runs longer than a third of a second. */

export default function Checkbox({ checked, onChange, label, onRemove, tone = 'paper' }) {
  const onPaper = tone === 'paper'

  return (
    <div className="flex items-center gap-3">
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        whileTap={{ scale: 0.88 }}
        animate={checked ? { scale: [1, 1.18, 1] } : { scale: 1 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
          checked
            ? 'border-emerald bg-emerald'
            : onPaper
              ? 'border-emerald/35'
              : 'border-gold/40'
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 12.5 L10 17.5 L19 7"
            stroke={checked ? '#E2C569' : 'transparent'}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: checked ? 1 : 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          />
        </svg>
      </motion.button>

      <span
        className={`flex-1 font-sans text-[14px] transition-colors ${
          checked
            ? onPaper
              ? 'text-navy/45 line-through'
              : 'text-cream/45 line-through'
            : onPaper
              ? 'text-navy-deep'
              : 'text-cream'
        }`}
      >
        {label}
      </span>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className={`shrink-0 px-1 font-sans text-[16px] leading-none ${
            onPaper ? 'text-navy/35' : 'text-cream/45'
          }`}
        >
          ×
        </button>
      )}
    </div>
  )
}
