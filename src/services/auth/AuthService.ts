import type { Profile } from '../../domain/types'

/** `check-email` only happens if the project requires email confirmation before first sign-in. */
export type SignInResult = { status: 'signed-in' } | { status: 'check-email' }

export const MIN_PASSWORD_LENGTH = 8

/**
 * Seam for authentication. `local` is a stand-in with no real accounts (used when Supabase
 * isn't configured, and in tests; it ignores passwords). `supabase` uses email + password and
 * optionally Google.
 */
export interface AuthService {
  readonly mode: 'local' | 'supabase'
  /** Resolve the starting session. Call once at startup. */
  init(): Promise<Profile | null>
  getCurrentUser(): Profile | null
  /** Create a new account. */
  signUp(email: string, password: string): Promise<SignInResult>
  /** Sign in to an existing account. */
  signIn(email: string, password: string): Promise<SignInResult>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  subscribe(listener: (user: Profile | null) => void): () => void
}
