export type Rating = 'up' | 'down'

export interface Profile {
  id: string
  email: string
  displayName: string
  createdAt: string
}

export interface Place {
  id: string
  /** Provider id, e.g. "osm:node/123". Lets us de-duplicate the local cache. */
  externalId: string
  name: string
  address: string
  neighborhood: string
  cuisine: string
  lat: number
  lng: number
}

export type SyncStatus = 'local' | 'pending' | 'synced'

export interface Visit {
  id: string
  userId: string
  placeId: string
  rating: Rating
  dishName: string
  /** Key of the photo blob in the photos store; empty when no photo. */
  photoKey: string
  note: string
  tags: string[]
  visitedAt: string
  createdAt: string
  syncStatus: SyncStatus
}

export interface ShareList {
  id: string
  userId: string
  title: string
  description: string
  slug: string
  isPublic: boolean
  showOwnerName: boolean
  shareDishes: boolean
  shareTags: boolean
  sharePhotos: boolean
  visitIds: string[]
  createdAt: string
}

export type EventName =
  | 'capture_started'
  | 'capture_completed'
  | 'search_performed'
  | 'recall_result_opened'
  | 'list_created'
  | 'list_shared'
  | 'shared_list_viewed'

export interface AppEvent {
  id: string
  userId: string
  name: EventName
  props: Record<string, number | string | boolean>
  at: string
}

/** A visit joined with its place, the unit every recall screen works with. */
export interface JournalEntry {
  visit: Visit
  place: Place
}
