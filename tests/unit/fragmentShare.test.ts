import LZString from 'lz-string'
import { describe, expect, it } from 'vitest'
import type { JournalEntry, ShareList } from '../../src/domain/types'
import { makeSlug } from '../../src/domain/slug'
import { buildShareUrl, buildSnapshot, decodeSnapshot, encodeSnapshot } from '../../src/services/share/fragmentShare'

const entry = (n: number, over: Partial<JournalEntry['visit']> = {}): JournalEntry => ({
  place: { id: `p${n}`, externalId: `osm:${n}`, name: `Place ${n}`, address: '12 Home St', neighborhood: 'SoHo', cuisine: 'italian', lat: 40.7233456789, lng: -73.9965123456 },
  visit: { id: `v${n}`, userId: 'secret-user-id', placeId: `p${n}`, rating: 'up', dishName: 'Cacio e pepe', photoKey: `v${n}.jpg`,
    note: 'private note', tags: ['date night'], visitedAt: '2026-11-01T18:45:12.000Z', createdAt: '2026-11-01T18:45:12.000Z', syncStatus: 'pending', ...over },
})
const list = (over: Partial<ShareList> = {}): ShareList => ({
  id: 'list-id', userId: 'secret-user-id', title: "John's Top 10", description: 'For visitors', slug: 'abc', isPublic: true,
  showOwnerName: false, shareDishes: true, shareTags: true, sharePhotos: true, visitIds: ['v1', 'v2'], createdAt: '2026-11-02T00:00:00.000Z', ...over,
})

describe('shared list snapshot', () => {
  it('exposes only whitelisted fields (no ids, timestamps, notes, photos, email)', () => {
    const snap = buildSnapshot(list(), [entry(1), entry(2)], 'John Smith')
    const json = JSON.stringify(snap)
    for (const leak of ['secret-user-id', 'list-id', '2026-11', 'private note', '.jpg', '12 Home St', 'John Smith', 'photoKey', 'userId']) {
      expect(json).not.toContain(leak)
    }
    expect(Object.keys(snap.places[0]).sort()).toEqual(['cuisine', 'dish', 'lat', 'lng', 'name', 'neighborhood', 'rating', 'tags'])
  })

  it('respects owner choices for dish, tags and name', () => {
    const hidden = buildSnapshot(list({ shareDishes: false, shareTags: false }), [entry(1)], 'John Smith')
    expect(hidden.places[0].dish).toBe('')
    expect(hidden.places[0].tags).toEqual([])
    expect(hidden.owner).toBe('')
    expect(buildSnapshot(list({ showOwnerName: true }), [entry(1)], 'John Smith').owner).toBe('John')
  })

  it('rounds coordinates and keeps list order', () => {
    const snap = buildSnapshot(list({ visitIds: ['v2', 'v1'] }), [entry(1), entry(2)], 'J')
    expect(snap.places.map((p) => p.name)).toEqual(['Place 2', 'Place 1'])
    expect(snap.places[0].lat).toBe(40.72335)
  })

  it('round-trips through the link', () => {
    const snap = buildSnapshot(list(), [entry(1), entry(2)], 'J')
    const url = buildShareUrl('https://plate.test', 'abc', snap)
    expect(url.startsWith('https://plate.test/l/abc#')).toBe(true)
    expect(decodeSnapshot(url.split('#')[1])).toEqual(snap)
  })

  it('rejects garbage and strips unexpected fields from tampered links', () => {
    expect(decodeSnapshot('not-a-real-payload')).toBeNull()
    expect(decodeSnapshot('')).toBeNull()
    const tampered = LZString.compressToEncodedURIComponent(JSON.stringify({
      v: 1, title: 'T', note: '', owner: '', evil: '<script>', places: [
        { name: 'A', lat: 1, lng: 2, tags: [], dish: '', rating: 'up', neighborhood: '', cuisine: '', userId: 'x' },
        { name: 'No coords' }, { name: 'Bad', lat: 999, lng: 0 }],
    }))
    const out = decodeSnapshot(tampered)!
    expect(out.places).toHaveLength(1)
    expect(JSON.stringify(out)).not.toContain('evil')
    expect(JSON.stringify(out)).not.toContain('userId')
    expect(encodeSnapshot(out).length).toBeGreaterThan(0)
  })
})

describe('slug', () => {
  it('is unguessable-looking and unique', () => {
    const slugs = new Set(Array.from({ length: 500 }, () => makeSlug()))
    expect(slugs.size).toBe(500)
    expect([...slugs][0]).toMatch(/^[A-Za-z0-9]{10}$/)
  })
})
