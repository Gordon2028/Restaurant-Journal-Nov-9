import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BigButton } from '../components/BigButton'
import { useAuth } from '../hooks/useAuth'
import { MIN_PASSWORD_LENGTH } from '../services/auth/AuthService'

const GOOGLE = import.meta.env.VITE_ENABLE_GOOGLE === 'true'

type Mode = 'sign-in' | 'sign-up'

export function Login() {
  const { user, ready, auth } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<Mode>('sign-up')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [confirmEmailFor, setConfirmEmailFor] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (!ready) return <p role="status" className="p-8 text-muted">Loading…</p>
  if (user) return <Navigate to="/" replace />

  const online = auth.mode === 'supabase'
  const creating = mode === 'sign-up'

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) return
    if (online && creating && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = creating ? await auth.signUp(email, password) : await auth.signIn(email, password)
      if (res.status === 'signed-in') nav('/', { replace: true })
      else setConfirmEmailFor(email.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  async function google() {
    setError('')
    try {
      await auth.signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  function switchMode() {
    setMode(creating ? 'sign-in' : 'sign-up')
    setError('')
  }

  if (confirmEmailFor) {
    return (
      <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6">
        <h1 className="text-4xl font-bold text-tomato">Check your email</h1>
        <p className="mt-4 text-xl leading-snug">We sent a confirmation link to <strong>{confirmEmailFor}</strong>. Tap it, then come back and sign in.</p>
        <p className="mt-4 text-muted">It can take a minute, and check spam if you don't see it.</p>
        <button
          type="button"
          onClick={() => { setConfirmEmailFor(''); setMode('sign-in') }}
          className="mt-8 self-start py-3 font-semibold text-tomato underline"
        >
          Back to sign in
        </button>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6">
      <h1 className="text-6xl font-bold tracking-tight text-tomato">Plate</h1>
      <p className="mt-4 text-xl leading-snug">Remember every great meal, and tell your friends exactly where to go.</p>
      <form onSubmit={submit} className="mt-10 space-y-4">
        <label className="block text-sm font-medium" htmlFor="email">Your email</label>
        <input id="email" type="email" inputMode="email" autoComplete="email" required value={email}
          onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-lg" />
        {online && (
          <>
            <label className="block text-sm font-medium" htmlFor="password">Password</label>
            <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} required value={password}
                autoComplete={creating ? 'new-password' : 'current-password'}
                minLength={creating ? MIN_PASSWORD_LENGTH : undefined}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={creating ? 'password-hint' : undefined}
                className="w-full rounded-xl border-2 border-line bg-card py-3 pl-4 pr-20 text-lg" />
              <button type="button" onClick={() => setShowPassword((s) => !s)} aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-tomato">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {creating && <p id="password-hint" className="text-sm text-muted">At least {MIN_PASSWORD_LENGTH} characters.</p>}
          </>
        )}
        <BigButton type="submit" disabled={busy}>
          {busy ? 'One moment…' : !online ? 'Get started' : creating ? 'Create account' : 'Sign in'}
        </BigButton>
        {GOOGLE && online && (
          <BigButton type="button" variant="quiet" onClick={() => void google()}>Continue with Google</BigButton>
        )}
      </form>
      {error && <p role="alert" className="mt-4 text-tomato-dark">{error}</p>}
      {online ? (
        <p className="mt-6 text-muted">
          {creating ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" onClick={switchMode} className="py-2 font-semibold text-tomato underline">
            {creating ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      ) : (
        <p className="mt-6 text-sm text-muted">Preview mode: nothing is emailed, and your spots stay on this phone.</p>
      )}
    </main>
  )
}
