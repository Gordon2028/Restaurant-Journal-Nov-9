import { useState } from 'react'
import type { Rating } from '../../domain/types'
import { BigButton } from '../BigButton'
import { ThumbsToggle } from '../ThumbsToggle'

interface Props {
  placeName: string
  photoUrl: string | null
  saving: boolean
  error: string
  onSave: (rating: Rating, dishName: string) => void
}

export function RateStep({ placeName, photoUrl, saving, error, onSave }: Props) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [dish, setDish] = useState('')
  return (
    <section>
      <div className="flex items-center gap-4">
        {photoUrl && <img src={photoUrl} alt={`Your photo from ${placeName}`} className="size-16 rounded-xl object-cover" />}
        <h1 className="text-2xl font-bold leading-tight">{placeName}</h1>
      </div>
      <div className="mt-6"><ThumbsToggle value={rating} onChange={setRating} /></div>
      <label htmlFor="dish" className="mt-6 block text-sm font-medium">What did you have? <span className="text-muted">(optional)</span></label>
      <input id="dish" value={dish} onChange={(e) => setDish(e.target.value)} maxLength={80}
        placeholder="e.g. Cacio e pepe" autoComplete="off"
        className="mt-1 w-full rounded-xl border-2 border-line bg-card px-4 text-lg" />
      {error && <p role="alert" className="mt-3 text-tomato-dark">{error}</p>}
      <BigButton className="mt-6" disabled={!rating || saving}
        onClick={() => rating && onSave(rating, dish.trim())}>
        {saving ? 'Saving…' : 'Save'}
      </BigButton>
    </section>
  )
}
