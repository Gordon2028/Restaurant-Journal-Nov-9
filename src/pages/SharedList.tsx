import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { decodeSnapshot, mapLink, type SharedListSnapshot } from '../services/share/fragmentShare'
import { fetchSharedList } from '../services/share/ShareService'
import { track } from '../services/events/track'

/** Public, no-login page. Renders only what the link itself carries. */
export function SharedList() {
  const { hash } = useLocation()
  const { slug = '' } = useParams()
  const [snapshot, setSnapshot] = useState<SharedListSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  // Old-style links carry the list in the #fragment; newer links are looked up by slug.
  useEffect(() => {
    let live = true
    const fromLink = hash.length > 1 ? decodeSnapshot(hash.slice(1)) : null
    if (fromLink) {
      setSnapshot(fromLink)
      setLoading(false)
      void track('anonymous', 'shared_list_viewed', { places: fromLink.places.length })
      return
    }
    void fetchSharedList(slug).then((s) => {
      if (!live) return
      setSnapshot(s)
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [hash, slug])

  useEffect(() => {
    document.title = snapshot ? `${snapshot.title} · Plate` : 'Plate'
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex'
    document.head.appendChild(robots)
    return () => robots.remove()
  }, [snapshot])

  if (loading) return <p role="status" className="p-8 text-muted">Loading…</p>

  if (!snapshot) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-3xl font-bold">This link didn't work</h1>
        <p className="mt-3 text-muted">The list may have been switched off, or the link was cut off when it was copied. Ask your friend to send it again.</p>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-5 pb-16 pt-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-tomato">Plate</p>
      <h1 className="mt-2 text-4xl font-bold leading-tight">{snapshot.title}</h1>
      {snapshot.owner && <p className="mt-1 text-muted">Picked by {snapshot.owner}</p>}
      {snapshot.note && <p className="mt-4 text-lg">{snapshot.note}</p>}
      <ol className="mt-8 space-y-4">
        {snapshot.places.map((p, i) => (
          <li key={`${p.name}-${i}`} className="rounded-2xl border border-line bg-card p-5">
            {p.photo && (
              <img src={p.photo} alt={`${p.dish || 'Dish'} at ${p.name}`} loading="lazy" decoding="async"
                className="mb-4 aspect-[4/3] w-full rounded-xl object-cover" />
            )}
            <h2 className="font-display text-2xl font-bold">{p.name}</h2>
            <p className="mt-1 text-muted">{[p.neighborhood, p.cuisine].filter(Boolean).join(' · ')}</p>
            {p.dish && <p className="mt-3 text-lg"><span className="text-muted">Order: </span>{p.dish}</p>}
            {p.tags.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {p.tags.map((t) => <li key={t} className="rounded-full bg-blush px-3 py-1 text-sm">{t}</li>)}
              </ul>
            )}
            <a href={mapLink(p.lat, p.lng, p.name)} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center font-semibold text-tomato underline">Open in maps</a>
          </li>
        ))}
      </ol>
      <p className="mt-12 text-center text-sm text-muted">
        Made with <Link to="/" className="underline">Plate</Link>, a journal for the places you love.
      </p>
    </main>
  )
}
