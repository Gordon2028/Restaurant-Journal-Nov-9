import { useRef, useState } from 'react'
import type { LatLng } from '../../domain/places/match'
import { readPhotoLocation } from '../../services/images/exif'
import { compressImage } from '../../services/images/resize'
import { BigButton } from '../BigButton'

interface Props {
  onDone: (photo: Blob | null, exifLocation: LatLng | null) => void
}

export function PhotoStep({ onDone }: Props) {
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handle(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      // Read GPS from the original first: compressing removes it.
      const [loc, photo] = await Promise.all([readPhotoLocation(file), compressImage(file)])
      onDone(photo, loc)
    } catch {
      setError("That photo couldn't be read. Try another, or skip it.")
      setBusy(false)
    }
  }

  return (
    <section>
      <h1 className="text-3xl font-bold leading-tight">Snap the dish</h1>
      <p className="mt-2 text-muted">A photo makes it easy to remember later.</p>
      <div className="mt-8 space-y-4">
        <BigButton onClick={() => camera.current?.click()} disabled={busy} className="py-6 text-xl">
          {busy ? 'One moment…' : 'Take a photo'}
        </BigButton>
        <BigButton variant="quiet" onClick={() => gallery.current?.click()} disabled={busy}>
          Choose from my photos
        </BigButton>
        <button
          type="button"
          onClick={() => onDone(null, null)}
          disabled={busy}
          className="w-full py-3 text-base font-medium text-muted underline"
        >
          Skip the photo
        </button>
      </div>
      {error && <p role="alert" className="mt-4 text-tomato-dark">{error}</p>}
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden
        data-testid="photo-camera" onChange={(e) => void handle(e.target.files?.[0])} />
      <input ref={gallery} type="file" accept="image/*" hidden
        data-testid="photo-gallery" onChange={(e) => void handle(e.target.files?.[0])} />
    </section>
  )
}
