import { Link } from 'react-router-dom'
import type { JournalEntry } from '../domain/types'
import { Photo } from './Photo'

export function SpotCard({ entry, onOpen }: { entry: JournalEntry; onOpen?: () => void }) {
  const { visit, place } = entry
  const sub = [visit.dishName, place.neighborhood].filter(Boolean).join(' · ')
  return (
    <li>
      <Link
        to={`/spots/${visit.id}`}
        onClick={onOpen}
        className="flex items-center gap-4 rounded-2xl border border-line bg-card p-3 active:scale-[0.99]"
      >
        <Photo
          photoKey={visit.photoKey}
          alt={`${visit.dishName || 'Dish'} at ${place.name}`}
          fallbackLabel={visit.dishName || place.name}
          className="size-20 shrink-0 rounded-xl text-sm"
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-lg font-bold">{place.name}</span>
            <span role="img" aria-label={visit.rating === 'up' ? 'Loved it' : 'Not for me'}>
              {visit.rating === 'up' ? '👍' : '👎'}
            </span>
          </span>
          {sub && <span className="block truncate text-sm text-muted">{sub}</span>}
          {visit.tags.length > 0 && (
            <span className="mt-1 block truncate text-xs text-muted">{visit.tags.join(' · ')}</span>
          )}
        </span>
      </Link>
    </li>
  )
}
