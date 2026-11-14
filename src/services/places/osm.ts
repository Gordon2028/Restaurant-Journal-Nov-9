import type { LatLng, PlaceCandidate } from '../../domain/places/match'
import type { PlacesProvider } from './PlacesProvider'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const FOOD = 'restaurant|cafe|fast_food|bar|pub|food_court|ice_cream|biergarten'

interface OverpassEl {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

interface NominatimAddress {
  house_number?: string
  road?: string
  neighbourhood?: string
  suburb?: string
  quarter?: string
  city_district?: string
  borough?: string
}
interface NominatimHit {
  osm_type: string
  osm_id: number
  lat: string
  lon: string
  name?: string
  category?: string
  type?: string
  extratags?: Record<string, string>
  address?: NominatimAddress
}

/** Fetch with a hard timeout, chained to an optional caller signal. */
async function getJson<T>(url: string, init: RequestInit, timeoutMs: number, signal?: AbortSignal): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  signal?.addEventListener('abort', () => ctrl.abort())
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) throw new Error(`Places request failed (${res.status})`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

function neighborhoodOf(a: NominatimAddress | undefined): string {
  return a?.neighbourhood ?? a?.suburb ?? a?.quarter ?? a?.city_district ?? a?.borough ?? ''
}

function prettyCuisine(raw: string | undefined): string {
  return (raw ?? '').split(';')[0].replace(/_/g, ' ').trim()
}

function fromOverpass(el: OverpassEl): PlaceCandidate | null {
  const t = el.tags ?? {}
  const lat = el.lat ?? el.center?.lat
  const lng = el.lon ?? el.center?.lon
  if (!t.name || lat === undefined || lng === undefined) return null
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  return {
    externalId: `osm:${el.type}/${el.id}`,
    name: t.name,
    address: street,
    neighborhood: t['addr:suburb'] ?? t['addr:neighbourhood'] ?? t['addr:city_district'] ?? '',
    cuisine: prettyCuisine(t.cuisine),
    lat,
    lng,
  }
}

function fromNominatim(h: NominatimHit): PlaceCandidate | null {
  if (!h.name) return null
  const isFood = h.category === 'amenity' && new RegExp(`^(${FOOD})$`).test(h.type ?? '')
  if (!isFood) return null
  const a = h.address
  return {
    externalId: `osm:${h.osm_type}/${h.osm_id}`,
    name: h.name,
    address: [a?.house_number, a?.road].filter(Boolean).join(' '),
    neighborhood: neighborhoodOf(a),
    cuisine: prettyCuisine(h.extratags?.cuisine),
    lat: Number(h.lat),
    lng: Number(h.lon),
  }
}


async function overpassNearby(origin: LatLng, signal?: AbortSignal): Promise<PlaceCandidate[]> {
  const around = `(around:450,${origin.lat},${origin.lng})`
  const q = `[out:json][timeout:4];(node["amenity"~"^(${FOOD})$"]${around};way["amenity"~"^(${FOOD})$"]${around};);out center 40;`
  const data = await getJson<{ elements: OverpassEl[] }>(
    OVERPASS,
    { method: 'POST', body: new URLSearchParams({ data: q }) },
    3500,
    signal,
  )
  return data.elements.map(fromOverpass).filter((p): p is PlaceCandidate => p !== null)
}

/** Restaurants first; add cafes/bars only if that came back thin. Sequential to respect ~1 req/s. */
async function nominatimNearby(origin: LatLng, signal?: AbortSignal): Promise<PlaceCandidate[]> {
  const d = 0.005 // ~500 m
  const box = `${origin.lng - d},${origin.lat + d},${origin.lng + d},${origin.lat - d}`
  const out: PlaceCandidate[] = []
  for (const term of ['restaurant', 'cafe', 'bar']) {
    const params = new URLSearchParams({
      q: term, format: 'jsonv2', addressdetails: '1', extratags: '1', limit: '20', viewbox: box, bounded: '1',
    })
    const hits = await getJson<NominatimHit[]>(`${NOMINATIM}/search?${params}`, {}, 5000, signal)
    out.push(...hits.map(fromNominatim).filter((p): p is PlaceCandidate => p !== null))
    if (out.length >= 5) break
  }
  return out
}

export const osmProvider: PlacesProvider = {
  id: 'osm',

  async nearby(origin, signal) {
    // Overpass gives the best "what's around me" list but public servers are flaky,
    // so fall back to bounded Nominatim searches when it fails or returns nothing.
    try {
      const found = await overpassNearby(origin, signal)
      if (found.length > 0) return found
    } catch {
      /* fall through to Nominatim */
    }
    return nominatimNearby(origin, signal)
  },

  async search(query, near, signal) {
    const params = new URLSearchParams({
      q: query,
      format: 'jsonv2',
      addressdetails: '1',
      extratags: '1',
      limit: '12',
    })
    if (near) {
      const d = 0.25
      params.set('viewbox', `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`)
    }
    const hits = await getJson<NominatimHit[]>(`${NOMINATIM}/search?${params}`, {}, 6000, signal)
    return hits.map(fromNominatim).filter((p): p is PlaceCandidate => p !== null)
  },

  async enrich(place) {
    if (place.neighborhood) return place
    try {
      const params = new URLSearchParams({
        lat: String(place.lat),
        lon: String(place.lng),
        format: 'jsonv2',
        zoom: '16',
        addressdetails: '1',
      })
      const hit = await getJson<{ address?: NominatimAddress }>(`${NOMINATIM}/reverse?${params}`, {}, 2500)
      return { ...place, neighborhood: neighborhoodOf(hit.address) }
    } catch {
      return place
    }
  },
}

export type { LatLng }
