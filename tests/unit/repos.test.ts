import { beforeEach, describe, expect, it } from 'vitest'
import type { Visit } from '../../src/domain/types'
import { wipeAllLocalData } from '../../src/services/data/localDb'
import { listRepo, placeRepo, visitRepo } from '../../src/services/data/localRepos'

const base = { address: '1 Main St', neighborhood: 'SoHo', cuisine: 'italian', lat: 40.72, lng: -74 }
const visit = (over: Partial<Visit> = {}): Visit => ({
  id: crypto.randomUUID(), userId: 'u1', placeId: 'p1', rating: 'up', dishName: 'Cacio e pepe',
  photoKey: '', note: '', tags: [], visitedAt: '2026-11-01T00:00:00.000Z',
  createdAt: '2026-11-01T00:00:00.000Z', syncStatus: 'local', ...over,
})

beforeEach(async () => { await wipeAllLocalData() })

describe('local repos', () => {
  it('dedupes places by externalId', async () => {
    const a = await placeRepo.upsert({ ...base, externalId: 'osm:1', name: 'Lilia' })
    const b = await placeRepo.upsert({ ...base, externalId: 'osm:1', name: 'Lilia (dup)' })
    expect(b.id).toBe(a.id)
    expect(await placeRepo.all()).toHaveLength(1)
  })

  it('lists visits newest first and removes photo with the visit', async () => {
    await visitRepo.add(visit({ id: 'old', visitedAt: '2026-10-01T00:00:00.000Z' }))
    await visitRepo.add(visit({ id: 'new', photoKey: 'k1' }), new Blob(['x']))
    expect((await visitRepo.listForUser('u1')).map((v) => v.id)).toEqual(['new', 'old'])
    expect(await visitRepo.getPhoto('k1')).toBeDefined()
    await visitRepo.remove('new')
    expect(await visitRepo.getPhoto('k1')).toBeUndefined()
  })

  it('marks edited visits pending and finds lists by slug', async () => {
    await visitRepo.add(visit({ id: 'v' }))
    expect((await visitRepo.update('v', { dishName: 'Pasta' }))?.syncStatus).toBe('pending')
    await listRepo.save({ id: 'l', userId: 'u1', title: 'T', description: '', slug: 'abc', isPublic: true,
      showOwnerName: false, shareDishes: true, shareTags: true, sharePhotos: true, visitIds: ['v'], createdAt: '2026-11-01T00:00:00.000Z' })
    expect((await listRepo.getBySlug('abc'))?.id).toBe('l')
  })
})
