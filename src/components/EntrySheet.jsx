import { useState } from 'react'
import { Field, inputClass, Sheet, SubmitRow, Segmented } from './Form'
import PhotoInput from './PhotoInput'

/* One sheet, four shapes. `kind` picks the field set; `trip` supplies context
   (international trips log cost in local currency alongside USD). */

function MoneyFields({ draft, set, international }) {
  return (
    <div className={international ? 'grid grid-cols-3 gap-2' : ''}>
      <Field label="Cost (USD)">
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          className={inputClass}
          value={draft.cost_usd ?? ''}
          onChange={(e) => set({ cost_usd: e.target.value })}
          placeholder="0.00"
        />
      </Field>

      {international && (
        <>
          <Field label="Local">
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className={inputClass}
              value={draft.cost_local ?? ''}
              onChange={(e) => set({ cost_local: e.target.value })}
              placeholder="0.00"
            />
          </Field>
          <Field label="Currency">
            <input
              className={inputClass}
              maxLength={3}
              value={draft.currency ?? ''}
              onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
              placeholder="EUR"
            />
          </Field>
        </>
      )}
    </div>
  )
}

const TITLES = {
  hotels: 'Hotel',
  food: 'Food Entry',
  postcards: 'Postcard',
  photos: 'Photo',
}

export default function EntrySheet({ kind, entry, trip, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(entry)
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const international = trip.scope === 'international'
  const isNew = !entry.updated_at || entry.created_at === entry.updated_at

  // Only hotels and food carry a required name; postcards and photos are
  // image-first and can be saved with nothing else filled in.
  const required = { hotels: draft.name, food: draft.dish }[kind]
  const canSave = required === undefined || String(required ?? '').trim().length > 0

  const submit = (e) => {
    e.preventDefault()
    if (!canSave) return

    // Handle batch photo uploads
    if (kind === 'photos' && draft._batchUrls && Array.isArray(draft._batchUrls)) {
      draft._batchUrls.forEach((url) => {
        onSave(kind, { ...draft, url, _batchUrls: undefined })
      })
    } else {
      onSave(kind, draft)
    }
  }

  return (
    <Sheet title={`${isNew ? 'Add' : 'Edit'} ${TITLES[kind]}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {kind === 'hotels' && (
          <>
            <Field label="Hotel name">
              <input
                autoFocus
                className={`${inputClass} font-display text-xl`}
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Hotel Le Sirenuse"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check in">
                <input
                  type="date"
                  className={inputClass}
                  value={draft.check_in || ''}
                  onChange={(e) => set({ check_in: e.target.value })}
                />
              </Field>
              <Field label="Check out">
                <input
                  type="date"
                  className={inputClass}
                  min={draft.check_in || undefined}
                  value={draft.check_out || ''}
                  onChange={(e) => set({ check_out: e.target.value })}
                />
              </Field>
            </div>
            <MoneyFields draft={draft} set={set} international={international} />
            <Field label="Confirmation">
              <input
                className={inputClass}
                value={draft.confirmation || ''}
                onChange={(e) => set({ confirmation: e.target.value })}
                placeholder="Booking reference"
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                className={`${inputClass} resize-none leading-relaxed`}
                value={draft.notes || ''}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
          </>
        )}

        {kind === 'food' && (
          <>
            <PhotoInput
              value={draft.photo_url}
              onChange={(photo_url) => set({ photo_url })}
              label="Dish photo"
            />
            <Field label="Dish">
              <input
                className={`${inputClass} font-display text-xl`}
                value={draft.dish}
                onChange={(e) => set({ dish: e.target.value })}
                placeholder="Spaghetti alle vongole"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Restaurant">
                <input
                  className={inputClass}
                  value={draft.restaurant || ''}
                  onChange={(e) => set({ restaurant: e.target.value })}
                />
              </Field>
              <Field label="City">
                <input
                  className={inputClass}
                  value={draft.city || ''}
                  onChange={(e) => set({ city: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Cuisine">
              <input
                className={inputClass}
                value={draft.cuisine || ''}
                onChange={(e) => set({ cuisine: e.target.value })}
                placeholder="Italian"
              />
            </Field>
            <MoneyFields draft={draft} set={set} international={international} />
            <Field label="Would eat again">
              <Segmented
                group="again"
                value={draft.again ? 'yes' : 'no'}
                onChange={(v) => set({ again: v === 'yes' })}
                options={[
                  ['yes', 'Absolutely'],
                  ['no', 'Not again'],
                ]}
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                className={`${inputClass} resize-none leading-relaxed`}
                value={draft.notes || ''}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
          </>
        )}

        {kind === 'postcards' && (
          <>
            <PhotoInput
              value={draft.front_url}
              onChange={(front_url) => set({ front_url })}
              label="Front"
              aspect="aspect-[3/2]"
            />
            <PhotoInput
              value={draft.back_url}
              onChange={(back_url) => set({ back_url })}
              label="Back"
              aspect="aspect-[3/2]"
            />
            <Field label="Or write the back">
              <textarea
                rows={4}
                className={`${inputClass} resize-none font-display text-[17px] leading-relaxed italic`}
                value={draft.back_note || ''}
                onChange={(e) => set({ back_note: e.target.value })}
                placeholder="Wish you were here…"
              />
            </Field>
            <Field label="Location">
              <input
                className={inputClass}
                value={draft.location || ''}
                onChange={(e) => set({ location: e.target.value })}
                placeholder="Positano, Italy"
              />
            </Field>
          </>
        )}

        {kind === 'photos' && (
          <>
            <PhotoInput
              value={draft.url}
              onChange={(urls) => {
                // Handle both single and batch uploads
                if (Array.isArray(urls)) {
                  // Batch mode: store refs for later processing
                  set({ _batchUrls: urls })
                } else {
                  // Single mode: store as before
                  set({ url: urls })
                }
              }}
              label={isNew ? 'Photos (upload multiple)' : 'Photo'}
              multiple={isNew}
            />
            {!draft._batchUrls && (
              <Field label="Caption">
                <input
                  className={inputClass}
                  value={draft.caption || ''}
                  onChange={(e) => set({ caption: e.target.value })}
                  placeholder="The view from the terrace"
                />
              </Field>
            )}
            {isNew && (
              <p className="text-[11px] text-cream/60">
                Upload multiple photos at once, then add captions to each one individually after.
              </p>
            )}
          </>
        )}

        <SubmitRow
          label={isNew ? 'Add' : 'Save changes'}
          disabled={!canSave}
          onDelete={isNew ? null : () => onDelete(kind, draft)}
        />
      </form>
    </Sheet>
  )
}
