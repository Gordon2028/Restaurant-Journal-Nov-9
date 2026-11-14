import type { JournalEntry, ShareList } from '../../domain/types'
import { isSupabaseConfigured, supabaseUrl } from '../supabase/client'
import { buildShareUrl, buildSnapshot, sanitizeSnapshot, type SharedListSnapshot } from './fragmentShare'

/**
 * Online (Supabase configured): a short link, `/l/{slug}`, served from the database via an Edge Function.
 * Offline/local-only: the older stand-in where the link itself carries a text-only snapshot.
 */
export function shareUrlFor(list: ShareList, entries: JournalEntry[], ownerName: string, origin: string): string {
  return isSupabaseConfigured ? `${origin}/l/${list.slug}` : buildShareUrl(origin, list.slug, buildSnapshot(list, entries, ownerName))
}

export async function fetchSharedList(slug: string): Promise<SharedListSnapshot | null> {
  if (!isSupabaseConfigured) return null
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/shared-list?slug=${encodeURIComponent(slug)}`)
    if (!res.ok) return null
    // Only photos hosted by our own storage are allowed to render.
    return sanitizeSnapshot(await res.json(), (u) => u.startsWith(`${supabaseUrl}/storage/v1/`))
  } catch {
    return null
  }
}
