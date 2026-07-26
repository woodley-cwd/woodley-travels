import { motion } from 'framer-motion'
import BadgeSeal from '../components/BadgeSeal'
import { EASE } from '../components/Form'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } }
const pop = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE } },
}

export default function BadgesScreen({ badges }) {
  const earned = badges.filter((b) => b.earned).length

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto w-full max-w-[560px] px-5 pb-28 safe-t"
    >
      <header className="pt-3 pb-5 text-center">
        <h1 className="foil font-display text-3xl leading-none">Badges</h1>
        <div className="rule-gold mx-auto mt-2.5 h-px w-24" />
        <p className="mt-2.5 font-sans text-[9px] tracking-stamp text-cream/70 uppercase">
          {earned} of {badges.length} earned
        </p>
      </header>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-x-3 gap-y-6"
      >
        {badges.map((b) => (
          <motion.div
            key={b.id}
            variants={pop}
            className="flex flex-col items-center text-center"
          >
            <BadgeSeal size={64} earned={b.earned} label={b.name} />
            <p
              className={`mt-2 font-display text-[15px] leading-tight ${
                b.earned ? 'text-cream' : 'text-cream/45'
              }`}
            >
              {b.name}
            </p>
            <p
              className={`mt-0.5 font-sans text-[9px] leading-snug ${
                b.earned ? 'text-cream/70' : 'text-cream/40'
              }`}
            >
              {b.earned && b.earnedAt
                ? new Date(b.earnedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })
                : b.hint}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
