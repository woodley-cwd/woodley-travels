import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { US_STATES, COUNTRIES } from '../lib/places'
import { Back, Trash } from '../components/Icons'
import { Field, Segmented, inputClass, EASE } from '../components/Form'
import PhotoInput from '../components/PhotoInput'

export default function TripForm({ trip, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(trip)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)

  const isNew = !trip.name && !trip.destination
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  // Switching scope invalidates the region list, so clear the old code.
  const setScope = (scope) => set({ scope, region_code: '' })

  const regions = draft.scope === 'international' ? COUNTRIES : US_STATES

  const submit = async (e) => {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    await onSave({ ...draft, name: draft.name.trim() })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto w-full max-w-[520px] px-5 pb-16 safe-t"
    >
      <header className="flex items-center justify-between py-3">
        <button
          onClick={onClose}
          aria-label="Back"
          className="-ml-2 flex h-10 w-10 items-center justify-center text-cream/70"
        >
          <Back className="h-5 w-5" />
        </button>
        <h1 className="foil font-display text-xl">
          {isNew ? 'New Entry' : 'Edit Entry'}
        </h1>
        <div className="w-10" />
      </header>

      <form
        onSubmit={submit}
        className="card-paper guilloche texture-paper flex flex-col gap-5 rounded-xl px-5 py-6"
      >
        <Segmented
          group="scope"
          value={draft.scope}
          onChange={setScope}
          options={[
            ['domestic', 'Domestic'],
            ['international', 'International'],
          ]}
        />

        <Field label="Trip name">
          <input
            autoFocus={isNew}
            className={`${inputClass} font-display text-xl`}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Amalfi in September"
          />
        </Field>

        <Field label="City">
          <input
            className={inputClass}
            value={draft.destination}
            onChange={(e) => set({ destination: e.target.value })}
            placeholder={draft.scope === 'international' ? 'Positano' : 'Savannah'}
          />
        </Field>

        <Field label={draft.scope === 'international' ? 'Country' : 'State'}>
          <select
            className={inputClass}
            value={draft.region_code || ''}
            onChange={(e) => set({ region_code: e.target.value })}
          >
            <option value="">Select…</option>
            {regions.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Departs">
            <input
              type="date"
              className={inputClass}
              value={draft.start_date || ''}
              onChange={(e) => set({ start_date: e.target.value })}
            />
          </Field>
          <Field label="Returns">
            <input
              type="date"
              className={inputClass}
              min={draft.start_date || undefined}
              value={draft.end_date || ''}
              onChange={(e) => set({ end_date: e.target.value })}
            />
          </Field>
        </div>

        <PhotoInput
          value={draft.cover_photo}
          onChange={(cover_photo) => set({ cover_photo })}
          label="Cover photo"
        />

        <Field label="Traveled with">
          <input
            className={inputClass}
            value={draft.traveled_with || ''}
            onChange={(e) => set({ traveled_with: e.target.value })}
            placeholder="Solo"
          />
        </Field>

        <Field label="Journal note">
          <textarea
            rows={4}
            className={`${inputClass} resize-none leading-relaxed`}
            value={draft.journal_note || ''}
            onChange={(e) => set({ journal_note: e.target.value })}
            placeholder="What you want to remember…"
          />
        </Field>

        <Field label="Status">
          <Segmented
            group="status"
            value={draft.status}
            onChange={(status) => set({ status })}
            options={[
              ['planning', 'Planning'],
              ['completed', 'Stamped'],
            ]}
          />
        </Field>

        <div className="rule-gold h-px w-full opacity-60" />

        <button
          type="submit"
          disabled={!draft.name.trim() || saving}
          className="w-full rounded-md bg-emerald-deep py-3.5 font-sans text-[10px] tracking-stamp text-gold-light uppercase transition-opacity disabled:opacity-35"
        >
          {saving ? 'Saving…' : isNew ? 'Add to passport' : 'Save changes'}
        </button>

        {!isNew && (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-2 font-sans text-[10px] tracking-stamp text-burgundy/70 uppercase"
          >
            <Trash className="h-3.5 w-3.5" />
            Remove entry
          </button>
        )}
      </form>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-emerald-deep/85 px-8 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.94, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 10 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="card-paper texture-paper w-full max-w-[320px] rounded-xl px-6 py-7 text-center"
            >
              <h2 className="font-display text-2xl text-emerald-deep">
                Remove this entry?
              </h2>
              <p className="mt-2 font-sans text-[12px] leading-relaxed text-navy/75">
                “{draft.name}” and everything in it — flights, hotels, itinerary, food, postcards,
                photos — will be erased. This can’t be undone.
              </p>
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => onDelete(draft.id)}
                  className="rounded-md bg-burgundy py-3 font-sans text-[10px] tracking-stamp text-cream uppercase"
                >
                  Remove
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="py-2 font-sans text-[10px] tracking-stamp text-navy/75 uppercase"
                >
                  Keep it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
