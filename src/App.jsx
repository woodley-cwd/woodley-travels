import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import PassportCover from './components/PassportCover'
import StampAnimation from './components/StampAnimation'
import BadgeCelebration from './components/BadgeCelebration'
import EntrySheet from './components/EntrySheet'
import TabBar from './components/TabBar'
import PinScreen from './screens/PinScreen'
import HomeScreen from './screens/HomeScreen'
import MapsScreen from './screens/MapsScreen'
import SearchScreen from './screens/SearchScreen'
import BadgesScreen from './screens/BadgesScreen'
import TripDetail from './screens/TripDetail'
import TripForm from './screens/TripForm'
import { fetchTrips, saveTrip, deleteTrip, loadCache, emptyTrip, flushQueue } from './lib/trips'
import { STORES, emptyHotel, emptyFood, emptyPostcard, emptyPhoto } from './lib/entries'
import { evaluateBadges } from './lib/badges'
import { flushMedia } from './lib/media'
import PlanScreen from './screens/PlanScreen'
import ChatScreen from './screens/ChatScreen'
import SettingsScreen from './screens/SettingsScreen'
import DocsScreen from './screens/DocsScreen'
import SyncStatus from './components/SyncStatus'
import { PLANNING_STORES, emptyChecklistItem } from './lib/planning'
import { dueReminders, notifyDue } from './lib/reminders'

const KINDS = ['hotels', 'food', 'postcards', 'photos']

const blankEntry = {
  hotels: emptyHotel,
  food: emptyFood,
  postcards: emptyPostcard,
  photos: emptyPhoto,
}

// Which fields on each kind hold a media ref — used to repoint rows after a
// deferred upload finally lands.
const MEDIA_FIELDS = {
  hotels: [],
  food: ['photo_url'],
  postcards: ['front_url', 'back_url'],
  photos: ['url'],
}

const loadEntries = () =>
  Object.fromEntries(KINDS.map((k) => [k, STORES[k].loadCache()]))

const PLAN_KINDS = ['cards', 'wishlist', 'templates', 'checklist']

// The Plan screen names its tabs after the thing, not the table.
const PLAN_STORE_FOR = { wishlist: 'wishlist', cards: 'cards', packing: 'templates' }

