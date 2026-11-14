import { Link } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { Photo } from '../components/Photo'
import { useJournal } from '../hooks/useJournal'

export function BestDishes() {
  const { entries, loading } = useJournal()
  const loved = entries.filter((e) => e.visit.rating === 'up' && (e.visit.photoKey || e.visit.dishName))
  return (
    <main>
      <h1 className="text-3xl font-bold">Best things I've eaten</h1>
      {!loading && loved.length === 0 ? (
        <EmptyState title="No favorites yet" body="Give a dish a thumbs up and it will show up here." />
      ) : (
        <ul className="mt-5 grid grid-cols-2 gap-3">
          {loved.map(({ visit, place }) => (
            <li key={visit.id}>
              <Link to={`/spots/${visit.id}`} className="relative block overflow-hidden rounded-2xl">
                <Photo photoKey={visit.photoKey} alt={`${visit.dishName || 'Dish'} at ${place.name}`}
                  fallbackLabel={visit.dishName || place.name} className="aspect-square w-full text-lg" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-white">
                  <span className="block truncate font-display font-bold">{visit.dishName || place.name}</span>
                  {visit.dishName && <span className="block truncate text-xs opacity-90">{place.name}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
