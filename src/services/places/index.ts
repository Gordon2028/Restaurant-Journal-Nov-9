import type { PlacesProvider } from './PlacesProvider'
import { osmProvider } from './osm'

/** Single place to swap providers later (e.g. Google when a key exists). */
export function getPlacesProvider(): PlacesProvider {
  return osmProvider
}
