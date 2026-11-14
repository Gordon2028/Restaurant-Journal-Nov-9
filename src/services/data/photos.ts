import { isSupabaseConfigured, supabase } from '../supabase/client'
import { photoPath } from '../sync/mappers'
import { syncStore, visitRepo } from './localRepos'

const PHOTO_BUCKET = 'visit-photos'

/** A visit photo from this device, or (signed in, online) downloaded once from private storage and cached. */
export async function loadPhoto(userId: string | undefined, photoKey: string): Promise<Blob | undefined> {
  const local = await visitRepo.getPhoto(photoKey)
  if (local || !isSupabaseConfigured || !supabase || !userId || !photoKey) return local
  try {
    const { data } = await supabase.storage.from(PHOTO_BUCKET).download(photoPath(userId, photoKey))
    if (!data) return undefined
    await syncStore.cachePhoto(photoKey, data)
    return data
  } catch {
    return undefined
  }
}
