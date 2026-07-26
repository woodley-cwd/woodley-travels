import { motion } from 'framer-motion'
import { computeStats, daysUntil, formatRange, onThisDay } from '../lib/trips'
import { regionName, flagEmoji } from '../lib/places'
import { Plus, Globe, Pin, Users, Moon, Compass, Clock, Bell, Gear } from '../components/Icons'
import { checklistProgress } from '../lib/planning'

const EASE = [0.16, 1, 0.3, 1]

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

function Stat({ value, label, one, icon: Icon }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1 py-4">
      <Icon className="h-4 w-4 text-gold/60" />
      <span className="font-display text-4xl leading-none text-emerald-deep">
        {value}
      </span>
      <span className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
        {value === 1 ? one : label}
      </span>
    </div>
  )
}

function TripRow({ trip, onOpen }) {
  const region = regionName(trip.scope, trip.region_code)
  const stamped = trip.status === 'completed'

  return (
    <motion.button
      variants={rise}
      whileTap={{ scale: 0.985 }}
      onClick={() => onOpen(trip)}
      className="card-paper texture-paper relative w-full overflow-hidden rounded-lg px-4 py-3.5 text-left"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl leading-none">
          {trip.scope === 'international' ? flagEmoji(trip.region_code) || '🌍' : '🇺🇸'}
        </span>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-xl leading-tight text-emerald-deep">
            {trip.name || 'Untitled trip'}
          </h3>
          <p className="truncate font-sans text-[11px] text-navy/75">
            {[trip.destination, region].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-sans text-[10px] text-navy/75">
            {formatRange(trip.start_date, trip.end_date)}
          </p>
          <span
            className={`mt-1 inline-block font-sans text-[8px] tracking-stamp uppercase ${
              stamped ? 'text-emerald/70' : 'text-burgundy/70'
            }`}
          >
            {stamped ? 'Stamped' : 'Planning'}
          </span>
        </div>
      </div>

      {stamped && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-3 -bottom-3 rotate-[-14deg] font-sans text-[7px] tracking-stamp text-emerald/15 uppercase"
          style={{ border: '1.5px solid currentColor', padding: '10px 14px', borderRadius: 4 }}
        >
          Entered
        </span>
      )}
    </motion.button>
  )
}

