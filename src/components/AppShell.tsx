import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useOnline } from '../hooks/useOnline'
import { BottomNav } from './BottomNav'
import { SyncChip } from './SyncChip'

export function AppShell() {
  const { user, ready } = useAuth()
  const online = useOnline()
  if (!ready) return <p role="status" className="p-8 text-muted">Loading…</p>
  if (!user) return <Navigate to="/login" replace />
  return (
    <div className="mx-auto min-h-full max-w-md px-5 pb-28 pt-6">
      {!online && (
        <p role="status" className="mb-4 rounded-xl bg-blush px-4 py-2 text-sm font-medium">
          You're offline. Your spots still save on this phone.
        </p>
      )}
      <SyncChip />
      <Outlet />
      <BottomNav />
    </div>
  )
}
