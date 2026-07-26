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

const enqueue = (op) => write(QUEUE_KEY, [...read(QUEUE_KEY, []), op])

export const queuedIds = () =>
  new Set(read(QUEUE_KEY, []).map((op) => op.id))

async function push(op) {
  const q = supabase.from(op.table)
  const { error } =
    op.type === 'delete'
      ? await q.delete().eq('id', op.id)
      : await q.upsert(op.row)
  if (error) throw error
}

export async function flushQueue() {
  if (!isConfigured || !navigator.onLine) return
  const queue = read(QUEUE_KEY, [])
  if (queue.length === 0) return

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
      blocked.add(op.id)
      stuck.push(op)
      lastError = `${op.table}: ${err?.message || 'network error'}`
      console.warn('[sync] failed to push change', op, err)
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

export function createStore({ table, cacheKey, columns, sort }) {
  // Empty strings must become null: an unfilled date or cost field would
  // otherwise be sent as '' and rejected outright by a `date` or `numeric`
  // column.
  const toRow = (item) =>
    Object.fromEntries(
      columns.map((c) => {
        const v = item[c]
        return [c, v === '' || v === undefined ? null : v]
      })
    )

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
