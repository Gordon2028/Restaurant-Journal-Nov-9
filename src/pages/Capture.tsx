import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DoneStep } from '../components/capture/DoneStep'
import { PhotoStep } from '../components/capture/PhotoStep'
import { PlaceStep } from '../components/capture/PlaceStep'
import { RateStep } from '../components/capture/RateStep'
import type { LatLng, PlaceCandidate } from '../domain/places/match'
import type { Rating } from '../domain/types'
import { useAuth } from '../hooks/useAuth'
import { useObjectUrl } from '../hooks/useObjectUrl'
import { placeRepo, visitRepo } from '../services/data/localRepos'
import { track } from '../services/events/track'
import { getPlacesProvider } from '../services/places'

type Step = 'photo' | 'place' | 'rate' | 'done'
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function Capture() {
  const { user } = useAuth()
  const [round, setRound] = useState(0) // bump to start a fresh capture
  return <CaptureFlow key={round} userId={user!.id} onAnother={() => setRound((r) => r + 1)} />
}

function CaptureFlow({ userId, onAnother }: { userId: string; onAnother: () => void }) {
  const [step, setStep] = useState<Step>('photo')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [exifLoc, setExifLoc] = useState<LatLng | null>(null)
  const [place, setPlace] = useState<PlaceCandidate | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState('')
  const [startedAt] = useState(() => Date.now())
  const enrichment = useRef<Promise<PlaceCandidate> | null>(null)
  const logged = useRef(false)
  const photoUrl = useObjectUrl(photo)

  useEffect(() => {
    if (logged.current) return
    logged.current = true
    void track(userId, 'capture_started')
  }, [userId])

  function pickPlace(p: PlaceCandidate) {
    setPlace(p)
    enrichment.current = getPlacesProvider().enrich(p) // fills neighborhood while the user rates
    setStep('rate')
  }

  async function save(rating: Rating, dishName: string) {
    if (!place) return
    setSaving(true)
    setError('')
    try {
      const details = await Promise.race([enrichment.current ?? Promise.resolve(place), wait(1500).then(() => place)])
      const stored = await placeRepo.upsert(details)
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      await visitRepo.add(
        {
          id, userId, placeId: stored.id, rating, dishName, photoKey: photo ? `${id}.jpg` : '',
          note: '', tags: [], visitedAt: now, createdAt: now, syncStatus: 'pending',
        },
        photo ?? undefined,
      )
      void track(userId, 'capture_completed', {
        seconds: Math.round((Date.now() - startedAt) / 100) / 10,
        hasPhoto: photo !== null,
        hasDish: dishName.length > 0,
      })
      setSavedId(id)
      setStep('done')
    } catch {
      setError("Couldn't save that. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main>
      {step !== 'done' && (
        <Link to="/" className="mb-4 inline-flex items-center text-base font-medium text-muted">✕ Close</Link>
      )}
      {step === 'photo' && (
        <PhotoStep onDone={(p, loc) => { setPhoto(p); setExifLoc(loc); setStep('place') }} />
      )}
      {step === 'place' && <PlaceStep exifLocation={exifLoc} onPick={pickPlace} />}
      {step === 'rate' && place && (
        <RateStep placeName={place.name} photoUrl={photoUrl} saving={saving} error={error} onSave={save} />
      )}
      {step === 'done' && place && <DoneStep visitId={savedId} placeName={place.name} onAnother={onAnother} />}
    </main>
  )
}
