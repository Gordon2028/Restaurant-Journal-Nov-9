import type { PlacesProvider } from './PlacesProvider'

/**
 * Placeholder for Google Places API (New). Not wired up yet: when a key is
 * available (VITE_GOOGLE_PLACES_KEY), implement `PlacesProvider` here and return
 * it from `getPlacesProvider()`. Cache results in the places repo to limit cost.
 */
export function createGooglePlacesProvider(_apiKey: string): PlacesProvider {
  throw new Error('Google Places provider is not implemented yet')
}
