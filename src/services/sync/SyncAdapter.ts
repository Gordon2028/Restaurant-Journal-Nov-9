import type { Profile } from '../../domain/types'

export interface SyncResult {
  /** Changes that could not be sent yet. They stay queued and are retried. */
  failed: number
  offline: boolean
  error: string
}

/**
 * Outbox seam. Everything is saved on the device first; an adapter sends queued changes
 * to the server and pulls the server's copy back.
 */
export interface SyncAdapter {
  pendingCount(): Promise<number>
  sync(user: Profile): Promise<SyncResult>
}

export const noopSync: SyncAdapter = {
  pendingCount: async () => 0,
  sync: async () => ({ failed: 0, offline: false, error: '' }),
}
