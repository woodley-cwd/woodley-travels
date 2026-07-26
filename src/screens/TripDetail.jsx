import { motion } from 'framer-motion'
import { forTrip, tripTotals, money } from '../lib/entries'
import { daysUntil, formatRange, tripNights } from '../lib/trips'
import { regionName, flagEmoji } from '../lib/places'
import MediaImage from '../components/MediaImage'
import Postcard from '../components/Postcard'
import TripChecklist from '../components/TripChecklist'
import TravelChat from '../components/TravelChat'
import {
  Back, Pencil, Plus, Plane, Bed, Fork, Mail, Camera, Wallet, Heart, Stamp, Users, Sparkle,
} from '../components/Icons'

const EASE = [0.16, 1, 0.3, 1]

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const rise = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
}

function Section({ icon: Icon, title, count, onAdd, children }) {
  return (
    <motion.section variants={rise} className="mt-7">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 text-gold-light/90" />
        <span className="font-sans text-[9px] tracking-stamp whitespace-nowrap text-gold-light/90 uppercase">
          {title}
          {count > 0 && ` · ${count}`}
        </span>
        <span className="rule-gold h-px flex-1" />
        <button
          type="button"
          onClick={onAdd}
          aria-label={`Add ${title.toLowerCase()}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/30"
        >
          <Plus className="h-3.5 w-3.5 text-gold-light" />
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </motion.section>
  )
}

const Empty = ({ children }) => (
  <p className="rounded-lg border border-dashed border-gold/30 px-4 py-6 text-center font-sans text-[11px] text-cream/70">
    {children}
  </p>
)

export default function TripDetail({
  trip, entries, checklist, templates, onBack, onEditTrip, onAddEntry, onEditEntry,
  onStamp, onSaveCheckItem, onDeleteCheckItem, onApplyTemplate,
}) {
  const flights = forTrip(entries.flights, trip.id)
  const hotels = forTrip(entries.hotels, trip.id)
  const food = forTrip(entries.food, trip.id)
  const postcards = forTrip(entries.postcards, trip.id)
  const photos = forTrip(entries.photos, trip.id)

  const totals = tripTotals({ flights, hotels, food })
  const planning = trip.status === 'planning'
  const countdown = daysUntil(trip.start_date)
  const region = regionName(trip.scope, trip.region_code)
  const nights = tripNights(trip)

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: 16 }}
      className="mx-auto w-full max-w-[520px] px-5 pb-24 safe-t"
    >
      <header className="flex items-center justify-between py-3">
        <button onClick={onBack} aria-label="Back" className="-ml-2 flex h-10 w-10 items-center justify-center text-cream/70">
          <Back className="h-5 w-5" />
        </button>
        <span className="font-sans text-[9px] tracking-stamp text-cream/70 uppercase">
          {planning ? 'Planning' : 'Stamped'}
        </span>
        <button onClick={() => onEditTrip(trip)} aria-label="Edit trip" className="-mr-2 flex h-10 w-10 items-center justify-center text-cream/70">
          <Pencil className="h-5 w-5" />
        </button>
      </header>

      {/* Cover */}
      <motion.div variants={rise} className="card-paper texture-paper overflow-hidden rounded-xl">
        {trip.cover_photo && (
          <MediaImage src={trip.cover_photo} alt={trip.name} className="h-44 w-full object-cover" />
        )}
        <div className="px-5 py-5 text-center">
          <span className="text-2xl leading-none">
            {trip.scope === 'international' ? flagEmoji(trip.region_code) || '🌍' : '🇺🇸'}
          </span>
          <h1 className="mt-1.5 font-display text-3xl leading-tight text-emerald-deep">
            {trip.name}
          </h1>
          <p className="mt-1 font-sans text-[11px] text-navy/75">
            {[trip.destination, region].filter(Boolean).join(' · ')}
          </p>
          <div className="rule-gold mx-auto my-3 h-px w-16" />
          <p className="font-sans text-[10px] tracking-stamp text-emerald uppercase">
            {formatRange(trip.start_date, trip.end_date)}
            {nights > 0 && ` · ${nights} ${nights === 1 ? 'night' : 'nights'}`}
          </p>
          {trip.traveled_with && (
            <p className="mt-2 flex items-center justify-center gap-1.5 font-sans text-[11px] text-navy/75">
              <Users className="h-3.5 w-3.5 text-gold/70" />
              with {trip.traveled_with}
            </p>
          )}
        </div>
      </motion.div>

      {/* Countdown — planning only */}
      {planning && countdown !== null && countdown >= 0 && (
        <motion.div
          variants={rise}
          className="mt-4 rounded-lg border border-gold/20 bg-burgundy/25 px-4 py-3 text-center"
        >
          <span className="font-display text-3xl text-cream">
            {countdown === 0 ? 'Today' : countdown}
          </span>
          {countdown > 0 && (
            <span className="ml-2 font-sans text-[10px] tracking-stamp text-gold-light uppercase">
              {countdown === 1 ? 'day to go' : 'days to go'}
            </span>
          )}
        </motion.div>
      )}

      {/* Checklist — planning only; once stamped there's nothing left to pack */}
      {planning && (
        <motion.div variants={rise} className="mt-4">
          <TripChecklist
            tripId={trip.id}
            items={forTrip(checklist ?? [], trip.id)}
            templates={templates ?? []}
            onSave={onSaveCheckItem}
            onDelete={onDeleteCheckItem}
            onApplyTemplate={(t) => onApplyTemplate(trip, t)}
          />
        </motion.div>
      )}

      {/* Trip-scoped chat — planning only; once stamped there's nothing left
          to plan, and the standalone tab covers everything else */}
      {planning && (
        <motion.div variants={rise} className="mt-7">
          <div className="flex items-center gap-3">
            <Sparkle className="h-4 w-4 shrink-0 text-gold-light/90" />
            <span className="font-sans text-[9px] tracking-stamp whitespace-nowrap text-gold-light/90 uppercase">
              Ask about this trip
            </span>
            <span className="rule-gold h-px flex-1" />
          </div>
          <div className="mt-3">
            <TravelChat
              scope={`trip:${trip.id}`}
              trip={{ ...trip, region }}
              compact
            />
          </div>
        </motion.div>
      )}

      {/* Journal — stamped only */}
      {!planning && trip.journal_note && (
        <motion.div variants={rise} className="card-paper texture-paper mt-4 rounded-xl px-5 py-5">
          <p className="font-display text-[17px] leading-relaxed text-navy-deep italic">
            {trip.journal_note}
          </p>
        </motion.div>
      )}

      {/* Cost totals, auto-calculated from the entries below */}
      {totals.total > 0 && (
        <motion.div variants={rise} className="card-paper guilloche texture-paper mt-4 overflow-hidden rounded-xl px-5 py-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-gold/70" />
            <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
              {planning ? 'Budget so far' : 'What it cost'}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {totals.air > 0 && <Line label="Airfare" value={totals.air} />}
            <Line label="Lodging" value={totals.lodging} />
            <Line label="Food" value={totals.dining} />
            <div className="rule-gold my-1 h-px w-full opacity-60" />
            <div className="flex items-baseline justify-between">
              <span className="font-sans text-[10px] tracking-stamp text-emerald/70 uppercase">Total</span>
              <span className="font-display text-2xl text-emerald-deep">{money(totals.total)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Flights */}
      <Section icon={Plane} title="Flights" count={flights.length} onAdd={() => onAddEntry('flights')}>
        {flights.length === 0 ? (
          <Empty>No flights booked yet.</Empty>
        ) : (
          <div className="flex flex-col gap-2.5">
            {flights.map((f) => (
              <button
                key={f.id}
                onClick={() => onEditEntry('flights', f)}
                className="card-paper texture-paper w-full rounded-lg px-4 py-3 text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-sans text-[10px] tracking-stamp text-emerald uppercase">
                    {[f.airline, f.flight_number].filter(Boolean).join(' · ')}
                  </span>
                  {Number(f.cost_usd) > 0 && (
                    <span className="shrink-0 font-sans text-[12px] text-navy/75">
                      {money(Number(f.cost_usd))}
                    </span>
                  )}
                </div>

                {/* Boarding-pass line: codes big, times underneath. */}
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-2xl leading-none text-emerald-deep">
                      {f.origin || '—'}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] text-navy/75">{f.depart_time || ''}</p>
                  </div>
                  <span aria-hidden className="rule-gold h-px flex-1 opacity-70" />
                  <Plane className="h-3.5 w-3.5 shrink-0 text-gold/70" />
                  <span aria-hidden className="rule-gold h-px flex-1 opacity-70" />
                  <div className="min-w-0 text-right">
                    <p className="font-display text-2xl leading-none text-emerald-deep">
                      {f.destination || '—'}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] text-navy/75">{f.arrive_time || ''}</p>
                  </div>
                </div>

                <p className="mt-1.5 font-sans text-[10px] text-navy/75">
                  {[
                    formatRange(f.depart_date, f.arrive_date !== f.depart_date ? f.arrive_date : ''),
                    f.seat && `Seat ${f.seat}`,
                    f.confirmation,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Hotels */}
      <Section icon={Bed} title="Hotels" count={hotels.length} onAdd={() => onAddEntry('hotels')}>
        {hotels.length === 0 ? (
          <Empty>No stays logged yet.</Empty>
        ) : (
          <div className="flex flex-col gap-2.5">
            {hotels.map((h) => (
              <button
                key={h.id}
                onClick={() => onEditEntry('hotels', h)}
                className="card-paper texture-paper w-full rounded-lg px-4 py-3 text-left"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="truncate font-display text-lg text-emerald-deep">{h.name}</h3>
                  {Number(h.cost_usd) > 0 && (
                    <span className="shrink-0 font-sans text-[12px] text-navy/75">
                      {money(Number(h.cost_usd))}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-sans text-[10px] text-navy/75">
                  {formatRange(h.check_in, h.check_out)}
                  {h.confirmation && ` · ${h.confirmation}`}
                </p>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Food */}
      <Section icon={Fork} title="Food" count={food.length} onAdd={() => onAddEntry('food')}>
        {food.length === 0 ? (
          <Empty>Nothing eaten worth remembering — yet.</Empty>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {food.map((f) => (
              <button
                key={f.id}
                onClick={() => onEditEntry('food', f)}
                className="card-paper texture-paper overflow-hidden rounded-lg text-left"
              >
                <div className="relative">
                  <MediaImage src={f.photo_url} alt={f.dish} className="aspect-square w-full object-cover" />
                  {f.again && (
                    <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-burgundy/85">
                      <Heart className="h-3.5 w-3.5 text-cream" />
                    </span>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <h3 className="truncate font-display text-base leading-tight text-emerald-deep">{f.dish}</h3>
                  <p className="truncate font-sans text-[10px] text-navy/75">
                    {[f.restaurant, f.city].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {Number(f.cost_usd) > 0 && (
                    <p className="mt-0.5 font-sans text-[10px] text-navy/75">
                      {money(Number(f.cost_usd))}
                      {f.cost_local && f.currency && ` · ${f.cost_local} ${f.currency}`}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* Postcards */}
      <Section icon={Mail} title="Postcards" count={postcards.length} onAdd={() => onAddEntry('postcards')}>
        {postcards.length === 0 ? (
          <Empty>No postcards yet. Tap one to flip it over.</Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {postcards.map((p) => (
              <Postcard key={p.id} postcard={p} onEdit={(pc) => onEditEntry('postcards', pc)} />
            ))}
          </div>
        )}
      </Section>

      {/* Photos */}
      <Section icon={Camera} title="Photos" count={photos.length} onAdd={() => onAddEntry('photos')}>
        {photos.length === 0 ? (
          <Empty>No photos in the gallery.</Empty>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => onEditEntry('photos', p)}
                className="overflow-hidden rounded-md"
                aria-label={p.caption || 'Photo'}
              >
                <MediaImage src={p.url} alt={p.caption || ''} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </Section>

      {/* The signature transition */}
      {planning && (
        <motion.button
          variants={rise}
          onClick={() => onStamp(trip)}
          whileTap={{ scale: 0.97 }}
          className="mt-9 flex w-full items-center justify-center gap-2.5 rounded-md border border-gold/40 bg-emerald py-4 font-sans text-[10px] tracking-stamp text-gold-light uppercase"
        >
          <Stamp className="h-4 w-4" />
          Mark as stamped
        </motion.button>
      )}
    </motion.div>
  )
}

function Line({ label, value }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-sans text-[11px] text-navy/75">{label}</span>
      <span className="font-sans text-[13px] text-navy-deep">{money(value)}</span>
    </div>
  )
}
