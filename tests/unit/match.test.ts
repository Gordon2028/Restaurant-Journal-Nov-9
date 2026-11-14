import { describe, expect, it } from 'vitest'
import {
  distanceMeters, formatDistance, nameSimilarity, nearestPlaces, rankSearchResults, type PlaceCandidate,
} from '../../src/domain/places/match'
import { fitWithin } from '../../src/services/images/resize'

const p = (name: string, lat: number, lng: number, externalId = name): PlaceCandidate => ({
  externalId, name, address: '', neighborhood: '', cuisine: '', lat, lng,
})
const origin = { lat: 40.7233, lng: -73.9965 }

describe('place matching', () => {
  it('computes realistic distances', () => {
    expect(distanceMeters(origin, origin)).toBe(0)
    const d = distanceMeters(origin, { lat: 40.7233, lng: -73.9865 })
    expect(d).toBeGreaterThan(800)
    expect(d).toBeLessThan(900)
  })

  it('formats distance for humans', () => {
    expect(formatDistance(4)).toBe('10 m')
    expect(formatDistance(234)).toBe('230 m')
    expect(formatDistance(1240)).toBe('1.2 km')
  })

  it('scores similar names high and different names low', () => {
    expect(nameSimilarity('Joe’s Pizza', "Joe's Pizza")).toBeGreaterThan(0.85)
    expect(nameSimilarity('The Smith', 'Smith')).toBe(1)
    expect(nameSimilarity('Lilia', 'Katz’s Delicatessen')).toBeLessThan(0.3)
  })

  it('returns the 3 nearest distinct, named places', () => {
    const list = [
      p('Far Place', 40.73, -73.99),
      p('Lilia', 40.7234, -73.9964, 'a'),
      p('Lilia', 40.72341, -73.99641, 'b'), // duplicate of the same restaurant
      p('', 40.7233, -73.9965, 'c'), // unnamed
      p('Near Cafe', 40.7236, -73.9966),
      p('Mid Bar', 40.7245, -73.996),
      p('Another', 40.726, -73.995),
    ]
    const out = nearestPlaces(list, origin, 3)
    expect(out.map((o) => o.place.name)).toEqual(['Lilia', 'Near Cafe', 'Mid Bar'])
    expect(out[0].distance).toBeLessThan(out[1].distance)
  })

  it('ranks manual search by name closeness', () => {
    const out = rankSearchResults([p('Katz Deli'), p('Katz’s Delicatessen'), p('Pizza Palace')], 'katzs deli')
    expect(out[0].place.name).toMatch(/Katz/)
    expect(out[out.length - 1].place.name).toBe('Pizza Palace')
  })
})

describe('image sizing', () => {
  it('downsizes large images and keeps small ones', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
