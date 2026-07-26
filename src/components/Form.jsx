import { motion } from 'framer-motion'

export const EASE = [0.16, 1, 0.3, 1]

export const inputClass =
  'w-full rounded-md border border-emerald/20 bg-ivory/70 px-3 py-2.5 font-sans text-[15px] text-navy-deep outline-none transition-colors placeholder:text-navy/30 focus:border-gold/70 focus:bg-ivory'

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

/* A two-option segmented control with the pill sliding between them.
   `group` must be unique per control — Framer matches layoutId globally. */
export function Segmented({ value, onChange, options, group }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md border border-emerald/15 bg-emerald/5 p-1">
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className="relative rounded px-3 py-2 font-sans text-[10px] tracking-stamp uppercase"
        >
          {value === val && (
            <motion.span
              layoutId={`seg-${group}`}
              className="absolute inset-0 rounded bg-emerald-deep"
              transition={{ duration: 0.35, ease: EASE }}
            />
          )}
          <span className={`relative ${value === val ? 'text-gold-light' : 'text-emerald/85'}`}>
            {label}
          </span>
        </button>
      ))}
    </div>
  )
}

/* Bottom sheet used for every trip-content editor. */
export function Sheet({ title, onClose, children }) {
  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-end justify-center bg-emerald-deep/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="card-paper texture-paper max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl px-5 pt-5 pb-8"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.42, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-emerald/20" />
        <h2 className="text-center font-display text-2xl text-emerald-deep">{title}</h2>
        <div className="rule-gold mx-auto mt-2 mb-5 h-px w-20" />
        {children}
      </motion.div>
    </motion.div>
  )
}

export function SubmitRow({ label, onDelete, disabled }) {
  return (
    <>
      <button
        type="submit"
        disabled={disabled}
        className="mt-2 w-full rounded-md bg-emerald-deep py-3.5 font-sans text-[10px] tracking-stamp text-gold-light uppercase transition-opacity disabled:opacity-35"
      >
        {label}
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="mt-3 w-full font-sans text-[10px] tracking-stamp text-burgundy/70 uppercase"
        >
          Remove
        </button>
      )}
    </>
  )
}
