import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import type { JournalEntry } from '../domain/types'
import { hasCoords } from '../domain/places/match'
import { useJournal } from '../hooks/useJournal'
import { useAuth } from '../hooks/useAuth'
import { loadPhoto } from '../services/data/photos'

const NYC: [number, number] = [-73.99, 40.73]

const STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
      maxzoom: 19,
    },
  },
  layers: [{ id: 'osm', type: 'raster' as const, source: 'osm' }],
}

/** One pin per place: show the most recent visit there. */
function latestPerPlace(entries: JournalEntry[]): JournalEntry[] {
  const seen = new Map<string, JournalEntry>()
  for (const e of entries) if (hasCoords(e.place) && !seen.has(e.place.id)) seen.set(e.place.id, e)
  return [...seen.values()]
}

export function MapPage() {
  const { entries, loading } = useJournal()
  const nav = useNavigate()
  const { user } = useAuth()
  const userId = user?.id
  const el = useRef<HTMLDivElement>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const pins = latestPerPlace(entries)
    if (!el.current || pins.length === 0) return
    let cleanup = () => {}
    let cancelled = false
    void (async () => {
      try {
        const [maplibregl, worker] = await Promise.all([
          import('maplibre-gl'),
          import('maplibre-gl/dist/maplibre-gl-worker.mjs?url'),
          import('maplibre-gl/dist/maplibre-gl.css'),
        ])
        // Vite can't auto-discover MapLibre's worker, so point to it explicitly.
        maplibregl.setWorkerUrl(worker.default)
        if (cancelled || !el.current) return
        const map = new maplibregl.Map({ container: el.current, style: STYLE, center: NYC, zoom: 11 })
        if (import.meta.env.DEV) (window as unknown as { __plateMap?: unknown }).__plateMap = map // dev/test hook
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
        const urls: string[] = []
        const bounds = new maplibregl.LngLatBounds()

        for (const { visit, place } of pins) {
          const button = document.createElement('button')
          button.type = 'button'
          button.setAttribute('aria-label', `${place.name}, ${visit.rating === 'up' ? 'loved it' : 'not for me'}`)
          button.textContent = visit.rating === 'up' ? '👍' : '👎'
          button.style.cssText =
            'width:36px;height:36px;border-radius:9999px;border:2px solid #fff;font-size:16px;padding:0;cursor:pointer;' +
            `background:${visit.rating === 'up' ? '#46532a' : '#8f2c07'};box-shadow:0 2px 6px rgba(0,0,0,.35)`

          const card = document.createElement('div')
          card.style.cssText = 'width:200px;font-family:Inter,sans-serif'
          const img = document.createElement('img')
          img.alt = `${visit.dishName || 'Dish'} at ${place.name}`
          img.style.cssText = 'width:100%;height:120px;object-fit:cover;border-radius:8px;display:none'
          const title = document.createElement('strong')
          title.textContent = place.name
          title.style.cssText = 'display:block;margin-top:6px;font-size:16px'
          const sub = document.createElement('span')
          sub.textContent = `${visit.rating === 'up' ? '👍' : '👎'} ${visit.dishName || 'No dish noted'}`
          sub.style.cssText = 'display:block;color:#6b5d52;font-size:14px'
          const link = document.createElement('a')
          link.href = `/spots/${visit.id}`
          link.textContent = 'Open'
          link.style.cssText = 'display:inline-block;margin-top:6px;color:#b93a0b;font-weight:600;padding:8px 0'
          link.addEventListener('click', (ev) => { ev.preventDefault(); nav(`/spots/${visit.id}`) })
          card.append(img, title, sub, link)

          if (visit.photoKey) {
            void loadPhoto(userId, visit.photoKey).then((blob) => {
              if (!blob || cancelled) return
              const u = URL.createObjectURL(blob)
              urls.push(u)
              img.src = u
              img.style.display = 'block'
            })
          }

          const popup = new maplibregl.Popup({ offset: 26, closeButton: true }).setDOMContent(card)
          new maplibregl.Marker({ element: button }).setLngLat([place.lng, place.lat]).setPopup(popup).addTo(map)
          bounds.extend([place.lng, place.lat])
        }
        if (pins.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 15, animate: false })
        else map.jumpTo({ center: [pins[0].place.lng, pins[0].place.lat], zoom: 14 })
        cleanup = () => { urls.forEach(URL.revokeObjectURL); map.remove() }
      } catch {
        setError("The map couldn't load. Check your connection and try again.")
      }
    })()
    return () => { cancelled = true; cleanup() }
  }, [entries, nav, userId])

  return (
    <main>
      <h1 className="text-3xl font-bold">Map</h1>
      {!loading && entries.length === 0 ? (
        <EmptyState title="No pins yet" body="Places you save will appear here." />
      ) : (
        <>
          {error && <p role="alert" className="mt-3 text-tomato-dark">{error}</p>}
          <div ref={el} role="region" aria-label="Map of your saved spots"
            className="mt-4 h-[60vh] w-full overflow-hidden rounded-2xl border border-line" />
        </>
      )}
    </main>
  )
}
