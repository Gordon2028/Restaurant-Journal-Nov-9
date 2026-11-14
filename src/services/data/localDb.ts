import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppEvent, Place, ShareList, Visit } from '../../domain/types'

interface PlateDB extends DBSchema {
  places: { key: string; value: Place; indexes: { externalId: string } }
  visits: { key: string; value: Visit; indexes: { userId: string } }
  lists: { key: string; value: ShareList; indexes: { slug: string; userId: string } }
  events: { key: string; value: AppEvent }
  photos: { key: string; value: Blob }
  outbox: { key: string; value: OutboxEntry }
}

/** A change waiting to be sent to the server. One entry per item: later changes replace earlier ones. */
export interface OutboxEntry {
  key: string // `${kind}:${id}`
  kind: 'visit' | 'list'
  id: string
  op: 'upsert' | 'delete'
  at: number
  /** For deleted visits: the photo to remove from storage. */
  photoKey?: string
}

const DB_NAME = 'plate'
let dbPromise: Promise<IDBPDatabase<PlateDB>> | null = null

export function getDb(): Promise<IDBPDatabase<PlateDB>> {
  dbPromise ??= openDB<PlateDB>(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('places', { keyPath: 'id' }).createIndex('externalId', 'externalId', { unique: true })
        db.createObjectStore('visits', { keyPath: 'id' }).createIndex('userId', 'userId')
        const lists = db.createObjectStore('lists', { keyPath: 'id' })
        lists.createIndex('slug', 'slug', { unique: true })
        lists.createIndex('userId', 'userId')
        db.createObjectStore('events', { keyPath: 'id' })
        db.createObjectStore('photos')
      }
      if (oldVersion < 2) db.createObjectStore('outbox', { keyPath: 'key' })
    },
  })
  return dbPromise
}

/** "Delete my account and all data": wipes everything stored on this device. */
export async function wipeAllLocalData(): Promise<void> {
  const db = await getDb()
  const stores = ['places', 'visits', 'lists', 'events', 'photos', 'outbox'] as const
  const tx = db.transaction(stores, 'readwrite')
  await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done])
  try {
    localStorage.clear()
  } catch {
    /* storage unavailable: nothing to clear */
  }
}
