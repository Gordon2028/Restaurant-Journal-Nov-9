import type { LatLng } from '../domain/places/match'

export type GeoResult = { ok: true; position: LatLng } | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' }

export async function geolocationPermission(): Promise<PermissionState | 'unknown'> {
  try {
    if (!navigator.permissions) return 'unknown'
    return (await navigator.permissions.query({ name: 'geolocation' })).state
  } catch {
    return 'unknown'
  }
}

/** One-shot position. Only call this at the moment of capture. Nothing is stored. */
export function getPosition(timeoutMs = 8000): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ ok: false, reason: 'unavailable' })
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ ok: true, position: { lat: p.coords.latitude, lng: p.coords.longitude } }),
      (e) => resolve({ ok: false, reason: e.code === e.PERMISSION_DENIED ? 'denied' : e.code === e.TIMEOUT ? 'timeout' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60_000 },
    )
  })
}
