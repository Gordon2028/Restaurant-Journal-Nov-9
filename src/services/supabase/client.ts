import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** True when both public Supabase values are present. Otherwise the app runs in local-only mode. */
export const isSupabaseConfigured = Boolean(url && key)

/** The browser client. Uses the publishable key only; row access is enforced by RLS. */
export const supabase = isSupabaseConfigured
  ? createClient<Database>(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export const supabaseUrl = url ?? ''

/** Get the client or fail loudly. Only call from code paths guarded by `isSupabaseConfigured`. */
export function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}
