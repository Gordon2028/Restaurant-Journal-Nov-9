// Deletes the signed-in user's account and all their data. Deployed with verify_jwt = true.
// Needs the service role (server-side only) to remove the auth user and storage objects.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'unauthorized' }, 401)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
  const { data, error } = await admin.auth.getUser(token) // validates the caller's token
  if (error || !data.user) return json({ error: 'unauthorized' }, 401)
  const uid = data.user.id

  // 1. Photos (only this user's folder).
  for (let i = 0; i < 50; i++) {
    const { data: files } = await admin.storage.from('visit-photos').list(uid, { limit: 1000 })
    if (!files || files.length === 0) break
    await admin.storage.from('visit-photos').remove(files.map((f) => `${uid}/${f.name}`))
    if (files.length < 1000) break
  }

  // 2. The account. Foreign keys cascade: profile, visits, lists, list items, events.
  const { error: delError } = await admin.auth.admin.deleteUser(uid)
  if (delError) return json({ error: 'delete_failed' }, 500)

  // 3. Hand-typed places this user created (they were private to them).
  await admin.from('places').delete().is('created_by', null).like('external_id', 'manual:%')

  return json({ ok: true })
})
