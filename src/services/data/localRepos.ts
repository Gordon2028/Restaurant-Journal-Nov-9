import { placeIdFor } from '../../domain/places/placeId'
import type { Place, ShareList, Visit } from '../../domain/types'
import { isSupabaseConfigured } from '../supabase/client'
import { emitDataChange } from './changes'
import { getDb, type OutboxEntry } from './localDb'
import type { EventRepo, ListRepo, PlaceRepo, VisitRepo } from './repos'

type Queued = Pick<OutboxEntry, 'kind' | 'id' | 'op' | 'photoKey'>
const entry = (q: Queued): OutboxEntry => ({ ...q, key: `${q.kind}:${q.id}`, at: Date.now() })

export const placeRepo: PlaceRepo = {
  async upsert(input) {
    const db = await getDb()
    const existing = await db.getFromIndex('places', 'externalId', input.externalId)
    if (existing) return existing
    const place = { ...input, id: input.id ?? (await placeIdFor(input.externalId)) }
    await db.put('places', place)
    return place
  },
  async get(id) {
    return (await getDb()).get('places', id)
  },
  async all() {
    return (await getDb()).getAll('places')
  },
}

export const visitRepo: VisitRepo = {
  async add(visit, photo) {
    const db = await getDb()
    const tx = db.transaction(['visits', 'photos', 'outbox'], 'readwrite')
    if (photo && visit.photoKey) await tx.objectStore('photos').put(photo, visit.photoKey)
    await tx.objectStore('visits').put(visit)
    if (isSupabaseConfigured) await tx.objectStore('outbox').put(entry({ kind: 'visit', id: visit.id, op: 'upsert' }))
    await tx.done
    emitDataChange()
  },
  async update(id, patch) {
    const db = await getDb()
    const tx = db.transaction(['visits', 'outbox'], 'readwrite')
    const current = await tx.objectStore('visits').get(id)
    if (!current) return undefined
    const next = { ...current, ...patch, syncStatus: 'pending' as const }
    await tx.objectStore('visits').put(next)
    if (isSupabaseConfigured) await tx.objectStore('outbox').put(entry({ kind: 'visit', id, op: 'upsert' }))
    await tx.done
    emitDataChange()
    return next
  },
  async get(id) {
    return (await getDb()).get('visits', id)
  },
  async listForUser(userId) {
    const all = await (await getDb()).getAllFromIndex('visits', 'userId', userId)
    return all.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
  },
  async remove(id) {
    const db = await getDb()
    const v = await db.get('visits', id)
    const tx = db.transaction(['visits', 'photos', 'outbox'], 'readwrite')
    await tx.objectStore('visits').delete(id)
    if (v?.photoKey) await tx.objectStore('photos').delete(v.photoKey)
    if (isSupabaseConfigured) await tx.objectStore('outbox').put(entry({ kind: 'visit', id, op: 'delete', photoKey: v?.photoKey }))
    await tx.done
    emitDataChange()
  },
  async getPhoto(key) {
    return (await getDb()).get('photos', key)
  },
}

export const listRepo: ListRepo = {
  async save(list) {
    const db = await getDb()
    const tx = db.transaction(['lists', 'outbox'], 'readwrite')
    await tx.objectStore('lists').put(list)
    if (isSupabaseConfigured) await tx.objectStore('outbox').put(entry({ kind: 'list', id: list.id, op: 'upsert' }))
    await tx.done
    emitDataChange()
  },
  async get(id) {
    return (await getDb()).get('lists', id)
  },
  async getBySlug(slug) {
    return (await getDb()).getFromIndex('lists', 'slug', slug)
  },
  async listForUser(userId) {
    const all = await (await getDb()).getAllFromIndex('lists', 'userId', userId)
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  async remove(id) {
    const db = await getDb()
    const tx = db.transaction(['lists', 'outbox'], 'readwrite')
    await tx.objectStore('lists').delete(id)
    if (isSupabaseConfigured) await tx.objectStore('outbox').put(entry({ kind: 'list', id, op: 'delete' }))
    await tx.done
    emitDataChange()
  },
}

export const eventRepo: EventRepo = {
  async add(event) {
    await (await getDb()).put('events', event)
  },
  async all() {
    return (await getDb()).getAll('events')
  },
}

/**
 * Writes that came FROM the server. They never queue anything to send back, which would loop forever.
 */
export const syncStore = {
  async applyPull(plan: { places: Place[]; visits: Visit[]; lists: ShareList[]; deleteVisitIds: string[]; deleteListIds: string[] }) {
    const db = await getDb()
    const tx = db.transaction(['places', 'visits', 'lists', 'photos'], 'readwrite')
    for (const p of plan.places) {
      const existing = await tx.objectStore('places').index('externalId').get(p.externalId)
      if (!existing) await tx.objectStore('places').put(p)
      else if (existing.id !== p.id) await tx.objectStore('places').put({ ...existing, ...p, id: existing.id })
    }
    for (const v of plan.visits) await tx.objectStore('visits').put(v)
    for (const l of plan.lists) await tx.objectStore('lists').put(l)
    for (const id of plan.deleteVisitIds) {
      const v = await tx.objectStore('visits').get(id)
      if (v?.photoKey) await tx.objectStore('photos').delete(v.photoKey)
      await tx.objectStore('visits').delete(id)
    }
    for (const id of plan.deleteListIds) await tx.objectStore('lists').delete(id)
    await tx.done
  },
  async markVisitSynced(id: string) {
    const db = await getDb()
    const v = await db.get('visits', id)
    if (v && v.syncStatus !== 'synced') await db.put('visits', { ...v, syncStatus: 'synced' })
  },
  async cachePhoto(key: string, blob: Blob) {
    await (await getDb()).put('photos', blob, key)
  },
}

/** Outbox access for the sync engine. */
export const outbox = {
  async all(): Promise<OutboxEntry[]> {
    return (await getDb()).getAll('outbox')
  },
  async keys(): Promise<Set<string>> {
    return new Set(await (await getDb()).getAllKeys('outbox'))
  },
  /** Remove an entry only if it wasn't changed again while we were sending it. */
  async clearIfUnchanged(e: OutboxEntry): Promise<void> {
    const db = await getDb()
    const tx = db.transaction('outbox', 'readwrite')
    const current = await tx.store.get(e.key)
    if (current && current.at === e.at) await tx.store.delete(e.key)
    await tx.done
  },
}
