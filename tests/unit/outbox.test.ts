import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Visit } from '../../src/domain/types'

// Simulate a build with Supabase configured, so repos queue changes for upload.
vi.mock('../../src/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: null,
  supabaseUrl: 'https://example.supabase.co',
  requireSupabase: () => {
    throw new Error('not available in tests')
  },
}))

const { wipeAllLocalData } = await import('../../src/services/data/localDb')
const { listRepo, outbox, syncStore, visitRepo } = await import('../../src/services/data/localRepos')
const { onDataChange } = await import('../../src/services/data/changes')

const visit = (id: string, over: Partial<Visit> = {}): Visit => ({
  id, userId: 'u', placeId: 'p', rating: 'up', dishName: 'd', photoKey: '', note: '', tags: [],
  visitedAt: '2026-11-01T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z', syncStatus: 'pending', ...over,
})

beforeEach(async () => { await wipeAllLocalData() })

describe('offline outbox', () => {
  it('queues a new visit, and replaces the entry on later edits', async () => {
    await visitRepo.add(visit('v1'))
    const [first] = await outbox.all()
    expect(first).toMatchObject({ key: 'visit:v1', op: 'upsert' })
    await new Promise((r) => setTimeout(r, 5))
    await visitRepo.update('v1', { dishName: 'edited' })
    const all = await outbox.all()
    expect(all).toHaveLength(1)
    expect(all[0].at).toBeGreaterThan(first.at)
  })

  it('turns a delete into a queued deletion that remembers the photo', async () => {
    await visitRepo.add(visit('v2', { photoKey: 'v2.jpg' }), new Blob(['x']))
    await visitRepo.remove('v2')
    const all = await outbox.all()
    expect(all).toEqual([expect.objectContaining({ key: 'visit:v2', op: 'delete', photoKey: 'v2.jpg' })])
    expect(await visitRepo.get('v2')).toBeUndefined()
  })

  it('queues list saves and deletes', async () => {
    const list = { id: 'l1', userId: 'u', title: 'T', description: '', slug: 'abcdefghij', isPublic: false, showOwnerName: false,
      shareDishes: true, shareTags: true, sharePhotos: true, visitIds: [], createdAt: '2026-11-01T00:00:00.000Z' }
    await listRepo.save(list)
    expect((await outbox.keys()).has('list:l1')).toBe(true)
    await listRepo.remove('l1')
    expect((await outbox.all())[0]).toMatchObject({ key: 'list:l1', op: 'delete' })
  })

  it('does not drop an entry that changed while it was being sent', async () => {
    await visitRepo.add(visit('v3'))
    const [sending] = await outbox.all()
    await new Promise((r) => setTimeout(r, 5))
    await visitRepo.update('v3', { dishName: 'changed mid-flight' })
    await outbox.clearIfUnchanged(sending)
    expect((await outbox.keys()).has('visit:v3')).toBe(true) // still queued
    const [latest] = await outbox.all()
    await outbox.clearIfUnchanged(latest)
    expect((await outbox.keys()).size).toBe(0)
  })

  it('writes pulled from the server never queue anything back', async () => {
    const listener = vi.fn()
    const off = onDataChange(listener)
    await syncStore.applyPull({ places: [], visits: [visit('r1', { syncStatus: 'synced' })], lists: [], deleteVisitIds: [], deleteListIds: [] })
    off()
    expect(await visitRepo.get('r1')).toBeDefined()
    expect((await outbox.keys()).size).toBe(0)
    expect(listener).not.toHaveBeenCalled()
    await syncStore.applyPull({ places: [], visits: [], lists: [], deleteVisitIds: ['r1'], deleteListIds: [] })
    expect(await visitRepo.get('r1')).toBeUndefined()
    expect((await outbox.keys()).size).toBe(0)
  })
})
