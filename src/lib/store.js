import { supabase, isConfigured } from './supabase'

/* Offline-first table store.

   localStorage is what the UI renders from, so every screen works with no
   connection. Supabase is the sync target: mutations are written locally first,
   then pushed. Anything that fails to reach the server is parked in a single
   ordered queue and retried later — order matters, because an insert and the
   delete that follows it must replay in the same sequence. */

// v2: queue entries gained a `table` field in Phase 2, so v1 ops can't replay.
const QUEUE_KEY = 'wt.queue.v2'

export const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}
export const write = (key, value) =>
  localStorage.setItem(key, JSON.stringify(value))

// A request that never settles is worse than one that fails: it strands the
// UI. Every network call is raced against a hard ceiling. 12s rather than 6:
// a phone on hotel wifi routinely needs more than 6s for a cold TLS handshake,
// and a spurious timeout parks the write in the queue.
const NET_TIMEOUT = 12000

// The last push failure, surfaced so SyncStatus can say *why* the count is
// stuck instead of spinning silently forever.
export const SYNC_ERROR_KEY = 'wt.sync.lastError'

export const withTimeout = (promise, ms = NET_TIMEOUT) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])

/* — Shared mutation queue ——————————————————————— */

// Every store registers itself here so the queue can reach across tables:
// repairing an orphaned child row requires re-pushing its parent trip.
const registry = new Map()

const enqueue = (op) => write(QUEUE_KEY, [...read(QUEUE_KEY, []), op])

export const queuedIds = () =>
  new Set(read(QUEUE_KEY, []).map((op) => op.id))

/* A queued op carries the row as it was serialised when the change was made.
   That snapshot goes stale: later edits to the same row supersede it, and — the
   reason this exists — a payload built by a buggy older version of the app
   would otherwise replay its bad shape forever, immune to any fix. Rebuild from
   the current cache whenever the row is still there. */
function hydrate(op) {
  if (op.type !== 'upsert') return op
  const store = registry.get(op.table)
  if (!store) return op
  const current = read(store.cacheKey, []).find((r) => r.id === op.id)
  return current ? { ...op, row: store.toRow(current) } : op
}

async function push(op) {
  const live = hydrate(op)
  const q = supabase.from(live.table)
  const { error } =
    live.type === 'delete'
      ? await q.delete().eq('id', live.id)
      : await q.upsert(live.row)
  if (error) throw error
}

/* A child row (food, hotel, photo…) can outlive its parent trip's queue entry:
   if the trip's own insert was ever lost, the server rejects every child with a
   foreign-key violation and the queue jams permanently. Repair it here — push
   the parent trip from the local cache, then retry the child. Returns true if
   the op no longer needs to stay in the queue. */
async function rescueOrphan(op, err) {
  if (op.type !== 'upsert') return false

  // A malformed payload (missing a required column) that hydrate couldn't
  // rebuild means the row is gone from the cache too — there is nothing left
  // to repair it from, and retrying it forever would block the row's queue.
  if (err?.code === '23502') {
    const store = registry.get(op.table)
    const inCache = store && read(store.cacheKey, []).some((r) => r.id === op.id)
    if (!inCache) {
      console.warn('[sync] dropping unrepairable change; no local copy remains', op)
      return true
    }
  }

  if (err?.code !== '23503' || !op.row?.trip_id) return false
  const trips = registry.get('travel_trips')
  if (!trips) return false

  const parent = read(trips.cacheKey, []).find((t) => t.id === op.row.trip_id)
  if (!parent) {
    // The trip is gone locally too — this row can never land anywhere. Drop it
    // rather than blocking every later change forever.
    console.warn('[sync] dropping orphaned change; its trip no longer exists', op)
    return true
  }
  await withTimeout(push({ type: 'upsert', table: 'travel_trips', id: parent.id, row: trips.toRow(parent) }))
  await withTimeout(push(op))
  console.warn('[sync] repaired orphaned change by re-pushing its trip', op.id)
  return true
}

