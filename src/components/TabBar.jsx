import { motion } from 'framer-motion'
import { Globe, Compass, Search, Award, Check, Sparkle } from './Icons'

const TABS = [
  ['home', 'Passport', Compass],
  ['maps', 'Maps', Globe],
  ['plan', 'Plan', Check],
  ['chat', 'Ask', Sparkle],
  ['search', 'Search', Search],
  ['badges', 'Badges', Award],
]

export default function TabBar({ active, onChange }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/20 bg-emerald-deep/95 backdrop-blur-md"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-[560px] items-stretch justify-around px-2 pt-2">
        {TABS.map(([id, label, Icon]) => {
          const on = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-label={label}
              aria-current={on ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 py-1.5"
            >
              {on && (
                <motion.span
                  layoutId="tab-underline"
                  className="rule-gold absolute -top-2 h-px w-10"
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon
                className={`h-5 w-5 transition-colors ${
                  on ? 'text-gold-light' : 'text-cream/60'
                }`}
              />
              <span
                className={`font-sans text-[8px] tracking-stamp uppercase transition-colors ${
                  on ? 'text-gold-light' : 'text-cream/60'
                }`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
