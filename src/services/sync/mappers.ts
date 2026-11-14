import type { Place, ShareList, Visit } from '../../domain/types'
import type { Database } from '../supabase/database.types'

type Tables = Database['public']['Tables']
export type VisitRow = Tables['visits']['Row']
export type PlaceRow = Tables['places']['Row']
export type ListRow = Tables['lists']['Row']

const iso = (s: string): string => new Date(s).toISOString()

/** Photos live at `{userId}/{photoKey}` in the private bucket. */
export const photoPath = (userId: string, photoKey: string): string => (photoKey ? `${userId}/${photoKey}` : '')
export const photoKeyFromPath = (path: string): string => path.split('/').pop() ?? ''

export function visitToRow(v: Visit, userId: string): Tables['visits']['Insert'] {
  return {
    id: v.id,
    user_id: userId,
    place_id: v.placeId,
    rating: v.rating,
    dish_name: v.dishName,
    photo_path: photoPath(userId, v.photoKey),
    note: v.note,
    tags: v.tags.slice(0, 12),
    visited_at: v.visitedAt,
    created_at: v.createdAt,
  }
}

export function rowToVisit(r: VisitRow): Visit {
  return {
    id: r.id,
    userId: r.user_id,
    placeId: r.place_id,
    rating: r.rating === 'down' ? 'down' : 'up',
    dishName: r.dish_name,
    photoKey: photoKeyFromPath(r.photo_path),
    note: r.note,
    tags: r.tags,
    visitedAt: iso(r.visited_at),
    createdAt: iso(r.created_at),
    syncStatus: 'synced',
  }
}

export function placeToRow(p: Place): Tables['places']['Insert'] {
  return {
    id: p.id,
    external_id: p.externalId,
    name: p.name,
    address: p.address,
    neighborhood: p.neighborhood,
    cuisine: p.cuisine,
    lat: p.lat,
    lng: p.lng,
  }
}

export function rowToPlace(r: PlaceRow): Place {
  return {
    id: r.id, externalId: r.external_id, name: r.name, address: r.address,
    neighborhood: r.neighborhood, cuisine: r.cuisine, lat: r.lat, lng: r.lng,
  }
}

export function listToRow(l: ShareList, userId: string): Tables['lists']['Insert'] {
  return {
    id: l.id,
    user_id: userId,
    title: l.title,
    description: l.description,
    slug: l.slug,
    is_public: l.isPublic,
    show_owner_name: l.showOwnerName,
    share_dishes: l.shareDishes,
    share_tags: l.shareTags,
    share_photos: l.sharePhotos,
    created_at: l.createdAt,
  }
}

export function rowToList(r: ListRow, visitIds: string[]): ShareList {
  return {
    id: r.id, userId: r.user_id, title: r.title, description: r.description, slug: r.slug,
    isPublic: r.is_public, showOwnerName: r.show_owner_name, shareDishes: r.share_dishes,
    shareTags: r.share_tags, sharePhotos: r.share_photos, visitIds, createdAt: iso(r.created_at),
  }
}
