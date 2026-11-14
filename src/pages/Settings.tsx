import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BigButton } from '../components/BigButton'
import { seedDemoData } from '../dev/seedDemo'
import { useAuth } from '../hooks/useAuth'
import { useSync } from '../hooks/useSync'
import { wipeAllLocalData } from '../services/data/localDb'
import { isSupabaseConfigured, supabase } from '../services/supabase/client'

const showDemo = !isSupabaseConfigured || import.meta.env.DEV

export function Settings() {
  const { user, auth } = useAuth()
  const sync = useSync()
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [signOutWarning, setSignOutWarning] = useState(false)
  const [busy, setBusy] = useState(false)

  async function loadDemo() {
    if (!user) return
    setBusy(true)
    const n = await seedDemoData(user.id)
    setMsg(n ? `Added ${n} sample spots.` : 'Sample spots are already here.')
    setBusy(false)
  }

  async function signOut(force = false) {
    setBusy(true)
    // Local data is only a copy of your account, so make sure it has been saved before clearing it.
    if (isSupabaseConfigured) {
      await sync.syncNow()
      if (!force && !(await pendingIsEmpty())) {
        setSignOutWarning(true)
        setBusy(false)
        return
      }
    }
    await auth.signOut()
    if (isSupabaseConfigured) await wipeAllLocalData()
  }

  async function deleteAll() {
    setBusy(true)
    setError('')
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: fnError } = await supabase.functions.invoke('delete-account', { method: 'POST' })
        if (fnError) throw fnError
      }
      await wipeAllLocalData()
      await auth.signOut()
    } catch {
      setError("We couldn't delete your account just now. Check your connection and try again. Nothing was removed.")
      setBusy(false)
    }
  }

  return (
    <main>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mt-2 text-muted">Signed in as {user?.email}</p>

      {showDemo && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Try it with sample spots</h2>
          <p className="mt-1 text-muted">
            Adds 25 made-up visits around New York so you can explore search, the map and lists.
            {isSupabaseConfigured && ' They will be saved to your account.'}
          </p>
          <BigButton variant="quiet" className="mt-3" onClick={() => void loadDemo()} disabled={busy}>Add sample spots</BigButton>
          {msg && <p role="status" className="mt-2 text-olive">{msg}</p>}
        </section>
      )}

      <section className="mt-8">
        <Link to="/admin/metrics" className="font-semibold text-tomato underline">Usage numbers</Link>
        {signOutWarning ? (
          <div role="alert" className="mt-4 rounded-xl bg-blush p-4">
            <p className="font-medium">Some spots haven't been saved to your account yet.</p>
            <p className="mt-1 text-sm">If you sign out now they'll be lost. Connect to the internet and try again, or sign out anyway.</p>
            <div className="mt-3 flex gap-3">
              <button onClick={() => setSignOutWarning(false)} className="flex-1 rounded-xl border-2 border-ink px-4 font-semibold">Wait</button>
              <button onClick={() => void signOut(true)} className="flex-1 rounded-xl bg-tomato-dark px-4 font-semibold text-white">Sign out anyway</button>
            </div>
          </div>
        ) : (
          <button type="button" disabled={busy} onClick={() => void signOut()} className="mt-4 block text-muted underline">Sign out</button>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-card p-5">
        <h2 className="text-lg font-semibold">Delete my account and all data</h2>
        <p className="mt-1 text-muted">
          {isSupabaseConfigured
            ? 'Permanently removes your account, every spot, photo and list, including any links you shared. This can’t be undone.'
            : "Removes every spot, photo and list from this device. This can't be undone."}
        </p>
        {confirming ? (
          <div className="mt-4 flex gap-3">
            <button onClick={() => void deleteAll()} disabled={busy}
              className="flex-1 rounded-xl bg-tomato-dark px-4 font-semibold text-white">Yes, delete everything</button>
            <button onClick={() => setConfirming(false)} className="flex-1 rounded-xl border-2 border-line px-4 font-semibold">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="mt-4 font-semibold text-tomato-dark underline">Delete everything</button>
        )}
        {error && <p role="alert" className="mt-3 text-tomato-dark">{error}</p>}
      </section>
    </main>
  )
}

async function pendingIsEmpty(): Promise<boolean> {
  const { outbox } = await import('../services/data/localRepos')
  return (await outbox.all()).length === 0
}