const loadPlanning = () =>
  Object.fromEntries(PLAN_KINDS.map((k) => [k, PLANNING_STORES[k].loadCache()]))

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)

  const [trips, setTrips] = useState(loadCache)
  const [entries, setEntries] = useState(loadEntries)
  const [loading, setLoading] = useState(() => loadCache().length === 0)

  const [tab, setTab] = useState('home')
  const [openTripId, setOpenTripId] = useState(null)
  const [editingTrip, setEditingTrip] = useState(null)
  const [sheet, setSheet] = useState(null) // { kind, entry }
  const [stamping, setStamping] = useState(null)
  const [badgeQueue, setBadgeQueue] = useState([])
  const [badges, setBadges] = useState([])
  const [planning, setPlanning] = useState(loadPlanning)
  const [showSettings, setShowSettings] = useState(false)
  const [showDocs, setShowDocs] = useState(false)

  const openTrip = trips.find((t) => t.id === openTripId) ?? null

  /* Badges are derived, so they recompute whenever the data does. This runs in
     an effect rather than a memo because evaluating also persists earned dates.

     Queueing isn't gated on the cover being open — badges crossed while the
     app was closed still deserve their moment. The celebration only renders
     inside the opened-passport block, so a queued badge simply waits. */
  useEffect(() => {
    const { badges: list, freshlyEarned } = evaluateBadges(trips, entries)
    setBadges(list)
    if (freshlyEarned.length > 0) {
      setBadgeQueue((q) => [
        ...q,
        ...freshlyEarned.filter((b) => !q.some((x) => x.id === b.id)),
      ])
    }
  }, [trips, entries])

  const refreshEntries = useCallback(async () => {
    const rows = await Promise.all(KINDS.map((k) => STORES[k].fetchAll()))
    setEntries(Object.fromEntries(KINDS.map((k, i) => [k, rows[i]])))
  }, [])

  const refreshPlanning = useCallback(async () => {
    const rows = await Promise.all(PLAN_KINDS.map((k) => PLANNING_STORES[k].fetchAll()))
    setPlanning(Object.fromEntries(PLAN_KINDS.map((k, i) => [k, rows[i]])))
  }, [])

  // Repoint any row still referencing a local-only image once it uploads.
  const rewriteMedia = useCallback(async (oldRef, newUrl) => {
    for (const kind of KINDS) {
      const fields = MEDIA_FIELDS[kind]
      if (fields.length === 0) continue
      for (const row of STORES[kind].loadCache()) {
        const hit = fields.filter((f) => row[f] === oldRef)
        if (hit.length === 0) continue
        await STORES[kind].save({
          ...row,
          ...Object.fromEntries(hit.map((f) => [f, newUrl])),
        })
      }
    }
    for (const trip of loadCache()) {
      if (trip.cover_photo === oldRef) await saveTrip({ ...trip, cover_photo: newUrl })
    }
  }, [])

  // Pull once the passport is open, so the animation isn't competing with the
  // network for the main thread.
  useEffect(() => {
    if (!coverOpen) return
    let alive = true
    ;(async () => {
      const rows = await fetchTrips()
      if (!alive) return
      setTrips(rows)
      setLoading(false)
      await refreshEntries()
      await refreshPlanning()
      await flushMedia(rewriteMedia)
      if (alive) await refreshEntries()
    })()
    return () => {
      alive = false
    }
  }, [coverOpen, refreshEntries, refreshPlanning, rewriteMedia])

  /* Reminders are recomputed from current data, then raised as system
     notifications if that was allowed. The in-app banner renders regardless. */
  const reminders = dueReminders(trips, planning.checklist ?? [])

  useEffect(() => {
    if (!coverOpen || reminders.length === 0) return
    notifyDue(reminders)
    // Only the ids matter — re-running on every render would spam the ledger.
  }, [coverOpen, reminders.map((r) => r.id).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Drain anything written while offline.
  useEffect(() => {
    const onOnline = async () => {
      await flushQueue()
      setTrips(await fetchTrips())
      await flushMedia(rewriteMedia)
      await refreshEntries()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [refreshEntries, rewriteMedia])

  // The 'online' event only fires on a connectivity *transition* — a write
  // that failed while nominally online would otherwise sit queued until the
  // next full app open. Retry on a timer instead; flushQueue is a no-op when
  // the queue is empty.
  useEffect(() => {
    const timer = setInterval(() => {
      flushQueue().then(() => flushMedia(rewriteMedia))
    }, 20_000)
    return () => clearInterval(timer)
  }, [rewriteMedia])

  // Coming back to the tab (or PWA) after using it on another device: pull
  // fresh data so the two screens converge without a manual reload.
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      setTrips(await fetchTrips())
      await refreshEntries()
      await refreshPlanning()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refreshEntries, refreshPlanning])

  /* — Trips ————————————————————————————————— */

  const handleSaveTrip = async (trip) => {
    setTrips(await saveTrip(trip))
    setEditingTrip(null)
  }

  const handleDeleteTrip = async (id) => {
    // Postgres cascades; the local cache has no foreign keys, so clear the
    // children here too or they linger as orphans.
    for (const kind of KINDS) await STORES[kind].removeWhere((e) => e.trip_id === id)
    setEntries(loadEntries())
    setTrips(await deleteTrip(id))
    setEditingTrip(null)
    setOpenTripId(null)
  }

  const handleStamp = async (trip) => {
    setStamping(trip)
    setTrips(await saveTrip({ ...trip, status: 'completed' }))
  }

  /* — Entries ———————————————————————————————— */

  const handleSaveEntry = async (kind, entry) => {
    const next = await STORES[kind].save(entry)
    setEntries((e) => ({ ...e, [kind]: next }))
    setSheet(null)
  }

  const handleDeleteEntry = async (kind, entry) => {
    const next = await STORES[kind].remove(entry.id)
    setEntries((e) => ({ ...e, [kind]: next }))
    setSheet(null)
  }

  /* — Planning ——————————————————————————————— */

  const savePlanning = async (storeKey, item) => {
    const next = await PLANNING_STORES[storeKey].save(item)
    setPlanning((p) => ({ ...p, [storeKey]: next }))
  }

  const handleSavePlan = (kind, item) => savePlanning(PLAN_STORE_FOR[kind], item)

  const handleDeletePlan = async (kind, item) => {
    const storeKey = PLAN_STORE_FOR[kind]
    const next = await PLANNING_STORES[storeKey].remove(item.id)
    setPlanning((p) => ({ ...p, [storeKey]: next }))
  }

  const handleSaveCheckItem = (item) => savePlanning('checklist', item)

  const handleDeleteCheckItem = async (item) => {
    const next = await PLANNING_STORES.checklist.remove(item.id)
    setPlanning((p) => ({ ...p, checklist: next }))
  }

  /* Applying a template copies its items in rather than linking to it, so
     editing the template later never rewrites a trip you've already packed
     for. Items already on the list aren't duplicated. */
  const handleApplyTemplate = async (trip, template) => {
    const existing = (planning.checklist ?? []).filter((i) => i.trip_id === trip.id)
    const have = new Set(
      existing.filter((i) => i.category === 'packing').map((i) => i.label.toLowerCase())
    )
    let sort = existing.filter((i) => i.category === 'packing').length
    let next = planning.checklist

    for (const label of template.items ?? []) {
      if (have.has(label.toLowerCase())) continue
      next = await PLANNING_STORES.checklist.save({
        ...emptyChecklistItem(trip.id, 'packing', sort++),
        label,
      })
    }
    setPlanning((p) => ({ ...p, checklist: next }))
  }

  // A wishlist entry becomes a real trip, and stops being a someday.
  const handlePromoteWish = async (wish) => {
    setEditingTrip({
      ...emptyTrip(),
      name: wish.destination,
      destination: wish.destination,
      scope: wish.scope,
      region_code: wish.region_code || '',
      journal_note: wish.notes || '',
    })
  }

  const openTripFrom = (trip) => {
    setOpenTripId(trip.id)
    setTab('home')
  }

  if (!unlocked) return <PinScreen onUnlock={() => setUnlocked(true)} />

  // A trip page or the trip editor takes over the whole screen, tab bar included.
  const inDetail = Boolean(editingTrip || openTrip)

  return (
    <>
      <AnimatePresence>
        {!coverOpen && <PassportCover onOpened={() => setCoverOpen(true)} />}
      </AnimatePresence>

      {coverOpen && (
        <>
          <AnimatePresence mode="wait">
            {editingTrip ? (
              <TripForm
                key="form"
                trip={editingTrip}
                onSave={handleSaveTrip}
                onDelete={handleDeleteTrip}
                onClose={() => setEditingTrip(null)}
              />
            ) : openTrip ? (
              <TripDetail
                key={`trip-${openTrip.id}`}
                trip={openTrip}
                entries={entries}
                checklist={planning.checklist}
                templates={planning.templates}
                onSaveCheckItem={handleSaveCheckItem}
                onDeleteCheckItem={handleDeleteCheckItem}
                onApplyTemplate={handleApplyTemplate}
                onBack={() => setOpenTripId(null)}
                onEditTrip={setEditingTrip}
                onAddEntry={(kind) =>
                  setSheet({ kind, entry: blankEntry[kind](openTrip.id) })
                }
                onEditEntry={(kind, entry) => setSheet({ kind, entry })}
                onStamp={handleStamp}
              />
            ) : tab === 'maps' ? (
              <MapsScreen key="maps" trips={trips} onOpen={openTripFrom} />
            ) : tab === 'search' ? (
              <SearchScreen
                key="search"
                trips={trips}
                entries={entries}
                onOpen={openTripFrom}
              />
            ) : tab === 'badges' ? (
              <BadgesScreen key="badges" badges={badges} />
            ) : tab === 'chat' ? (
              <ChatScreen key="chat" />
            ) : tab === 'plan' ? (
              <PlanScreen
                key="plan"
                wishlist={planning.wishlist ?? []}
                cards={planning.cards ?? []}
                templates={planning.templates ?? []}
                onSave={handleSavePlan}
                onDelete={handleDeletePlan}
                onPromote={handlePromoteWish}
              />
            ) : (
              <HomeScreen
                key="home"
                trips={trips}
                loading={loading}
                checklist={planning.checklist ?? []}
                reminders={reminders}
                onAdd={() => setEditingTrip(emptyTrip())}
                onOpen={openTripFrom}
                onSettings={() => setShowSettings(true)}
              />
            )}
          </AnimatePresence>

          {!inDetail && !showSettings && !showDocs && (
            <TabBar active={tab} onChange={setTab} />
          )}

          <SyncStatus />

          <AnimatePresence>
            {showSettings && !showDocs && (
              <div className="fixed inset-0 z-40 overflow-y-auto bg-emerald-deep">
                <SettingsScreen
                  onClose={() => setShowSettings(false)}
                  onOpenDocs={() => setShowDocs(true)}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Docs sit above settings and never render alongside it, so an
              unlocked vault can't be left visible behind another screen. */}
          <AnimatePresence>
            {showDocs && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-emerald-deep">
                <DocsScreen onClose={() => setShowDocs(false)} />
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {sheet && (
              <EntrySheet
                kind={sheet.kind}
                entry={sheet.entry}
                trip={openTrip ?? {}}
                onSave={handleSaveEntry}
                onDelete={handleDeleteEntry}
                onClose={() => setSheet(null)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {stamping && (
              <StampAnimation trip={stamping} onDone={() => setStamping(null)} />
            )}
          </AnimatePresence>

          {/* Badges wait their turn behind the stamp, so the two never overlap */}
          <AnimatePresence>
            {!stamping && badgeQueue.length > 0 && (
              <BadgeCelebration
                key={badgeQueue[0].id}
                badge={badgeQueue[0]}
                onDone={() => setBadgeQueue((q) => q.slice(1))}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}
