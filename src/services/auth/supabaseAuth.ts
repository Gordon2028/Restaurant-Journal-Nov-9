import type { User } from '@supabase/supabase-js'
import type { Profile } from '../../domain/types'
import { requireSupabase } from '../supabase/client'
import type { AuthService } from './AuthService'

function toProfile(u: User): Profile {
  const email = u.email ?? ''
  const meta = u.user_metadata as Record<string, unknown> | undefined
  // Display only; never used for authorization (user_metadata is user-editable).
  const fromProvider = typeof meta?.full_name === 'string' ? meta.full_name : typeof meta?.name === 'string' ? meta.name : ''
  return { id: u.id, email, displayName: fromProvider.trim() || email.split('@')[0] || 'friend', createdAt: u.created_at }
}

let current: Profile | null = null
let started = false
const listeners = new Set<(u: Profile | null) => void>()
const emit = () => listeners.forEach((l) => l(current))

/** Map Supabase auth errors to plain, non-leaky messages. */
export function friendlyAuthError(message: string, action: 'sign-up' | 'sign-in'): string {
  if (/rate limit|too many|security purposes/i.test(message)) return 'Too many attempts. Please wait a minute and try again.'
  if (/already registered|already been registered|already exists/i.test(message)) return 'That email already has an account. Try signing in instead.'
  if (/invalid login credentials/i.test(message)) return "That email and password don't match."
  if (/email not confirmed/i.test(message)) return 'Please confirm your email first, then sign in.'
  if (/invalid.*email|unable to validate email/i.test(message)) return "That email doesn't look right."
  if (/password/i.test(message)) return 'Choose a stronger password (at least 8 characters).'
  return action === 'sign-up' ? "We couldn't create your account. Check your connection and try again." : "We couldn't sign you in. Check your connection and try again."
}

export const supabaseAuth: AuthService = {
  mode: 'supabase',

  async init() {
    const sb = requireSupabase()
    if (!started) {
      started = true
      // Callback must not call other Supabase methods (can deadlock); it only records and notifies.
      sb.auth.onAuthStateChange((_event, session) => {
        current = session ? toProfile(session.user) : null
        emit()
      })
    }
    const { data } = await sb.auth.getSession()
    current = data.session ? toProfile(data.session.user) : null
    return current
  },

  getCurrentUser: () => current,

  async signUp(email, password) {
    const { data, error } = await requireSupabase().auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) throw new Error(friendlyAuthError(error.message, 'sign-up'))
    // No session means the project requires email confirmation first.
    return { status: data.session ? 'signed-in' : 'check-email' }
  },

  async signIn(email, password) {
    const { error } = await requireSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) throw new Error(friendlyAuthError(error.message, 'sign-in'))
    return { status: 'signed-in' }
  },

  async signInWithGoogle() {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
    if (error) throw new Error("Google sign-in isn't available right now.")
  },

  async signOut() {
    await requireSupabase().auth.signOut()
    current = null
    emit()
  },

  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
