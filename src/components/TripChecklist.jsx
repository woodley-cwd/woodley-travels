import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Checkbox from './Checkbox'
import { emptyChecklistItem, checklistProgress } from '../lib/planning'
import { inputClass } from './Form'

const GROUPS = [
  ['booking', 'Booked'],
  ['packing', 'Packed'],
]

export default function TripChecklist({
  tripId, items, templates, onSave, onDelete, onApplyTemplate,
}) {
  const [drafts, setDrafts] = useState({ booking: '', packing: '' })
  const [showTemplates, setShowTemplates] = useState(false)

  const progress = checklistProgress(items)

  const add = (category) => {
    const label = drafts[category].trim()
    if (!label) return
    const sort = items.filter((i) => i.category === category).length
    onSave({ ...emptyChecklistItem(tripId, category, sort), label })
    setDrafts((d) => ({ ...d, [category]: '' }))
  }

  return (
    <div className="card-paper texture-paper overflow-hidden rounded-xl px-5 py-5">
      <div className="flex items-baseline justify-between">
        <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
          Checklist
        </span>
        <span className="font-sans text-[10px] text-navy/75">
          {progress.all.done}/{progress.all.total || 0}
        </span>
      </div>

      {GROUPS.map(([category, label]) => {
        const group = items.filter((i) => i.category === category)
        return (
          <div key={category} className="mt-4">
            <p className="font-sans text-[9px] tracking-stamp text-emerald/75 uppercase">
              {label} · {progress[category].done}/{progress[category].total}
            </p>

            <div className="mt-2 flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {group.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <Checkbox
                      checked={item.done}
                      label={item.label}
                      onChange={(done) => onSave({ ...item, done })}
                      onRemove={() => onDelete(item)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="flex gap-2">
                <input
                  className={`${inputClass} py-2 text-[14px]`}
                  value={drafts[category]}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [category]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      add(category)
                    }
                  }}
                  placeholder={
                    category === 'booking' ? 'Book the rental car…' : 'Sunscreen…'
                  }
                />
                <button
                  type="button"
                  onClick={() => add(category)}
                  className="shrink-0 rounded-md border border-emerald/25 px-3 font-sans text-[10px] tracking-stamp text-emerald uppercase"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )
      })}

      {templates.length > 0 && (
        <div className="mt-5 border-t border-emerald/10 pt-4">
          <button
            type="button"
            onClick={() => setShowTemplates((v) => !v)}
            className="font-sans text-[9px] tracking-stamp text-emerald uppercase"
          >
            {showTemplates ? 'Hide templates' : 'Use a packing template'}
          </button>

          <AnimatePresence>
            {showTemplates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex flex-col gap-2 overflow-hidden"
              >
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onApplyTemplate(t)
                      setShowTemplates(false)
                    }}
                    className="rounded-md border border-emerald/20 px-3 py-2 text-left"
                  >
                    <span className="font-display text-[16px] text-emerald-deep">
                      {t.name}
                    </span>
                    <span className="ml-2 font-sans text-[10px] text-navy/75">
                      {(t.items ?? []).length} items
                    </span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
