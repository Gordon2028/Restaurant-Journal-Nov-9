// Public, no-login endpoint that serves one shared list. Deployed with verify_jwt = false.
// Reads with the service role (bypasses RLS) so it MUST build the response from an explicit whitelist.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}
interface Row {
  visit: {
    user_id: string
    rating: string
    dish_name: string
    photo_path: string
    tags: string[]
    place: { name: string; neighborhood: string; cuisine: string; lat: number; lng: number }
  } | null
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)

  const slug = new URL(req.url).searchParams.get('slug') ?? ''
  if (!/^[A-Za-z0-9]{8,32}$/.test(slug)) return json({ error: 'not_found' }, 404)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })

  const { data: list, error: listError } = await sb
    .from('lists')
    .select('id, user_id, title, description, show_owner_name, share_dishes, share_tags, share_photos')
    .eq('slug', slug)
    .eq('is_public', true)
    .maybeSingle()
  if (listError) return json({ error: 'server_error' }, 500)
  if (!list) return json({ error: 'not_found' }, 404)

  const { data: items, error: itemsError } = await sb
    .from('list_items')
    .select('position, visit:visits!inner(user_id, rating, dish_name, photo_path, tags, place:places!inner(name, neighborhood, cuisine, lat, lng))')
    .eq('list_id', list.id)
    .order('position')
  if (itemsError) return json({ error: 'server_error' }, 500)

  // Defense in depth: only visits owned by the list's owner.
  const rows = ((items ?? []) as unknown as Row[])
    .flatMap((i) => (i.visit && i.visit.user_id === list.user_id ? [i.visit] : []))
    .slice(0, 40)

  const photoPaths: string[] = list.share_photos
    ? rows.map((v) => v.photo_path).filter((p) => p && p.startsWith(`${list.user_id}/`))
    : []
  const signed = new Map<string, string>()
  if (photoPaths.length) {
    const { data } = await sb.storage.from('visit-photos').createSignedUrls(photoPaths, 3600)
    for (const s of data ?? []) if (s.signedUrl && s.path) signed.set(s.path, s.signedUrl)
  }

  let owner = ''
  if (list.show_owner_name) {
    const { data } = await sb.from('profiles').select('display_name').eq('id', list.user_id).maybeSingle()
    owner = (data?.display_name ?? '').split(/\s+/)[0] ?? ''
  }

  const places = rows.map((v) => {
    const photo = signed.get(v.photo_path)
    return {
      name: v.place.name,
      neighborhood: v.place.neighborhood,
      cuisine: v.place.cuisine,
      dish: list.share_dishes ? v.dish_name : '',
      rating: v.rating,
      tags: list.share_tags ? v.tags : [],
      lat: Math.round(v.place.lat * 1e5) / 1e5,
      lng: Math.round(v.place.lng * 1e5) / 1e5,
      ...(photo ? { photo } : {}),
    }
  })

  // Anonymous view count for the team's metrics. Never blocks or fails the page.
  await sb.from('events').insert({ user_id: null, name: 'shared_list_viewed', props: { places: places.length } }).then(() => {}, () => {})

  return json({ v: 1, title: list.title, note: list.description, owner, places })
})
