import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  emptyCard, emptyWish, emptyTemplate, CARD_KINDS, TRIP_TYPES, formatPoints,
} from '../lib/planning'
import { regionName, flagEmoji, US_STATES, COUNTRIES } from '../lib/places'
import { Field, inputClass, Sheet, SubmitRow, Segmented, EASE } from '../components/Form'
import { Plus, Wallet, Heart, Bed, Plane } from '../components/Icons'

const VIEWS = [
  ['wishlist', 'Wishlist'],
  ['cards', 'Cards'],
  ['packing', 'Packing'],
]

const Empty = ({ children }) => (
  <p className="rounded-lg border border-dashed border-gold/30 px-4 py-8 text-center font-sans text-[11px] text-cream/70">
    {children}
  </p>
)

export default function PlanScreen({
  wishlist, cards, templates, onSave, onDelete, onPromote,
}) {
  const [view, setView] = useState('wishlist')
  const [sheet, setSheet] = useState(null) // { kind, item }

  const add = () =>
    setSheet({
      kind: view,
      item:
        view === 'wishlist'
          ? emptyWish()
          : view === 'cards'
            ? emptyCard()
            : emptyTemplate(),
    })

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="mx-auto w-full max-w-[560px] px-5 pb-28 safe-t"
    >
      <header className="pt-3 pb-5 text-center">
        <h1 className="foil font-display text-3xl leading-none">Planning</h1>
        <div className="rule-gold mx-auto mt-2.5 h-px w-24" />
      </header>

      <div className="flex gap-2">
        {VIEWS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`flex-1 rounded-full border px-3 py-2 font-sans text-[10px] tracking-stamp uppercase transition-colors ${
              view === id
                ? 'border-gold/60 bg-gold/20 text-gold-light'
                : 'border-gold/25 text-cream/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {view === 'wishlist' && (
          <WishlistView list={wishlist} onEdit={(i) => setSheet({ kind: 'wishlist', item: i })} onPromote={onPromote} onDelete={onDelete} />
        )}
        {view === 'cards' && (
          <CardsView list={cards} onEdit={(i) => setSheet({ kind: 'cards', item: i })} onDelete={onDelete} />
        )}
        {view === 'packing' && (
          <TemplatesView list={templates} onEdit={(i) => setSheet({ kind: 'packing', item: i })} onDelete={onDelete} />
        )}
      </div>

      <motion.button
        onClick={add}
        whileTap={{ scale: 0.92 }}
        aria-label={`Add ${view === 'packing' ? 'template' : view.replace(/s$/, '')}`}
        className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-emerald shadow-[0_10px_28px_-8px_rgba(0,0,0,0.65)]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 8rem)' }}
      >
        <Plus className="h-6 w-6 text-gold-light" />
      </motion.button>

      <AnimatePresence>
        {sheet && (
          <PlanSheet
            kind={sheet.kind}
            item={sheet.item}
            onSave={(item) => {
              onSave(sheet.kind, item)
              setSheet(null)
            }}
            onDelete={(item) => {
              onDelete(sheet.kind, item)
              setSheet(null)
            }}
            onClose={() => setSheet(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* — Views ——————————————————————————————————— */

function WishlistView({ list, onEdit, onPromote, onDelete }) {
  if (list.length === 0) return <Empty>Nowhere on the someday list yet.</Empty>

  return (
    <div className="flex flex-col gap-2.5">
      {list.map((w) => (
        <div key={w.id} className="card-paper texture-paper overflow-hidden rounded-lg">
          <button onClick={() => onEdit(w)} className="w-full px-4 py-3 text-left">
            <div className="flex items-center gap-3">
              <span className="text-lg leading-none">
                {w.scope === 'international' ? flagEmoji(w.region_code) || '🌍' : '🇺🇸'}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-xl leading-tight text-emerald-deep">
                  {w.destination || 'Somewhere'}
                </h3>
                <p className="truncate font-sans text-[10px] text-navy/75">
                  {regionName(w.scope, w.region_code) || 'Someday'}
                </p>
              </div>
            </div>
            {w.notes && (
              <p className="mt-2 font-display text-[15px] leading-snug text-navy/75 italic">
                {w.notes}
              </p>
            )}
          </button>
          <div className="flex divide-x divide-emerald/10 border-t border-emerald/10">
            <button
              onClick={() => onPromote(w)}
              className="flex-1 py-2.5 font-sans text-[9px] tracking-stamp text-emerald uppercase"
            >
              Make it a trip
            </button>
            <button
              onClick={() => onDelete('wishlist', w)}
              className="flex-1 py-2.5 font-sans text-[9px] tracking-stamp text-burgundy/70 uppercase hover:text-burgundy"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function CardsView({ list, onEdit, onDelete }) {
  if (list.length === 0) return <Empty>No travel cards saved.</Empty>

  const total = list.reduce((s, c) => s + (Number(c.points) || 0), 0)

  return (
    <>
      <div className="card-paper guilloche texture-paper mb-4 rounded-xl px-5 py-4 text-center">
        <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
          Points on hand
        </span>
        <p className="mt-1 font-display text-4xl text-emerald-deep">
          {formatPoints(total)}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {list.map((c) => (
          <div key={c.id} className="card-paper texture-paper overflow-hidden rounded-lg">
            <button
              onClick={() => onEdit(c)}
              className="w-full px-4 py-3.5 text-left"
            >
              <div className="flex items-center gap-3">
                {c.kind === 'hotel' ? (
                  <Bed className="h-4 w-4 shrink-0 text-gold/70" />
                ) : c.kind === 'airline' ? (
                  <Plane className="h-4 w-4 shrink-0 text-gold/70" />
                ) : (
                  <Wallet className="h-4 w-4 shrink-0 text-gold/70" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg leading-tight text-emerald-deep">
                    {c.name || 'Untitled card'}
                  </h3>
                  {c.program && (
                    <p className="truncate font-sans text-[10px] text-navy/75">{c.program}</p>
                  )}
                </div>
                <span className="shrink-0 font-display text-xl text-emerald">
                  {formatPoints(c.points)}
                </span>
              </div>
            </button>
            <button
              onClick={() => onDelete('cards', c)}
              className="w-full border-t border-emerald/10 py-2.5 font-sans text-[9px] tracking-stamp text-burgundy/70 uppercase hover:text-burgundy"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center font-sans text-[10px] leading-relaxed text-cream/60">
        Balances are typed in by hand. Nothing here connects to a real account.
      </p>
    </>
  )
}

function TemplatesView({ list, onEdit, onDelete }) {
  if (list.length === 0) return <Empty>No packing templates yet.</Empty>

  return (
    <div className="flex flex-col gap-2.5">
      {list.map((t) => (
        <div key={t.id} className="card-paper texture-paper overflow-hidden rounded-lg">
          <button
            onClick={() => onEdit(t)}
            className="w-full px-4 py-3.5 text-left"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate font-display text-lg text-emerald-deep">
                {t.name || 'Untitled'}
              </h3>
              <span className="shrink-0 font-sans text-[9px] tracking-stamp text-emerald uppercase">
                {(t.items ?? []).length} items
              </span>
            </div>
            <p className="mt-0.5 truncate font-sans text-[10px] text-navy/75">
              {(t.items ?? []).slice(0, 6).join(' · ') || 'Empty list'}
            </p>
          </button>
          <button
            onClick={() => onDelete('packing', t)}
            className="w-full border-t border-emerald/10 py-2.5 font-sans text-[9px] tracking-stamp text-burgundy/70 uppercase hover:text-burgundy"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  )
}

/* — Editor ——————————————————————————————————— */

function PlanSheet({ kind, item, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState(item)
  const [newItem, setNewItem] = useState('')
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const isNew = draft.created_at === draft.updated_at
  const title = { wishlist: 'Destination', cards: 'Travel Card', packing: 'Packing Template' }[kind]

  const regions = draft.scope === 'international' ? COUNTRIES : US_STATES

  const addItem = () => {
    const v = newItem.trim()
    if (!v) return
    set({ items: [...(draft.items ?? []), v] })
    setNewItem('')
  }

  const canSave =
    kind === 'wishlist' ? draft.destination.trim() : draft.name.trim()

  return (
    <Sheet title={`${isNew ? 'Add' : 'Edit'} ${title}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSave) onSave(draft)
        }}
        className="flex flex-col gap-4"
      >
        {kind === 'wishlist' && (
          <>
            <Segmented
              group="wishscope"
              value={draft.scope}
              onChange={(scope) => set({ scope, region_code: '' })}
              options={[
                ['domestic', 'Domestic'],
                ['international', 'International'],
              ]}
            />
            <Field label="Destination">
              <input
                autoFocus
                className={`${inputClass} font-display text-xl`}
                value={draft.destination}
                onChange={(e) => set({ destination: e.target.value })}
                placeholder="Kyoto"
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
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </Field>
            <Field label="Why">
              <textarea
                rows={3}
                className={`${inputClass} resize-none leading-relaxed`}
                value={draft.notes || ''}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="Cherry blossoms, finally."
              />
            </Field>
          </>
        )}

        {kind === 'cards' && (
          <>
            <Field label="Card name">
              <input
                autoFocus
                className={`${inputClass} font-display text-xl`}
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Delta SkyMiles"
              />
            </Field>
            <Field label="Program">
              <input
                className={inputClass}
                value={draft.program || ''}
                onChange={(e) => set({ program: e.target.value })}
                placeholder="Delta Air Lines"
              />
            </Field>
            <Field label="Type">
              <div className="grid grid-cols-3 gap-2 rounded-md border border-emerald/15 bg-emerald/5 p-1">
                {CARD_KINDS.map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => set({ kind: val })}
                    className={`rounded px-2 py-2 font-sans text-[10px] tracking-stamp uppercase transition-colors ${
                      draft.kind === val
                        ? 'bg-emerald-deep text-gold-light'
                        : 'text-emerald/70'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Points balance">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                className={inputClass}
                value={draft.points ?? ''}
                onChange={(e) => set({ points: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={2}
                className={`${inputClass} resize-none leading-relaxed`}
                value={draft.notes || ''}
                onChange={(e) => set({ notes: e.target.value })}
              />
            </Field>
            <p className="font-sans text-[10px] leading-relaxed text-navy/75">
              Reference only — don't put card numbers or logins here.
            </p>
          </>
        )}

        {kind === 'packing' && (
          <>
            <Field label="Template name">
              <input
                autoFocus
                className={`${inputClass} font-display text-xl`}
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Beach week"
              />
            </Field>
            <Field label="Trip type">
              <select
                className={inputClass}
                value={draft.trip_type}
                onChange={(e) => set({ trip_type: e.target.value })}
              >
                {TRIP_TYPES.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Items">
              <div className="flex flex-col gap-2">
                {(draft.items ?? []).map((it, i) => (
                  <div key={`${it}-${i}`} className="flex items-center gap-2">
                    <span className="flex-1 rounded border border-emerald/15 bg-ivory/60 px-3 py-2 font-sans text-[14px] text-navy-deep">
                      {it}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${it}`}
                      onClick={() =>
                        set({ items: draft.items.filter((_, j) => j !== i) })
                      }
                      className="px-2 font-sans text-[18px] leading-none text-burgundy/70"
                    >
                      ×
                    </button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addItem()
                      }
                    }}
                    placeholder="Add an item…"
                  />
                  <button
                    type="button"
                    onClick={addItem}
                    className="shrink-0 rounded-md border border-emerald/25 px-4 font-sans text-[10px] tracking-stamp text-emerald uppercase"
                  >
                    Add
                  </button>
                </div>
              </div>
            </Field>
          </>
        )}

        <SubmitRow
          label={isNew ? 'Save' : 'Save changes'}
          disabled={!canSave}
          onDelete={isNew ? null : () => onDelete(draft)}
        />
      </form>
    </Sheet>
  )
}
