import { useEffect, useRef, useState } from 'react'
import {
  formatDistance, nearestPlaces, rankSearchResults, type LatLng, type PlaceCandidate, type RankedCandidate,
} from '../../domain/places/match'
import { geolocationPermission, getPosition } from '../../services/location'
import { getPlacesProvider } from '../../services/places'
import { BigButton } from '../BigButton'

interface Props {
  exifLocation: LatLng | null
  onPick: (place: PlaceCandidate) => void
}

type Mode = 'checking' | 'asking' | 'loading' | 'results' | 'search'

/** A place typed in by hand. It has no provider id, and borrows the user's position if we have it. */
function manualPlace(name: string, origin: LatLng | null): PlaceCandidate {
  return {
    externalId: `manual:${crypto.randomUUID()}`, name, address: '', neighborhood: '', cuisine: '',
    lat: origin?.lat ?? 0, lng: origin?.lng ?? 0,
  }
}

function PlaceRow({ r, onPick }: { r: RankedCandidate; onPick: (p: PlaceCandidate) => void }) {
  const meta = [r.place.neighborhood, r.place.cuisine, Number.isNaN(r.distance) ? '' : formatDistance(r.distance)]
    .filter(Boolean)
    .join(' · ')
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(r.place)}
        className="w-full rounded-2xl border-2 border-line bg-card px-5 py-4 text-left active:scale-[0.98]"
      >
        <span className="block font-display text-xl font-bold">{r.place.name}</span>
        {meta && <span className="mt-0.5 block text-sm text-muted">{meta}</span>}
      </button>
    </li>
  )
}

export function PlaceStep({ exifLocation, onPick }: Props) {
  const provider = getPlacesProvider()
  const [mode, setMode] = useState<Mode>('checking')
  const [origin, setOrigin] = useState<LatLng | null>(exifLocation)
  const [note, setNote] = useState('')
  const [nearby, setNearby] = useState<RankedCandidate[]>([])
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<RankedCandidate[]>([])
  const [searching, setSearching] = useState(false)
  const started = useRef(false)

  async function loadNearby(at: LatLng) {
    setMode('loading')
    try {
      const list = nearestPlaces(await provider.nearby(at), at, 3)
      if (list.length === 0) {
        setNote('Nothing found right around you.')
        setMode('search')
        return
      }
      setNearby(list)
      setMode('results')
    } catch {
      setNote("Couldn't load nearby spots.")
      setMode('search')
    }
  }

  async function locateAndLoad() {
    setMode('loading')
    const res = await getPosition()
    if (!res.ok) {
      setNote(res.reason === 'denied' ? 'No problem, just search by name.' : "Couldn't find you.")
      setMode('search')
      return
    }
    setOrigin(res.position)
    await loadNearby(res.position)
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      if (exifLocation) return loadNearby(exifLocation)
      const perm = await geolocationPermission()
      if (perm === 'granted') return locateAndLoad()
      if (perm === 'denied') {
        setNote('Location is off, so search by name.')
        return setMode('search')
      }
      setMode('asking')
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced manual search (Nominatim allows ~1 request/second).
  useEffect(() => {
    if (mode !== 'search' || query.trim().length < 3) {
      setFound([])
      return
    }
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        setFound(rankSearchResults(await provider.search(query.trim(), origin, ctrl.signal), query, origin).slice(0, 6))
      } catch {
        if (!ctrl.signal.aborted) setFound([])
      } finally {
        if (!ctrl.signal.aborted) setSearching(false)
      }
    }, 450)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [query, mode, origin, provider])

  return (
    <section>
      <h1 className="text-3xl font-bold leading-tight">Where are you?</h1>

      {mode === 'asking' && (
        <div className="mt-6 space-y-4">
          <p className="text-muted">Plate uses your location once, just to suggest places nearby. It isn't saved.</p>
          <BigButton onClick={() => void locateAndLoad()}>Find places near me</BigButton>
          <BigButton variant="quiet" onClick={() => setMode('search')}>Search by name instead</BigButton>
        </div>
      )}

      {(mode === 'checking' || mode === 'loading') && (
        <p role="status" className="mt-6 text-muted">Looking around…</p>
      )}

      {mode === 'results' && (
        <>
          <p className="mt-2 text-muted">Tap the right one.</p>
          <ul className="mt-5 space-y-3">
            {nearby.map((r) => <PlaceRow key={r.place.externalId} r={r} onPick={onPick} />)}
          </ul>
          <button type="button" onClick={() => setMode('search')}
            className="mt-5 w-full py-3 text-base font-semibold text-tomato underline">
            Not here? Search by name
          </button>
        </>
      )}

      {mode === 'search' && (
        <div className="mt-3">
          {note && <p className="text-muted">{note}</p>}
          <label htmlFor="place-search" className="mt-4 block text-sm font-medium">Restaurant name</label>
          <input id="place-search" type="search" autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Joe's Pizza" className="mt-1 w-full rounded-xl border-2 border-line bg-card px-4 text-lg" />
          {searching && <p role="status" className="mt-4 text-muted">Searching…</p>}
          <ul className="mt-4 space-y-3">
            {found.map((r) => <PlaceRow key={r.place.externalId} r={r} onPick={onPick} />)}
          </ul>
          {!searching && query.trim().length >= 3 && found.length === 0 && (
            <p className="mt-4 text-muted">No matches yet. Try a different spelling.</p>
          )}
          {query.trim().length >= 2 && !searching && (
            <button type="button" onClick={() => onPick(manualPlace(query.trim(), origin))}
              className="mt-4 w-full rounded-2xl border-2 border-dashed border-line px-5 py-4 text-left">
              <span className="block font-semibold">Use “{query.trim()}” as the name</span>
              <span className="block text-sm text-muted">Handy when you're offline or it isn't listed.</span>
            </button>
          )}
          {nearby.length > 0 && (
            <button type="button" onClick={() => setMode('results')}
              className="mt-5 w-full py-3 text-base font-semibold text-tomato underline">
              Back to nearby spots
            </button>
          )}
        </div>
      )}
    </section>
  )
}
