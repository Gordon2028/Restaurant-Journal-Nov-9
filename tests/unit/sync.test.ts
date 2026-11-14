import { describe, expect, it } from 'vitest'
import { placeIdFor } from '../../src/domain/places/placeId'
import type { Place, ShareList, Visit } from '../../src/domain/types'
import { listToRow, photoKeyFromPath, photoPath, rowToList, rowToVisit, visitToRow, type VisitRow } from '../../src/services/sync/mappers'
import { planPull } from '../../src/services/sync/planPull'

const visit = (id: string, over: Partial<Visit> = {}): Visit => ({
  id, userId: 'u', placeId: 'p', rating: 'up', dishName: 'd', photoKey: '', note: '', tags: [],
  visitedAt: '2026-11-01T00:00:00.000Z', createdAt: '2026-11-01T00:00:00.000Z', syncStatus: 'pending', ...over,
})
const list = (id: string): ShareList => ({
  id, userId: 'u', title: 't', description: '', slug: 'abcdefghij', isPublic: false, showOwnerName: false,
  shareDishes: true, shareTags: true, sharePhotos: true, visitIds: [], createdAt: '2026-11-01T00:00:00.000Z',
})
const place = (id: string): Place => ({ id, externalId: id, name: id, address: '', neighborhood: '', cuisine: '', lat: 1, lng: 2 })

describe('placeIdFor', () => {
  it('is deterministic, uuid-shaped, and distinct per place', async () => {
    const a = await placeIdFor('osm:node/1')
    expect(a).toBe(await placeIdFor('osm:node/1'))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(a).not.toBe(await placeIdFor('osm:node/2'))
  })
})

describe('row mappers', () => {
  it('puts photos in the owner folder and round-trips a visit', () => {
    const v = visit('v1', { photoKey: 'v1.jpg', tags: ['brunch'] })
    const row = visitToRow(v, 'user-1')
    expect(row.photo_path).toBe('user-1/v1.jpg')
    expect(photoPath('user-1', '')).toBe('')
    expect(photoKeyFromPath('user-1/v1.jpg')).toBe('v1.jpg')
    const back = rowToVisit({ ...row, user_id: 'user-1', updated_at: row.created_at!, note: '', rating: 'up', tags: ['brunch'], dish_name: 'd', photo_path: row.photo_path!, place_id: 'p', visited_at: row.visited_at!, created_at: row.created_at!, id: 'v1' } as VisitRow)
    expect(back).toMatchObject({ id: 'v1', photoKey: 'v1.jpg', tags: ['brunch'], syncStatus: 'synced' })
    expect(back.visitedAt).toBe('2026-11-01T00:00:00.000Z')
  })
  it('never trusts an unexpected rating value', () => {
    expect(rowToVisit({ ...visitToRow(visit('v'), 'u'), rating: 'weird' } as unknown as VisitRow).rating).toBe('up')
  })
  it('maps lists both ways', () => {
    const l = list('l1')
    const row = listToRow(l, 'u')
    expect(row).toMatchObject({ id: 'l1', is_public: false, share_photos: true })
    expect(rowToList({ ...row, updated_at: '2026-11-01T00:00:00Z' } as never, ['a', 'b']).visitIds).toEqual(['a', 'b'])
  })
})

describe('planPull', () => {
  const remote = { visits: [visit('r1'), visit('r2')], places: [place('p1'), place('p1')], lists: [list('l1')] }

  it('takes remote items, de-duplicates places', () => {
    const plan = planPull({ visits: [], lists: [] }, remote, new Set())
    expect(plan.putVisits.map((v) => v.id)).toEqual(['r1', 'r2'])
    expect(plan.putPlaces).toHaveLength(1)
    expect(plan.putLists.map((l) => l.id)).toEqual(['l1'])
  })
  it('keeps items that still have unsent local changes', () => {
    const plan = planPull({ visits: [visit('r1')], lists: [] }, remote, new Set(['visit:r1', 'list:l1']))
    expect(plan.putVisits.map((v) => v.id)).toEqual(['r2'])
    expect(plan.putLists).toEqual([])
  })
  it('removes local items deleted elsewhere, but never unsent new ones', () => {
    const plan = planPull(
      { visits: [visit('gone'), visit('new-offline')], lists: [list('gone-list'), list('new-list')] },
      remote,
      new Set(['visit:new-offline', 'list:new-list']),
    )
    expect(plan.deleteVisitIds).toEqual(['gone'])
    expect(plan.deleteListIds).toEqual(['gone-list'])
  })
})