export default function HomeScreen({
  trips, loading, checklist = [], reminders = [], onAdd, onOpen, onSettings,
}) {
  const stats = computeStats(trips)
  const countdown = daysUntil(stats.upNext?.start_date)
  const flashback = onThisDay(trips)[0]
  const upNextProgress = checklistProgress(
    stats.upNext ? checklist.filter((i) => i.trip_id === stats.upNext.id) : []
  )

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-[520px] px-5 pb-28 safe-t"
    >
      <motion.header variants={rise} className="relative pt-3 pb-6 text-center">
        {onSettings && (
          <button
            onClick={onSettings}
            aria-label="Settings"
            className="absolute top-1 right-0 flex h-10 w-10 items-center justify-center text-cream/60"
          >
            <Gear className="h-5 w-5" />
          </button>
        )}
        <h1 className="foil font-display text-3xl leading-none">Woodley Travels</h1>
        <div className="rule-gold mx-auto mt-2.5 h-px w-24" />
        <p className="mt-2.5 font-sans text-[9px] tracking-stamp text-cream/70 uppercase">
          {stats.trips} {stats.trips === 1 ? 'Entry' : 'Entries'} · {stats.nights} Nights
        </p>
      </motion.header>

      {/* Passport data page — the headline stats */}
      <motion.section
        variants={rise}
        className="card-paper guilloche texture-paper overflow-hidden rounded-xl"
      >
        <div className="flex divide-x divide-emerald/10">
          <Stat value={stats.states} label="States" one="State" icon={Pin} />
          <Stat value={stats.countries} label="Countries" one="Country" icon={Globe} />
          <Stat value={stats.nights} label="Nights" one="Night" icon={Moon} />
        </div>
      </motion.section>

      {/* Reminders — computed on open; see lib/reminders.js on why not push */}
      {reminders.length > 0 && (
        <motion.section variants={rise} className="mt-5 flex flex-col gap-2">
          {reminders.slice(0, 3).map((r) => (
            <button
              key={r.id}
              onClick={() => onOpen(r.trip)}
              className="flex w-full items-center gap-3 rounded-lg border border-gold/35 bg-gold/10 px-4 py-3 text-left"
            >
              <Bell className="h-4 w-4 shrink-0 text-gold-light" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-[12px] text-cream">{r.title}</p>
                <p className="truncate font-sans text-[10px] text-cream/75">{r.body}</p>
              </div>
            </button>
          ))}
        </motion.section>
      )}

      {/* On this day — only when there's genuinely an anniversary today */}
      {flashback && (
        <motion.section variants={rise} className="mt-7">
          <SectionLabel>On This Day</SectionLabel>
          <button
            onClick={() => onOpen(flashback.trip)}
            className="card-paper texture-paper mt-2.5 w-full overflow-hidden rounded-lg text-left"
          >
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Clock className="h-4 w-4 shrink-0 text-gold/70" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[9px] tracking-stamp text-emerald uppercase">
                  {flashback.yearsAgo} {flashback.yearsAgo === 1 ? 'year' : 'years'} ago today
                </p>
                <h3 className="truncate font-display text-xl leading-tight text-emerald-deep">
                  {flashback.trip.name}
                </h3>
                <p className="truncate font-sans text-[10px] text-navy/75">
                  {[
                    flashback.trip.destination,
                    regionName(flashback.trip.scope, flashback.trip.region_code),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            </div>
          </button>
        </motion.section>
      )}

      {/* Up next */}
      {stats.upNext && (
        <motion.section variants={rise} className="mt-7">
          <SectionLabel>Up Next</SectionLabel>
          <button
            onClick={() => onOpen(stats.upNext)}
            className="mt-2.5 w-full rounded-lg border border-gold/20 bg-burgundy/25 px-4 py-4 text-left backdrop-blur-sm"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="truncate font-display text-2xl text-cream">
                {stats.upNext.name || 'Untitled trip'}
              </h3>
              {countdown !== null && countdown >= 0 && (
                <span className="shrink-0 font-sans text-[10px] tracking-stamp text-gold-light uppercase">
                  {countdown === 0 ? 'Today' : `${countdown} ${countdown === 1 ? 'day' : 'days'}`}
                </span>
              )}
            </div>
            <p className="mt-1 font-sans text-[11px] text-cream/75">
              {[
                stats.upNext.destination,
                regionName(stats.upNext.scope, stats.upNext.region_code),
              ]
                .filter(Boolean)
                .join(' · ')}
              {stats.upNext.traveled_with ? ` · with ${stats.upNext.traveled_with}` : ''}
            </p>

            {/* Booked / packed at a glance */}
            {upNextProgress.all.total > 0 && (
              <div className="mt-3 flex gap-4">
                {[
                  ['Booked', upNextProgress.booking],
                  ['Packed', upNextProgress.packing],
                ]
                  .filter(([, p]) => p.total > 0)
                  .map(([label, p]) => (
                    <div key={label} className="flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-sans text-[9px] tracking-stamp text-cream/80 uppercase">
                          {label}
                        </span>
                        <span className="font-sans text-[10px] text-gold-light">
                          {p.done}/{p.total}
                        </span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-cream/20">
                        <motion.div
                          className="h-full rounded-full bg-gold"
                          initial={{ width: 0 }}
                          animate={{ width: `${(p.done / p.total) * 100}%` }}
                          transition={{ duration: 0.7, ease: EASE }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </button>
        </motion.section>
      )}

      {/* Recently stamped */}
      {stats.recent.length > 0 && (
        <motion.section variants={rise} className="mt-7">
          <SectionLabel>Recently Stamped</SectionLabel>
          <div className="mt-2.5 flex gap-3 overflow-x-auto pb-1">
            {stats.recent.map((trip) => (
              <button
                key={trip.id}
                onClick={() => onOpen(trip)}
                className="card-paper texture-paper w-32 shrink-0 rounded-lg px-3 py-3 text-left"
              >
                <span className="text-lg leading-none">
                  {trip.scope === 'international'
                    ? flagEmoji(trip.region_code) || '🌍'
                    : '🇺🇸'}
                </span>
                <h4 className="mt-1.5 truncate font-display text-base leading-tight text-emerald-deep">
                  {trip.name || 'Untitled'}
                </h4>
                <p className="mt-0.5 truncate font-sans text-[9px] text-navy/75">
                  {formatRange(trip.start_date, trip.end_date)}
                </p>
              </button>
            ))}
          </div>
        </motion.section>
      )}

      {/* All trips */}
      <motion.section variants={rise} className="mt-7">
        <SectionLabel>All Trips</SectionLabel>

        {loading ? (
          <div className="flex justify-center py-12">
            <Compass className="animate-compass h-7 w-7 text-gold/50" />
          </div>
        ) : trips.length === 0 ? (
          <div className="mt-2.5 rounded-lg border border-dashed border-gold/25 px-6 py-12 text-center">
            <Globe className="mx-auto h-7 w-7 text-gold/70" />
            <p className="mt-3 font-display text-xl text-cream/80">
              No stamps yet
            </p>
            <p className="mt-1 font-sans text-[11px] text-cream/70">
              Add your first trip to open the book.
            </p>
          </div>
        ) : (
          <motion.div variants={stagger} className="mt-2.5 flex flex-col gap-2.5">
            {trips.map((trip) => (
              <TripRow key={trip.id} trip={trip} onOpen={onOpen} />
            ))}
          </motion.div>
        )}
      </motion.section>

      {/* Add */}
      <motion.button
        onClick={onAdd}
        whileTap={{ scale: 0.92 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.5, ease: EASE }}
        aria-label="Add a trip"
        className="fixed right-5 bottom-7 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-emerald shadow-[0_10px_28px_-8px_rgba(0,0,0,0.65)]"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 8rem)' }}
      >
        <Plus className="h-6 w-6 text-gold-light" />
      </motion.button>
    </motion.div>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-sans text-[9px] tracking-stamp whitespace-nowrap text-gold-light/90 uppercase">
        {children}
      </span>
      <span className="rule-gold h-px flex-1" />
    </div>
  )
}
