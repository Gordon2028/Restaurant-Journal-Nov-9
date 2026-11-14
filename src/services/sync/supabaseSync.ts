import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '../../domain/types'
import { emitRemoteChange } from '../data/changes'
import type { OutboxEntry } from '../data/localDb'
import { listRepo, outbox, placeRepo, syncStore, visitRepo } from '../data/localRepos'
import { requireSupabase } from '../supabase/client'
import type { Database } from '../supabase/database.types'
import { listToRow, photoPath, placeToRow, rowToList, rowToPlace, rowToVisit, visitToRow, type ListRow, type PlaceRow, type VisitRow } from './mappers'
import { planPull } from './planPull'
import type { SyncAdapter, SyncResult } from './SyncAdapter'

export const PHOTO_BUCKET = 'visit-photos'
type Client = SupabaseClient<Database>
type ErrorLike = { message: string } | null

const isNetworkError = (e: { message: string }) => !navigator.onLine || /failed to fetch|network|load failed|fetch/i.test(e.message)

function check(error: ErrorLike): void {
  if (error) throw Object.assign(new Error(error.message), { network: isNetworkError(error) })
}

/** Send one queued change. Throws on failure (the entry stays queued). */
async function push(sb: Client, userId: string, e: OutboxEntry): Promise<void> {
  if (e.kind === 'visit' && e.op === 'upsert') {
    const v = await visitRepo.get(e.id)
    if (!v) return // deleted again before we got to send it
    const place = await placeRepo.get(v.placeId)
    if (place) check((await sb.from('places').upsert(placeToRow(place), { onConflict: 'id', ignoreDuplicates: true })).error)
    if (v.photoKey) {
      const blob = await visitRepo.getPhoto(v.photoKey)
      if (blob) {
        const { error } = await sb.storage.from(PHOTO_BUCKET).upload(photoPath(userId, v.photoKey), blob, { contentType: 'image/jpeg', upsert: false })
        if (error && !/already exists|duplicate/i.test(error.message)) check(error)
      }
    }
    check((await sb.from('visits').upsert(visitToRow(v, userId), { onConflict: 'id' })).error)
    await syncStore.markVisitSynced(v.id)
  } else if (e.kind === 'visit') {
    check((await sb.from('visits').delete().eq('id', e.id)).error)
    if (e.photoKey) await sb.storage.from(PHOTO_BUCKET).remove([photoPath(userId, e.photoKey)])
  } else if (e.op === 'upsert') {
    const l = await listRepo.get(e.id)
    if (!l) return
    check((await sb.from('lists').upsert(listToRow(l, userId), { onConflict: 'id' })).error)
    check((await sb.rpc('save_list_items', { p_list_id: l.id, p_visit_ids: l.visitIds })).error)
  } else {
    check((await sb.from('lists').delete().eq('id', e.id)).error)
  }
}

// Visits before the lists that contain them; deletions last.
const rank = (e: OutboxEntry) => (e.op === 'upsert' ? (e.kind === 'visit' ? 0 : 1) : e.kind === 'list' ? 2 : 3)

async function flush(sb: Client, userId: string): Promise<SyncResult> {
  const entries = (await outbox.all()).sort((a, b) => rank(a) - rank(b) || a.at - b.at)
  const result: SyncResult = { failed: 0, offline: false, error: '' }
  for (const e of entries) {
    try {
      await push(sb, userId, e)
      await outbox.clearIfUnchanged(e)
    } catch (err) {
      result.failed++
      const msg = err instanceof Error ? err.message : 'Sync failed'
      if (err instanceof Error && (err as Error & { network?: boolean }).network) {
        result.offline = true
        result.error = 'Offline'
        break // no point trying the rest
      }
      result.error ||= msg
    }
  }
  return result
}

async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: ErrorLike }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    check(error)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

async function pull(sb: Client, userId: string): Promise<void> {
  const [visitRows, listRows, itemRows] = await Promise.all([
    fetchAll<VisitRow & { place: PlaceRow | null }>((a, b) => sb.from('visits').select('*, place:places(*)').order('created_at').range(a, b)),
    fetchAll<ListRow>((a, b) => sb.from('lists').select('*').order('created_at').range(a, b)),
    fetchAll<{ list_id: string; visit_id: string; position: number }>((a, b) => sb.from('list_items').select('*').order('list_id').order('position').range(a, b)),
  ])
  const itemsByList = new Map<string, string[]>()
  for (const it of itemRows) itemsByList.set(it.list_id, [...(itemsByList.get(it.list_id) ?? []), it.visit_id])

  const remote = {
    visits: visitRows.map(rowToVisit),
    places: visitRows.flatMap((r) => (r.place ? [rowToPlace(r.place)] : [])),
    lists: listRows.map((r) => rowToList(r, itemsByList.get(r.id) ?? [])),
  }
  const [localVisits, localLists, pending] = await Promise.all([visitRepo.listForUser(userId), listRepo.listForUser(userId), outbox.keys()])
  const plan = planPull({ visits: localVisits, lists: localLists }, remote, pending)
  const nothing = !plan.putVisits.length && !plan.putLists.length && !plan.deleteVisitIds.length && !plan.deleteListIds.length
  if (nothing && !plan.putPlaces.length) return
  await syncStore.applyPull({ places: plan.putPlaces, visits: plan.putVisits, lists: plan.putLists, deleteVisitIds: plan.deleteVisitIds, deleteListIds: plan.deleteListIds })
  if (!nothing) emitRemoteChange()
}

const profilesEnsured = new Set<string>()
async function ensureProfile(sb: Client, user: Profile): Promise<void> {
  if (profilesEnsured.has(user.id)) return
  check((await sb.from('profiles').upsert({ id: user.id, display_name: user.displayName.slice(0, 80) }, { onConflict: 'id', ignoreDuplicates: true })).error)
  profilesEnsured.add(user.id)
}

export const supabaseSync: SyncAdapter = {
  pendingCount: async () => (await outbox.all()).length,
  async sync(user) {
    const sb = requireSupabase()
    try {
      await ensureProfile(sb, user)
      const result = await flush(sb, user.id)
      if (!result.offline) await pull(sb, user.id)
      return result
    } catch (err) {
      const network = err instanceof Error && (err as Error & { network?: boolean }).network
      return { failed: 0, offline: Boolean(network), error: network ? 'Offline' : err instanceof Error ? err.message : 'Sync failed' }
    }
  },
}
