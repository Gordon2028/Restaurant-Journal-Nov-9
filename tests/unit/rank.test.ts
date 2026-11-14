import { describe, expect, it } from 'vitest'
import { applyFilters, editDistance, NO_FILTERS, rankEntries, wordMatch } from '../../src/domain/ranking/rank'
import type { JournalEntry } from '../../src/domain/types'

let n = 0
function entry(o: { name: string; dish?: string; hood?: string; cuisine?: string; tags?: string[]; rating?: 'up' | 'down'; at?: string }): JournalEntry {
  n++
  return {
    place: { id: `p${n}`, externalId: `e${n}`, name: o.name, address: '', neighborhood: o.hood ?? '', cuisine: o.cuisine ?? '', lat: 0, lng: 0 },
    visit: { id: `v${n}`, userId: 'u', placeId: `p${n}`, rating: o.rating ?? 'up', dishName: o.dish ?? '', photoKey: '', note: '',
      tags: o.tags ?? [], visitedAt: o.at ?? `2026-10-${String(10 + n).padStart(2, '0')}T00:00:00Z`, createdAt: '', syncStatus: 'local' },
  }
}

const lilia = entry({ name: 'Lilia', dish: 'Cacio e pepe', hood: 'Williamsburg', cuisine: 'italian', tags: ['date night'] })
const katz = entry({ name: "Katz's Delicatessen", dish: 'Pastrami sandwich', hood: 'Lower East Side', cuisine: 'deli', tags: ['quick bite', 'impressive for visitors'] })
const joes = entry({ name: "Joe's Pizza", dish: 'Plain slice', hood: 'Greenwich Village', cuisine: 'pizza', tags: ['cheap eats'], rating: 'down' })
const all = [lilia, katz, joes]
const names = (q: string) => rankEntries(all, q).map((r) => r.entry.place.name)

describe('word matching', () => {
  it('scores exact > prefix > substring > typo', () => {
    expect(wordMatch('pizza', 'pizza')).toBe(1)
    expect(wordMatch('piz', 'pizza')).toBe(0.9)
    expect(wordMatch('zza', 'pizza')).toBe(0.7)
    expect(wordMatch('pizzza', 'pizza')).toBeGreaterThan(0)
    expect(wordMatch('pizza', 'burger')).toBe(0)
  })
  it('computes edit distance with early exit', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3)
    expect(editDistance('abc', 'abc')).toBe(0)
    expect(editDistance('a', 'abcdefgh', 2)).toBeGreaterThan(2)
  })
})

describe('rankEntries', () => {
  it('finds by dish, name, neighborhood, cuisine and vibe tag', () => {
    expect(names('cacio')).toEqual(['Lilia'])
    expect(names('katz')).toEqual(["Katz's Delicatessen"])
    expect(names('village')).toEqual(["Joe's Pizza"])
    expect(names('deli')).toEqual(["Katz's Delicatessen"])
    expect(names('date night')).toEqual(['Lilia'])
  })
  it('forgives typos and partial words', () => {
    expect(names('pastrmi')).toEqual(["Katz's Delicatessen"])
    expect(names('williamsb')).toEqual(['Lilia'])
    expect(names('italan')).toEqual(['Lilia'])
  })
  it('requires every word to match', () => {
    expect(names('cacio pizza')).toEqual([])
  })
  it('ranks dish matches above weaker field matches', () => {
    const a = entry({ name: 'Pasta House', dish: 'Salad' })
    const b = entry({ name: 'Green Room', dish: 'Pasta carbonara' })
    const ranked = rankEntries([a, b], 'pasta').map((r) => r.entry.place.name)
    expect(ranked[0]).toBe('Green Room')
  })
  it('returns everything newest-first for an empty query', () => {
    expect(names('')).toEqual(["Joe's Pizza", "Katz's Delicatessen", 'Lilia'])
  })
})

describe('applyFilters', () => {
  it('filters by rating, neighborhood and vibe', () => {
    expect(applyFilters(all, { ...NO_FILTERS, upOnly: true })).toHaveLength(2)
    expect(applyFilters(all, { ...NO_FILTERS, neighborhood: 'Lower East Side' })).toEqual([katz])
    expect(applyFilters(all, { ...NO_FILTERS, tag: 'cheap eats' })).toEqual([joes])
  })
})
