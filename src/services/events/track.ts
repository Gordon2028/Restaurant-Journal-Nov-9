import type { AppEvent, EventName } from '../../domain/types'
import { eventRepo } from '../data/localRepos'
import { isSupabaseConfigured, supabase } from '../supabase/client'
import type { Json } from '../supabase/database.types'

/**
 * Privacy-respecting event log: user id + event name + small numeric/string props.
 * Never pass location, photo data, or free text. Saved on the device, and sent to the server
 * on a best-effort basis when signed in (a failed send is simply dropped).
 */
export async function track(userId: string, name: EventName, props: AppEvent['props'] = {}): Promise<void> {
  try {
    const event: AppEvent = { id: crypto.randomUUID(), userId, name, props, at: new Date().toISOString() }
    await eventRepo.add(event)
    if (isSupabaseConfigured && supabase && userId !== 'anonymous') {
      void supabase.from('events').insert({ id: event.id, name, props: props as Json, at: event.at }).then(() => {}, () => {})
    }
  } catch {
    /* analytics must never break the app */
  }
}
