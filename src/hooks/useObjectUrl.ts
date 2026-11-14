import { useEffect, useState } from 'react'
import { loadPhoto } from '../services/data/photos'
import { useAuth } from './useAuth'

/** Turn a Blob into a temporary URL for <img>, revoking it on cleanup. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return blob ? url : null
}

/** Load a stored visit photo by key. */
export function usePhoto(photoKey: string): string | null {
  const { user } = useAuth()
  const userId = user?.id
  const [blob, setBlob] = useState<Blob | undefined>()
  useEffect(() => {
    let live = true
    if (photoKey) void loadPhoto(userId, photoKey).then((b) => live && setBlob(b))
    return () => {
      live = false
    }
  }, [photoKey, userId])
  return useObjectUrl(blob)
}
