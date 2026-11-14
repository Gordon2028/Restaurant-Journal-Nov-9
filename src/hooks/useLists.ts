import { useCallback, useEffect, useState } from 'react'
import type { ShareList } from '../domain/types'
import { onAnyChange } from '../services/data/changes'
import { listRepo } from '../services/data/localRepos'
import { useAuth } from './useAuth'

export function useLists() {
  const { user } = useAuth()
  const userId = user?.id
  const [lists, setLists] = useState<ShareList[]>([])
  const [loading, setLoading] = useState(true)
  const reload = useCallback(async () => {
    if (!userId) return
    setLists(await listRepo.listForUser(userId))
    setLoading(false)
  }, [userId])
  useEffect(() => {
    void reload()
    return onAnyChange(() => void reload())
  }, [reload])
  return { lists, loading, reload }
}
