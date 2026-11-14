import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ShareButton } from '../components/ShareButton'
import type { ShareList } from '../domain/types'
import { useAuth } from '../hooks/useAuth'
import { useJournal } from '../hooks/useJournal'
import { listRepo } from '../services/data/localRepos'
import { track } from '../services/events/track'
import { outbox } from '../services/data/localRepos'
import { MAX_SHARED_PLACES } from '../services/share/fragmentShare'
import { shareUrlFor } from '../services/share/ShareService'
import { isSupabaseConfigured } from '../services/supabase/client'
import { useSync } from '../hooks/useSync'

export function ListEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const { user } = useAuth()
  const { entries } = useJournal()
  const [list, setList] = useState<ShareList | null | undefined>(undefined)
  const [confirming, setConfirming] = useState(false)
  const sync = useSync()
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (id) void listRepo.get(id).then((l) => setList(l ?? null))
  }, [id])

  const url = useMemo(() => {
    if (!list || !user) return ''
    return shareUrlFor(list, entries, user.displayName, window.location.origin)
  }, [list, entries, user])

  // Online links only work once the list and its places have reached the server.
  useEffect(() => {
    if (!isSupabaseConfigured || !list) return
    let live = true
    void outbox.keys().then((keys) => {
      if (live) setReady(!keys.has(`list:${list.id}`) && list.visitIds.every((v) => !keys.has(`visit:${v}`)))
    })
    return () => {
      live = false
    }
  }, [list, sync.syncing, sync.pending])

  if (list === undefined) return <p role="status" className="text-muted">Loading…</p>
  if (list === null || !user) return (
    <main><p>We couldn't find that list.</p><Link to="/lists" className="font-semibold text-tomato underline">Back to lists</Link></main>
  )

  function patch(p: Partial<ShareList>) {
    const next = { ...list!, ...p }
    setList(next)
    void listRepo.save(next)
  }
  const toggle = (visitId: string) => {
    const has = list.visitIds.includes(visitId)
    if (!has && list.visitIds.length >= MAX_SHARED_PLACES) return
    patch({ visitIds: has ? list.visitIds.filter((x) => x !== visitId) : [...list.visitIds, visitId] })
  }
  const canShare = list.title.trim().length > 0 && list.visitIds.length > 0
  const sorted = [...entries].sort((a, b) => Number(b.visit.rating === 'up') - Number(a.visit.rating === 'up'))

  return (
    <main>
      <Link to="/lists" className="inline-flex items-center text-muted">← Lists</Link>
      <label htmlFor="title" className="mt-3 block text-sm font-medium">Title</label>
      <input id="title" value={list.title} maxLength={100} onChange={(e) => patch({ title: e.target.value })}
        placeholder="John's Top 10 for Visitors" className="mt-1 w-full rounded-xl border-2 border-line bg-card px-4 text-xl font-display font-bold" />
      <label htmlFor="note" className="mt-4 block text-sm font-medium">A short note <span className="text-muted">(optional)</span></label>
      <textarea id="note" value={list.description} maxLength={280} rows={2} onChange={(e) => patch({ description: e.target.value })}
        placeholder="Where I take everyone who visits." className="mt-1 w-full rounded-xl border-2 border-line bg-card px-4 py-2 text-lg" />

      <h2 className="mt-6 text-lg font-semibold">Places ({list.visitIds.length})</h2>
      {entries.length === 0 && <p className="mt-2 text-muted">Save a few spots first, then add them here.</p>}
      <ul className="mt-2 space-y-2">
        {sorted.map(({ visit, place }) => (
          <li key={visit.id}>
            <label className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-card px-4 py-2">
              <input type="checkbox" className="size-6 accent-[var(--color-tomato)]" checked={list.visitIds.includes(visit.id)} onChange={() => toggle(visit.id)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{place.name} {visit.rating === 'up' ? '👍' : '👎'}</span>
                <span className="block truncate text-sm text-muted">{[visit.dishName, place.neighborhood].filter(Boolean).join(' · ')}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-2xl border border-line bg-card p-4">
        <h2 className="text-lg font-semibold">Share with a link</h2>
        <label className="mt-2 flex min-h-11 items-center gap-3 font-medium">
          <input type="checkbox" className="size-6 accent-[var(--color-tomato)]" checked={list.isPublic}
            onChange={(e) => patch({ isPublic: e.target.checked })} />
          Anyone with the link can view this list
        </label>
        {!list.isPublic && <p className="mt-1 text-sm text-muted">Private. Only you can see it.</p>}
        {list.isPublic && (
          <>
            <p className="mt-3 text-sm text-muted">Friends see place names, neighborhoods and map links. Never when you went or where you live.</p>
            {([
              ['shareDishes', 'The dish you had'],
              ['shareTags', 'Vibe tags'],
              ...(isSupabaseConfigured ? [['sharePhotos', 'Photos'] as const] : []),
              ['showOwnerName', 'My first name'],
            ] as const).map(([key, label]) => (
              <label key={key} className="mt-2 flex min-h-11 items-center gap-3">
                <input type="checkbox" className="size-6 accent-[var(--color-tomato)]" checked={list[key]} onChange={(e) => patch({ [key]: e.target.checked })} />
                {label}
              </label>
            ))}
            <div className="mt-4">
              <ShareButton url={url} title={list.title || 'My list'} disabled={!canShare || !ready}
                onShared={() => void track(user.id, 'list_shared', { places: list.visitIds.length })} />
              {!canShare && <p className="mt-2 text-sm text-muted">Add a title and at least one place to share.</p>}
              {canShare && !ready && <p role="status" className="mt-2 text-sm text-muted">Getting your link ready…</p>}
            </div>
            <p className="mt-3 text-sm text-muted">
              {isSupabaseConfigured ? 'Turn the box above off any time to stop sharing.' : "Links already sent can't be switched off until Plate has accounts online."}{' '}
              <Link to={isSupabaseConfigured ? `/l/${list.slug}` : `/l/${list.slug}#${url.split('#')[1]}`} className="font-semibold text-tomato underline">Preview it</Link>
            </p>
          </>
        )}
      </section>

      <div className="mt-8 border-t border-line pt-4">
        {confirming ? (
          <div className="flex gap-3">
            <button onClick={() => void listRepo.remove(list.id).then(() => nav('/lists', { replace: true }))}
              className="flex-1 rounded-xl bg-tomato-dark px-4 font-semibold text-white">Yes, delete list</button>
            <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border-2 border-line px-4 font-semibold">Keep it</button>
          </div>
        ) : <button onClick={() => setConfirming(true)} className="text-muted underline">Delete this list</button>}
      </div>
    </main>
  )
}
