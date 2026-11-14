import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Profile } from '../domain/types'
import { auth } from '../services/auth'
import type { AuthService } from '../services/auth/AuthService'

interface AuthCtx {
  user: Profile | null
  /** False until the starting session has been resolved. */
  ready: boolean
  auth: AuthService
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let live = true
    const off = auth.subscribe((u) => live && setUser(u))
    void auth.init().then((u) => {
      if (!live) return
      setUser(u)
      setReady(true)
    })
    return () => {
      live = false
      off()
    }
  }, [])

  return <Ctx.Provider value={{ user, ready, auth }}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}
