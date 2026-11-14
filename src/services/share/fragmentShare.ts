import LZString from 'lz-string'
import type { JournalEntry, Rating, ShareList } from '../../domain/types'

/**
 * TEMPORARY stand-in for server-side public pages. A shared list is a small,
 * text-only snapshot that travels inside the link's #fragment (never sent to any
 * server). Only the fields below can ever appear: no timestamps, ids, photos,
 * notes, or the owner's email/location. Replaced by Supabase-backed pages later.
 */
export interface SharedPlace {
  name: string
  neighborhood: string
  cuisine: string
  dish: string
  rating: Rating
  tags: string[]
  lat: number
  lng: number
  /** Short-lived signed URL (online version only). */
  photo?: string
}

export interface SharedListSnapshot {
  v: 1
  title: string
  note: string
  owner: string
  places: SharedPlace[]
}

export const MAX_SHARED_PLACES = 40

/** Build the snapshot from the owner's list, copying only whitelisted, owner-approved fields. */
export function buildSnapshot(list: ShareList, entries: JournalEntry[], ownerName: string): SharedListSnapshot {
  const byId = new Map(entries.map((e) => [e.visit.id, e]))
  const places = list.visitIds
    .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
    .slice(0, MAX_SHARED_PLACES)
    .map(({ visit, place }): SharedPlace => ({
      name: place.name,
      neighborhood: place.neighborhood,
      cuisine: place.cuisine,
      dish: list.shareDishes ? visit.dishName : '',
      rating: visit.rating,
      tags: list.shareTags ? visit.tags : [],
      lat: Math.round(place.lat * 1e5) / 1e5,
      lng: Math.round(place.lng * 1e5) / 1e5,
    }))
  return {
    v: 1,
    title: list.title,
    note: list.description,
    owner: list.showOwnerName ? ownerName.split(/\s+/)[0] : '',
    places,
  }
}

export function encodeSnapshot(s: SharedListSnapshot): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(s))
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.slice(0, max) : '')
const num = (v: unknown, lo: number, hi: number): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : null

/** Rebuild a snapshot from untrusted data (a link, or the server's response). Unexpected keys are dropped. */
export function sanitizeSnapshot(raw: unknown, allowPhoto: (url: string) => boolean = () => false): SharedListSnapshot | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (r.v !== 1 || !Array.isArray(r.places)) return null
  const places: SharedPlace[] = []
  for (const p of r.places.slice(0, MAX_SHARED_PLACES)) {
    if (typeof p !== 'object' || p === null) continue
    const q = p as Record<string, unknown>
    const lat = num(q.lat, -90, 90)
    const lng = num(q.lng, -180, 180)
    const name = str(q.name, 120)
    if (!name || lat === null || lng === null) continue
    const photo = typeof q.photo === 'string' && q.photo.length < 2000 && allowPhoto(q.photo) ? q.photo : ''
    places.push({
      name,
      neighborhood: str(q.neighborhood, 80),
      cuisine: str(q.cuisine, 60),
      dish: str(q.dish, 80),
      rating: q.rating === 'down' ? 'down' : 'up',
      tags: Array.isArray(q.tags) ? q.tags.filter((t): t is string => typeof t === 'string').slice(0, 10).map((t) => t.slice(0, 30)) : [],
      lat,
      lng,
      ...(photo ? { photo } : {}),
    })
  }
  return { v: 1, title: str(r.title, 100) || 'A list of favorites', note: str(r.note, 400), owner: str(r.owner, 40), places }
}

/** Parse untrusted fragment data from a link. */
export function decodeSnapshot(encoded: string): SharedListSnapshot | null {
  try {
    return sanitizeSnapshot(JSON.parse(LZString.decompressFromEncodedURIComponent(encoded) ?? ''))
  } catch {
    return null
  }
}

export function buildShareUrl(origin: string, slug: string, snapshot: SharedListSnapshot): string {
  return `${origin}/l/${slug}#${encodeSnapshot(snapshot)}`
}

export function mapLink(lat: number, lng: number, name: string): string {
  if (lat === 0 && lng === 0) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${lat},${lng}`)}`
}
