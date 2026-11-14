import type { AppEvent } from '../../domain/types'

const DAY = 86_400_000
const WEEK = 7 * DAY

export interface Metrics {
  /** Median seconds from "Add a spot" to saved. Goal: under 10. */
  medianCaptureSeconds: number | null
  captureUnder10Pct: number | null
  captureCount: number
  /** People with any activity in the last 7 days. */
  weeklyActiveUsers: number
  /** Visits logged in the last 7 days, per person who logged one. */
  visitsPerLoggerThisWeek: number | null
  /** Of people whose first log was 28+ days ago: share who logged again in days 21-27 (week 3). Goal: 40%+. */
  week3Retention: { rate: number | null; cohort: number }
  /** list_shared in last 30 days per active person. Goal: 1+. */
  listsSharedPerActiveUser30d: number | null
  searches: number
  recallOpens: number
  sharedListViews: number
}

const real = (e: AppEvent) => e.userId !== 'anonymous'
const t = (e: AppEvent) => new Date(e.at).getTime()

export function median(nums: number[]): number | null {
  if (nums.length === 0) return null
  const s = [...nums].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function computeMetrics(events: AppEvent[], now: Date = new Date()): Metrics {
  const n = now.getTime()
  const users = events.filter(real)
  const captures = events.filter((e) => e.name === 'capture_completed' && real(e))
  const secs = captures.map((e) => e.props.seconds).filter((v): v is number => typeof v === 'number')

  const activeWeek = new Set(users.filter((e) => n - t(e) < WEEK).map((e) => e.userId))
  const loggersWeek = new Set(captures.filter((e) => n - t(e) < WEEK).map((e) => e.userId))
  const visitsWeek = captures.filter((e) => n - t(e) < WEEK).length

  // Week-3 retention among loggers.
  const firstLog = new Map<string, number>()
  for (const e of captures) firstLog.set(e.userId, Math.min(firstLog.get(e.userId) ?? Infinity, t(e)))
  let cohort = 0
  let retained = 0
  for (const [userId, first] of firstLog) {
    if (n - first < 4 * WEEK) continue
    cohort++
    if (captures.some((e) => e.userId === userId && t(e) - first >= 3 * WEEK && t(e) - first < 4 * WEEK)) retained++
  }

  const active30 = new Set(users.filter((e) => n - t(e) < 30 * DAY).map((e) => e.userId))
  const shared30 = events.filter((e) => e.name === 'list_shared' && real(e) && n - t(e) < 30 * DAY).length

  const count = (name: AppEvent['name']) => events.filter((e) => e.name === name).length
  return {
    medianCaptureSeconds: median(secs),
    captureUnder10Pct: secs.length ? secs.filter((s) => s <= 10).length / secs.length : null,
    captureCount: secs.length,
    weeklyActiveUsers: activeWeek.size,
    visitsPerLoggerThisWeek: loggersWeek.size ? visitsWeek / loggersWeek.size : null,
    week3Retention: { rate: cohort ? retained / cohort : null, cohort },
    listsSharedPerActiveUser30d: active30.size ? shared30 / active30.size : null,
    searches: count('search_performed'),
    recallOpens: count('recall_result_opened'),
    sharedListViews: count('shared_list_viewed'),
  }
}
