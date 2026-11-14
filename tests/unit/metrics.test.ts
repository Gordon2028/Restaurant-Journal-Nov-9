import { describe, expect, it } from 'vitest'
import type { AppEvent, EventName } from '../../src/domain/types'
import { computeMetrics, median } from '../../src/services/events/metrics'

const NOW = new Date('2026-11-09T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString()
let i = 0
const ev = (userId: string, name: EventName, d: number, props: AppEvent['props'] = {}): AppEvent =>
  ({ id: String(i++), userId, name, props, at: daysAgo(d) })

describe('median', () => {
  it('handles odd, even and empty', () => {
    expect(median([3, 1, 2])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(median([])).toBeNull()
  })
})

describe('computeMetrics', () => {
  it('computes capture time and under-10s share', () => {
    const m = computeMetrics([ev('a', 'capture_completed', 1, { seconds: 6 }), ev('a', 'capture_completed', 2, { seconds: 9 }), ev('b', 'capture_completed', 2, { seconds: 20 })], NOW)
    expect(m.medianCaptureSeconds).toBe(9)
    expect(m.captureUnder10Pct).toBeCloseTo(2 / 3)
  })

  it('counts weekly actives and visits per logger, ignoring anonymous viewers', () => {
    const m = computeMetrics([
      ev('a', 'capture_completed', 1, { seconds: 5 }), ev('a', 'capture_completed', 3, { seconds: 5 }),
      ev('b', 'search_performed', 2), ev('c', 'capture_completed', 20, { seconds: 5 }), ev('anonymous', 'shared_list_viewed', 0),
    ], NOW)
    expect(m.weeklyActiveUsers).toBe(2)
    expect(m.visitsPerLoggerThisWeek).toBe(2)
    expect(m.sharedListViews).toBe(1)
  })

  it('computes week-3 retention only for people old enough', () => {
    const m = computeMetrics([
      ev('retained', 'capture_completed', 40, { seconds: 5 }), ev('retained', 'capture_completed', 40 - 22, { seconds: 5 }),
      ev('churned', 'capture_completed', 40, { seconds: 5 }), ev('churned', 'capture_completed', 35, { seconds: 5 }),
      ev('too-new', 'capture_completed', 10, { seconds: 5 }),
    ], NOW)
    expect(m.week3Retention).toEqual({ rate: 0.5, cohort: 2 })
  })

  it('computes lists shared per active user over 30 days', () => {
    const m = computeMetrics([ev('a', 'list_shared', 3), ev('a', 'list_shared', 5), ev('b', 'capture_completed', 4, { seconds: 8 })], NOW)
    expect(m.listsSharedPerActiveUser30d).toBe(1)
  })

  it('returns nulls with no data', () => {
    const m = computeMetrics([], NOW)
    expect(m.medianCaptureSeconds).toBeNull()
    expect(m.week3Retention.rate).toBeNull()
    expect(m.listsSharedPerActiveUser30d).toBeNull()
  })
})
