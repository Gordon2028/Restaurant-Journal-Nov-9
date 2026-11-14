import type { Place } from '../types'

export type LatLng = { lat: number; lng: number }
/** A place from a provider, before it gets an id in our own cache. */
export type PlaceCandidate = Omit<Place, 'id'>

const R = 6371000

export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`
}

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|restaurant|nyc)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>()
  const padded = ` ${s} `
  for (let i = 0; i < padded.length - 1; i++) {
    const g = padded.slice(i, i + 2)
    m.set(g, (m.get(g) ?? 0) + 1)
  }
  return m
}

/** Dice coefficient on character bigrams, 0..1. Tolerant of typos and word order. */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a)
  const y = normalizeName(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const bx = bigrams(x)
  const by = bigrams(y)
  let overlap = 0
  for (const [g, n] of bx) overlap += Math.min(n, by.get(g) ?? 0)
  return (2 * overlap) / (x.length + 1 + (y.length + 1))
}

/** Same provider id, or near-identical name within ~75m (provider duplicates, e.g. node + building). */
export function isSamePlace(a: PlaceCandidate, b: PlaceCandidate): boolean {
  if (a.externalId === b.externalId) return true
  return nameSimilarity(a.name, b.name) >= 0.85 && distanceMeters(a, b) <= 75
}

export interface RankedCandidate {
  place: PlaceCandidate
  distance: number
}

/** The `n` nearest distinct, named places to `origin`. */
export function nearestPlaces(candidates: PlaceCandidate[], origin: LatLng, n = 3): RankedCandidate[] {
  const sorted = candidates
    .filter((c) => c.name.trim().length > 0)
    .map((place) => ({ place, distance: distanceMeters(origin, place) }))
    .sort((a, b) => a.distance - b.distance)
  const kept: RankedCandidate[] = []
  for (const c of sorted) {
    if (kept.some((k) => isSamePlace(k.place, c.place))) continue
    kept.push(c)
    if (kept.length === n) break
  }
  return kept
}

/** Order manual-search results by how well the name matches, then by distance if known. */
export function rankSearchResults(
  candidates: PlaceCandidate[],
  query: string,
  origin?: LatLng | null,
): RankedCandidate[] {
  const seen: PlaceCandidate[] = []
  const out: (RankedCandidate & { score: number })[] = []
  for (const place of candidates) {
    if (seen.some((s) => isSamePlace(s, place))) continue
    seen.push(place)
    const sim = nameSimilarity(place.name, query)
    const contains = normalizeName(place.name).includes(normalizeName(query)) ? 0.3 : 0
    out.push({ place, distance: origin ? distanceMeters(origin, place) : NaN, score: sim + contains })
  }
  return out
    .sort((a, b) => b.score - a.score || (a.distance || 0) - (b.distance || 0))
    .map(({ place, distance }) => ({ place, distance }))
}

/** Manually typed places may have no real position (stored as 0,0). */
export function hasCoords(p: { lat: number; lng: number }): boolean {
  return !(p.lat === 0 && p.lng === 0)
}
