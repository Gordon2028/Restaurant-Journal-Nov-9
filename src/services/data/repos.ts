import type { AppEvent, Place, ShareList, Visit } from '../../domain/types'

/** Interfaces the UI depends on. Local today; a Supabase adapter implements these later. */
export interface PlaceRepo {
  /** Insert or return the cached place with the same externalId. */
  upsert(place: Omit<Place, 'id'> & { id?: string }): Promise<Place>
  get(id: string): Promise<Place | undefined>
  all(): Promise<Place[]>
}

export interface VisitRepo {
  add(visit: Visit, photo?: Blob): Promise<void>
  update(id: string, patch: Partial<Omit<Visit, 'id' | 'userId'>>): Promise<Visit | undefined>
  get(id: string): Promise<Visit | undefined>
  listForUser(userId: string): Promise<Visit[]>
  remove(id: string): Promise<void>
  getPhoto(photoKey: string): Promise<Blob | undefined>
}

export interface ListRepo {
  save(list: ShareList): Promise<void>
  get(id: string): Promise<ShareList | undefined>
  getBySlug(slug: string): Promise<ShareList | undefined>
  listForUser(userId: string): Promise<ShareList[]>
  remove(id: string): Promise<void>
}

export interface EventRepo {
  add(event: AppEvent): Promise<void>
  all(): Promise<AppEvent[]>
}
