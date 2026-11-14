import { useCallback, useEffect, useState } from 'react'
import type { JournalEntry } from '../domain/types'
import { onAnyChange } from '../services/data/changes'
import { placeRepo, visitRepo } from '../services/data/localRepos'
import { useAuth } from './useAuth'

/** All of the signed-in user's visits joined to their places, newest first. */
export function useJournal() {
  const { user } = useAuth()
  const userId = user?.id
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!userId) return
    const [visits, places] = await Promise.all([visitRepo.listForUser(userId), placeRepo.all()])
    const byId = new Map(places.map((p) => [p.id, p]))
    setEntries(visits.flatMap((visit) => {
      const place = byId.get(visit.placeId)
      return place ? [{ visit, place }] : []
    }))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void reload()
    return onAnyChange(() => void reload())
  }, [reload])

  return { entries, loading, reload }
}
