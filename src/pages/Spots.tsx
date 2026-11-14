import { useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { SpotCard } from '../components/SpotCard'
import { applyFilters, NO_FILTERS, rankEntries, type Filters } from '../domain/ranking/rank'
import { PRESET_TAGS } from '../domain/tags'
import { useAuth } from '../hooks/useAuth'
import { useJournal } from '../hooks/useJournal'
import { track } from '../services/events/track'

export function Spots() {
  const { user } = useAuth()
  const { entries, loading } = useJournal()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)

  const neighborhoods = useMemo(
    () => [...new Set(entries.map((e) => e.place.neighborhood).filter(Boolean))].sort(),
    [entries],
  )
  const tags = useMemo(
    () => [...new Set([...PRESET_TAGS, ...entries.flatMap((e) => e.visit.tags)])].filter((t) =>
      entries.some((e) => e.visit.tags.includes(t))),
    [entries],
  )
  const results = useMemo(() => rankEntries(applyFilters(entries, filters), query), [entries, filters, query])

  // Log a search once the user pauses typing.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2 || !user) return
    const t = setTimeout(() => void track(user.id, 'search_performed', { length: q.length, results: results.length }), 900)
    return () => clearTimeout(t)
  }, [query, results.length, user])

  const filtering = filters.upOnly || filters.neighborhood || filters.tag || query.trim()

  return (
    <main>
      <h1 className="text-3xl font-bold">My spots</h1>
      {!loading && entries.length === 0 ? (
        <EmptyState title="Nothing here yet" body="Add the last three places you remember. It takes a few seconds each." />
      ) : (
        <>
          <label htmlFor="search" className="sr-only">Search your spots</label>
          <input id="search" type="search" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dish, place, neighborhood, vibe…"
            className="mt-4 w-full rounded-xl border-2 border-line bg-card px-4 text-lg" />

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filters">
            <button type="button" aria-pressed={filters.upOnly}
              onClick={() => setFilters({ ...filters, upOnly: !filters.upOnly })}
              className={`shrink-0 rounded-full border-2 px-4 py-2 font-medium ${filters.upOnly ? 'border-ink bg-ink text-paper' : 'border-line bg-card'}`}>
              👍 Loved only
            </button>
            <select aria-label="Neighborhood" value={filters.neighborhood}
              onChange={(e) => setFilters({ ...filters, neighborhood: e.target.value })}
              className="shrink-0 rounded-full border-2 border-line bg-card px-3">
              <option value="">All neighborhoods</option>
              {neighborhoods.map((n) => <option key={n}>{n}</option>)}
            </select>
            <select aria-label="Vibe" value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
              className="shrink-0 rounded-full border-2 border-line bg-card px-3">
              <option value="">Any vibe</option>
              {tags.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <p aria-live="polite" className="mt-3 text-sm text-muted">
            {results.length} {results.length === 1 ? 'spot' : 'spots'}{filtering ? ' match' : ''}
          </p>
          <ul className="mt-2 space-y-3">
            {results.map(({ entry }) => (
              <SpotCard key={entry.visit.id} entry={entry}
                onOpen={() => user && void track(user.id, 'recall_result_opened', { fromSearch: query.trim().length > 0 })} />
            ))}
          </ul>
          {results.length === 0 && <p className="mt-6 text-muted">No matches. Try fewer words or clear the filters.</p>}
        </>
      )}
    </main>
  )
}
