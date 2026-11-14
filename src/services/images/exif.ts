import exifr from 'exifr'
import type { LatLng } from '../../domain/places/match'

/** Read GPS from the ORIGINAL file, before compression strips it. Returns null when absent. */
export async function readPhotoLocation(file: Blob): Promise<LatLng | null> {
  try {
    const gps = await exifr.gps(file)
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      return { lat: gps.latitude, lng: gps.longitude }
    }
  } catch {
    /* unreadable metadata is fine */
  }
  return null
}
