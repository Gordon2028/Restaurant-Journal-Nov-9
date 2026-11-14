import type { Place, ShareList, Visit } from '../../domain/types'

const sameVisit = (a: Visit | undefined, b: Visit): boolean =>
  !!a && a.placeId === b.placeId && a.rating === b.rating && a.dishName === b.dishName && a.photoKey === b.photoKey &&
  a.note === b.note && a.tags.join('\u0000') === b.tags.join('\u0000') && a.visitedAt === b.visitedAt && a.syncStatus === b.syncStatus

const sameList = (a: ShareList | undefined, b: ShareList): boolean =>
  !!a && a.title === b.title && a.description === b.description && a.slug === b.slug && a.isPublic === b.isPublic &&
  a.showOwnerName === b.showOwnerName && a.shareDishes === b.shareDishes && a.shareTags === b.shareTags &&
  a.sharePhotos === b.sharePhotos && a.visitIds.join(',') === b.visitIds.join(',')

export interface PullPlan {
  putPlaces: Place[]
  putVisits: Visit[]
  deleteVisitIds: string[]
  putLists: ShareList[]
  deleteListIds: string[]
}

/** Items identical to the local copy are left out so a no-change sync does no work. */
/**
 * Decide how to merge the server's copy into the device. The rule: anything with unsent local
 * changes (a key in `pending`, like "visit:<id>") is left alone and wins; everything else follows
 * the server, including deletions made on another device.
 */
export function planPull(
  local: { visits: Visit[]; lists: ShareList[] },
  remote: { visits: Visit[]; places: Place[]; lists: ShareList[] },
  pending: ReadonlySet<string>,
): PullPlan {
  const localVisits = new Map(local.visits.map((v) => [v.id, v]))
  const localLists = new Map(local.lists.map((l) => [l.id, l]))
  const remoteVisitIds = new Set(remote.visits.map((v) => v.id))
  const remoteListIds = new Set(remote.lists.map((l) => l.id))
  return {
    putPlaces: [...new Map(remote.places.map((p) => [p.id, p])).values()],
    putVisits: remote.visits.filter((v) => !pending.has(`visit:${v.id}`) && !sameVisit(localVisits.get(v.id), v)),
    deleteVisitIds: local.visits.filter((v) => !remoteVisitIds.has(v.id) && !pending.has(`visit:${v.id}`)).map((v) => v.id),
    putLists: remote.lists.filter((l) => !pending.has(`list:${l.id}`) && !sameList(localLists.get(l.id), l)),
    deleteListIds: local.lists.filter((l) => !remoteListIds.has(l.id) && !pending.has(`list:${l.id}`)).map((l) => l.id),
  }
}
