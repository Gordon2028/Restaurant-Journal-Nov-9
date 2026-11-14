import { Link } from 'react-router-dom'
import { BigLink } from '../components/BigLink'
import { useAuth } from '../hooks/useAuth'

export function Home() {
  const { user } = useAuth()
  return (
    <main>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">Hi {user?.displayName}</p>
        <Link to="/settings" className="inline-flex items-center text-sm font-medium text-muted underline">Settings</Link>
      </div>
      <h1 className="mt-1 text-4xl font-bold leading-tight">What did you just eat?</h1>
      <BigLink to="/add" className="mt-8 py-8 text-2xl">Add a spot</BigLink>
      <section className="mt-10 rounded-2xl border border-line bg-card p-5">
        <h2 className="text-xl font-semibold">Start with the last three places you remember</h2>
        <p className="mt-2 text-muted">Even a quick thumbs up now helps you recommend them later.</p>
      </section>
    </main>
  )
}
