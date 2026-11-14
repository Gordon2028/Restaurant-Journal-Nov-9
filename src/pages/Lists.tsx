import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BigButton } from '../components/BigButton'
import { makeSlug } from '../domain/slug'
import type { ShareList } from '../domain/types'
import { useAuth } from '../hooks/useAuth'
import { useJournal } from '../hooks/useJournal'
import { useLists } from '../hooks/useLists'
import { listRepo } from '../services/data/localRepos'
import { track } from '../services/events/track'

export function Lists() {
  const { user } = useAuth()
  const nav = useNavigate()
  const { entries } = useJournal()
  const { lists, loading } = useLists()

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of entries) {
      if (e.visit.rating !== 'up') continue
      for (const t of e.visit.tags) m.set(t, (m.get(t) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [entries])

  async function create(title: string, visitIds: string[]) {
    if (!user) return
    const list: ShareList = {
      id: crypto.randomUUID(), userId: user.id, title, description: '', slug: makeSlug(), isPublic: false,
      showOwnerName: false, shareDishes: true, shareTags: true, sharePhotos: true, visitIds, createdAt: new Date().toISOString(),
    }
    await listRepo.save(list)
    void track(user.id, 'list_created', { places: visitIds.length, fromTag: visitIds.length > 0 })
    nav(`/lists/${list.id}`)
  }

  const fromTag = (tag: string) =>
    create(tag.charAt(0).toUpperCase() + tag.slice(1), entries.filter((e) => e.visit.rating === 'up' && e.visit.tags.includes(tag)).map((e) => e.visit.id))

  return (
    <main>
      <h1 className="text-3xl font-bold">Lists</h1>
      <p className="mt-2 text-muted">Pick your favorites and send a friend one link.</p>
      <BigButton className="mt-5" onClick={() => void create('My list', [])}>New list</BigButton>

      {tagCounts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Or start from a vibe</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {tagCounts.map(([tag, n]) => (
              <button key={tag} type="button" onClick={() => void fromTag(tag)}
                className="rounded-full border-2 border-line bg-card px-4 py-2 font-medium">
                {tag} <span className="text-muted">({n})</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!loading && lists.length > 0 && (
        <ul className="mt-8 space-y-3">
          {lists.map((l) => (
            <li key={l.id}>
              <Link to={`/lists/${l.id}`} className="block rounded-2xl border border-line bg-card p-4">
                <span className="block font-display text-lg font-bold">{l.title}</span>
                <span className="text-sm text-muted">
                  {l.visitIds.length} {l.visitIds.length === 1 ? 'place' : 'places'}{l.isPublic ? ' · shared' : ' · private'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
