import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Photo } from '../components/Photo'
import { TagPicker } from '../components/TagPicker'
import { useJournal } from '../hooks/useJournal'
import { visitRepo } from '../services/data/localRepos'

export function SpotDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { entries, loading, reload } = useJournal()
  const [confirming, setConfirming] = useState(false)
  const entry = entries.find((e) => e.visit.id === id)

  if (loading) return <p role="status" className="text-muted">Loading…</p>
  if (!entry) return (
    <main>
      <p>We couldn't find that spot.</p>
      <Link to="/spots" className="font-semibold text-tomato underline">Back to my spots</Link>
    </main>
  )
  const { visit, place } = entry
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=18/${place.lat}/${place.lng}`

  async function setTags(tags: string[]) {
    await visitRepo.update(visit.id, { tags })
    await reload()
  }
  async function remove() {
    await visitRepo.remove(visit.id)
    nav('/spots', { replace: true })
  }

  return (
    <main>
      <Link to="/spots" className="inline-flex items-center text-muted">← My spots</Link>
      <Photo photoKey={visit.photoKey} alt={`${visit.dishName || 'Dish'} at ${place.name}`}
        fallbackLabel={visit.dishName || place.name} className="mt-3 aspect-[4/3] w-full rounded-2xl text-2xl" />
      <h1 className="mt-4 text-3xl font-bold leading-tight">
        {place.name} <span role="img" aria-label={visit.rating === 'up' ? 'Loved it' : 'Not for me'}>{visit.rating === 'up' ? '👍' : '👎'}</span>
      </h1>
      {visit.dishName && <p className="mt-1 text-xl">{visit.dishName}</p>}
      <p className="mt-1 text-muted">
        {[place.neighborhood, place.cuisine, place.address].filter(Boolean).join(' · ')}
      </p>
      <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center font-semibold text-tomato underline">
        See on map
      </a>
      <h2 className="mt-8 text-lg font-semibold">Vibe</h2>
      <div className="mt-3"><TagPicker value={visit.tags} onChange={(t) => void setTags(t)} /></div>
      <div className="mt-10 border-t border-line pt-4">
        {confirming ? (
          <div className="flex gap-3">
            <button onClick={() => void remove()} className="flex-1 rounded-xl bg-tomato-dark px-4 font-semibold text-white">Yes, delete</button>
            <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border-2 border-line px-4 font-semibold">Keep it</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-muted underline">Delete this visit</button>
        )}
      </div>
    </main>
  )
}
