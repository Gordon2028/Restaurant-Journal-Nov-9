import { useSync } from '../hooks/useSync'

/** Small status line: only shown when signed in to the online version. */
export function SyncChip() {
  const { enabled, syncing, pending, error } = useSync()
  if (!enabled) return null
  const text = syncing ? 'Saving to your account…' : error ? "Couldn't sync yet. We'll keep trying." : pending > 0 ? `${pending} waiting to sync` : ''
  if (!text) return null
  return <p role="status" className="mb-3 text-right text-xs font-medium text-muted">{text}</p>
}
