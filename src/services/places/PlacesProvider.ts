import type { LatLng, PlaceCandidate } from '../../domain/places/match'

/** Seam for restaurant lookup. OSM today; Google Places (New) can implement this later. */
export interface PlacesProvider {
  readonly id: string
  nearby(origin: LatLng, signal?: AbortSignal): Promise<PlaceCandidate[]>
  search(query: string, near?: LatLng | null, signal?: AbortSignal): Promise<PlaceCandidate[]>
  /** Fill in missing details (e.g. neighborhood). Must never throw; returns input on failure. */
  enrich(place: PlaceCandidate): Promise<PlaceCandidate>
}
