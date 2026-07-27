import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Checkbox from './Checkbox'
import { inputClass } from './Form'
import { byDay, dayHeading, emptyItineraryItem } from '../lib/entries'
import { Pin } from './Icons'

/* The plan for a trip, day by day.

   Two ways in on purpose: type a title and hit Add for the "ooh, we should see
   that" moment, or tap a row afterwards to open the sheet and pin down a day,
   a time and a place. Making the date mandatory up front would turn a wishlist
   into paperwork. */

export default function TripItinerary({ trip, items, onSave, onDelete, onEdit }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const title = draft.trim()
    if (!title) return
    onSave('itinerary', { ...emptyItineraryItem(trip.id, items.length), title })
    setDraft('')
  }

  const groups = byDay(items)

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-gold/30 px-4 py-6 text-center font-sans text-[11px] text-cream/70">
          Nothing planned yet. Add somewhere you want to go.
        </p>
      )}

      {groups.map((group) => {
        const { label, sub } = dayHeading(group.day, trip.start_date)
        return (
          <div key={group.day || 'any'} className="card-paper texture-paper rounded-xl px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
                {label}
              </span>
              {sub && (
                <span className="font-sans text-[9px] tracking-stamp text-navy/50 uppercase">
                  {sub}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
              <AnimatePresence initial={false}>
                {group.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Checkbox
                          checked={item.done}
                          label={item.title || 'Untitled'}
                          onChange={(done) => onSave('itinerary', { ...item, done })}
                        />

                        {(item.at_time || item.location) && (
                          <div className="mt-1 flex items-center gap-2 pl-9">
                            {item.at_time && (
                              <span className="font-sans text-[10px] text-navy/75">
                                {item.at_time}
                              </span>
                            )}
                            {item.location && (
                              <span className="flex min-w-0 items-center gap-1 font-sans text-[10px] text-navy/75">
                                <Pin className="h-3 w-3 shrink-0 text-gold/70" />
                                <span className="truncate">{item.location}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {item.notes && (
                          <p className="mt-1 pl-9 font-display text-[14px] leading-snug text-navy/75 italic">
                            {item.notes}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onEdit('itinerary', item)}
                        aria-label={`Edit ${item.title || 'item'}`}
                        className="shrink-0 rounded border border-emerald/20 px-2 py-1 font-sans text-[8px] tracking-stamp text-emerald/80 uppercase"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete('itinerary', item)}
                        aria-label={`Remove ${item.title || 'item'}`}
                        className="shrink-0 px-1 font-sans text-[16px] leading-none text-navy/35"
                      >
                        ×
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )
      })}

      <div className="flex gap-2">
        <input
          className={`${inputClass} py-2 text-[14px]`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Misty Fjords flightseeing…"
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-md border border-gold/30 px-4 font-sans text-[10px] tracking-stamp text-gold-light uppercase"
        >
          Add
        </button>
      </div>
    </div>
  )
}
