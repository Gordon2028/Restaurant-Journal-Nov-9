import type { Profile } from '../../domain/types'
import type { AuthService, SignInResult } from './AuthService'

const KEY = 'plate.profile'

function read(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}

const listeners = new Set<(u: Profile | null) => void>()
const emit = (u: Profile | null) => listeners.forEach((l) => l(u))

/** Stand-in: there are no real accounts here, so the password is ignored. */
async function enter(email: string): Promise<SignInResult> {
  const clean = email.trim().toLowerCase()
  const existing = read()
  const profile: Profile =
    existing && existing.email === clean
      ? existing
      : { id: crypto.randomUUID(), email: clean, displayName: clean.split('@')[0], createdAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(profile))
  emit(profile)
  return { status: 'signed-in' }
}

export const localAuth: AuthService = {
  mode: 'local',
  async init() {
    return read()
  },
  getCurrentUser: read,
  signUp: (email) => enter(email),
  signIn: (email) => enter(email),
  async signInWithGoogle() {
    throw new Error('Google sign-in needs the online version.')
  },
  async signOut() {
    localStorage.removeItem(KEY)
    emit(null)
  },
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
