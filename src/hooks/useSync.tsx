import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { onDataChange } from '../services/data/changes'
import { isSupabaseConfigured } from '../services/supabase/client'
import { supabaseSync } from '../services/sync/supabaseSync'
import { useAuth } from './useAuth'
import { useOnline } from './useOnline'

interface SyncCtx {
  enabled: boolean
  syncing: boolean
  pending: number
  error: string
  /** Send queued changes and pull the latest. Safe to call any time; overlapping calls are merged. */
  syncNow: () => Promise<void>
}
const Ctx = createContext<SyncCtx | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const online = useOnline()
  const [syncing, setSyncing] = useState(false)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState('')
  const inFlight = useRef<Promise<void> | null>(null)
  const again = useRef(false)
  const enabled = isSupabaseConfigured

  const refreshPending = useCallback(async () => setPending(await supabaseSync.pendingCount()), [])

  const syncNow = useCallback(async () => {
    if (!enabled || !user) return
    if (inFlight.current) {
      again.current = true
      return inFlight.current
    }
    setSyncing(true)
    inFlight.current = (async () => {
      try {
        do {
          again.current = false
          const r = await supabaseSync.sync(user)
          setError(r.offline ? '' : r.error)
        } while (again.current)
      } finally {
        inFlight.current = null
        setSyncing(false)
        await refreshPending()
      }
    })()
    return inFlight.current
  }, [enabled, user, refreshPending])

  // Sync on sign-in, when we come back online, and when the app returns to the foreground.
  useEffect(() => {
    if (!enabled || !user) return
    if (online) void syncNow()
    const onVisible = () => document.visibilityState === 'visible' && navigator.onLine && void syncNow()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [enabled, user, online, syncNow])

  // After the user saves or edits something, send it shortly after (one sync for a burst of changes).
  useEffect(() => {
    if (!enabled || !user) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const off = onDataChange(() => {
      void refreshPending()
      clearTimeout(timer)
      timer = setTimeout(() => navigator.onLine && void syncNow(), 800)
    })
    return () => {
      off()
      clearTimeout(timer)
    }
  }, [enabled, user, syncNow, refreshPending])

  return <Ctx.Provider value={{ enabled, syncing, pending, error, syncNow }}>{children}</Ctx.Provider>
}

export function useSync(): SyncCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSync must be used inside SyncProvider')
  return v
}