export async function flushQueue() {
  if (!isConfigured || !navigator.onLine) return
  const raw = read(QUEUE_KEY, [])
  if (raw.length === 0) {
    localStorage.removeItem(SYNC_ERROR_KEY)
    return
  }

  // Only the last op per row matters: upserts are rebuilt from the cache by
  // hydrate (so earlier ones are byte-identical), and a delete is terminal.
  // Collapsing keeps the pending count honest — "6 changes" was really one
  // trip saved six times.
  const queue = raw.filter(
    (op, i) => !raw.some((later, j) => j > i && later.id === op.id)
  )

  // Ordering only matters per row — an insert and the delete that follows it
  // must replay in sequence, but one row's failure must not strand every other
  // row's changes behind it. Block by id, not globally.
  const blocked = new Set()
  const stuck = []
  let lastError = null
  for (const op of queue) {
    if (blocked.has(op.id)) {
      stuck.push(op)
      continue
    }
    try {
      await withTimeout(push(op))
    } catch (err) {
      let rescued = false
      try {
        rescued = await rescueOrphan(op, err)
      } catch (repairErr) {
        console.warn('[sync] repair attempt failed', op, repairErr)
      }
      if (!rescued) {
        blocked.add(op.id)
        stuck.push(op)
        lastError = `${op.table}: ${err?.message || 'network error'}`
        console.warn('[sync] failed to push change', op, err)
      }
    }
  }
  write(QUEUE_KEY, stuck)
  if (stuck.length > 0 && lastError) write(SYNC_ERROR_KEY, lastError)
  else localStorage.removeItem(SYNC_ERROR_KEY)
}

async function sync(op) {
  if (!isConfigured) return
  try {
    await withTimeout(push(op))
    await flushQueue()
  } catch (err) {
    console.warn('[sync] change queued after failed push', op, err)
    enqueue(op)
  }
}

/* — Store factory ——————————————————————————————
   `columns` is the whitelist of fields that exist on the server, so client-only
   state never leaks into a request. */

export function createStore({ table, cacheKey, columns, sort, emptyAsNull = [] }) {
  // `emptyAsNull` lists the date/numeric columns where an unfilled field must
  // be sent as null — Postgres rejects '' for those types. Everything else
  // keeps '' as-is: several text columns (destination, name, label…) are NOT
  // NULL, and nulling them made the server reject the whole row, which is how
  // a trip with a blank destination once jammed the sync queue for good.
  const scrub = new Set(emptyAsNull)
  const toRow = (item) => {
    const row = {}
    for (const c of columns) {
      const v = item[c]
      if (v === undefined) continue // omit it; the server default fills it in
      row[c] = v === '' && scrub.has(c) ? null : v
    }
    return row
  }

  registry.set(table, { cacheKey, toRow })

  const order = sort ?? ((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  const loadCache = () => [...read(cacheKey, [])].sort(order)

  async function fetchAll() {
    const cached = loadCache()
    if (!isConfigured || !navigator.onLine) return cached

    let data = null
    try {
      await flushQueue()
      const res = await withTimeout(supabase.from(table).select('*'))
      if (res.error) return cached
      data = res.data
    } catch {
      // A dead network makes supabase-js throw rather than return an error
      // object. The cache is always a valid answer.
      return cached
    }
    if (!data) return cached

    // Pending local edits haven't landed yet — don't let the server copy stomp
    // them when we reconcile.
    const pending = queuedIds()
    const merged = data.filter((row) => !pending.has(row.id))
    for (const id of pending) {
      const local = cached.find((t) => t.id === id)
      if (local) merged.push(local)
    }

    const next = merged.sort(order)
    write(cacheKey, next)
    return next
  }

  async function save(item) {
    const record = { ...item, updated_at: new Date().toISOString() }
    const cached = loadCache()
    const exists = cached.some((t) => t.id === record.id)
    const next = (
      exists ? cached.map((t) => (t.id === record.id ? record : t)) : [...cached, record]
    ).sort(order)

    write(cacheKey, next)
    await sync({ type: 'upsert', table, id: record.id, row: toRow(record) })
    return next
  }

  async function remove(id) {
    const next = loadCache().filter((t) => t.id !== id)
    write(cacheKey, next)
    await sync({ type: 'delete', table, id })
    return next
  }

  // Removing a trip must take its children with it. Postgres does this via
  // ON DELETE CASCADE, but the local cache has no foreign keys.
  async function removeWhere(predicate) {
    const doomed = loadCache().filter(predicate)
    let next = loadCache()
    for (const item of doomed) next = await remove(item.id)
    return next
  }

  return { loadCache, fetchAll, save, remove, removeWhere, table }
}
