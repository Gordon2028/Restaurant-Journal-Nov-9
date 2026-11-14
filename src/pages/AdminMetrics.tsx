import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { AppEvent, EventName } from '../domain/types'
import { eventRepo } from '../services/data/localRepos'
import { computeMetrics, type Metrics } from '../services/events/metrics'
import { isSupabaseConfigured, supabase } from '../services/supabase/client'

function Card({ label, value, goal, ok }: { label: string; value: string; goal?: string; ok?: boolean | null }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">
        {value} {ok === true && <span role="img" aria-label="goal met">✅</span>}
        {ok === false && <span role="img" aria-label="goal not met yet">⏳</span>}
      </p>
      {goal && <p className="mt-1 text-xs text-muted">{goal}</p>}
    </div>
  )
}

const pct = (v: number | null) => (v === null ? '–' : `${Math.round(v * 100)}%`)
const num = (v: number | null, d = 1) => (v === null ? '–' : v.toFixed(d))

type Source = 'everyone' | 'device' | 'loading'

/** Internal numbers. For admins it reads every user's events from the server; for everyone else, just this device. */
export function AdminMetrics() {
  const [m, setM] = useState<Metrics | null>(null)
  const [source, setSource] = useState<Source>('loading')

  useEffect(() => {
    let live = true
    void (async () => {
      let events: AppEvent[] | null = null
      if (isSupabaseConfigured && supabase) {
        const admin = await supabase.rpc('is_admin')
        if (admin.data === true) {
          const res = await supabase.rpc('admin_events')
          if (!res.error) {
            events = (res.data ?? []).map((e) => ({
              id: e.id, userId: e.user_id ?? 'anonymous', name: e.name as EventName, at: e.at,
              props: (typeof e.props === 'object' && e.props !== null && !Array.isArray(e.props) ? e.props : {}) as AppEvent['props'],
            }))
          }
        }
      }
      if (!live) return
      setSource(events ? 'everyone' : 'device')
      setM(computeMetrics(events ?? (await eventRepo.all())))
    })()
    return () => {
      live = false
    }
  }, [])

  if (!m) return <p role="status" className="text-muted">Loading…</p>
  return (
    <main>
      <Link to="/settings" className="inline-flex items-center text-muted">← Settings</Link>
      <h1 className="mt-2 text-3xl font-bold">Usage numbers</h1>
      <p className="mt-2 text-sm text-muted">
        {source === 'everyone' ? 'All people using Plate.' : isSupabaseConfigured ? 'Only your own activity on this device. The team view is for admins.' : 'Based only on activity on this device.'}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card label="Median time to save" value={m.medianCaptureSeconds === null ? '–' : `${num(m.medianCaptureSeconds)}s`}
          goal={`Goal: under 10s (${m.captureCount} saves)`} ok={m.medianCaptureSeconds === null ? null : m.medianCaptureSeconds < 10} />
        <Card label="Saves under 10s" value={pct(m.captureUnder10Pct)} />
        <Card label="Active this week" value={String(m.weeklyActiveUsers)} />
        <Card label="Visits per person, this week" value={num(m.visitsPerLoggerThisWeek)} />
        <Card label="Still logging in week 3" value={pct(m.week3Retention.rate)}
          goal={`Goal: 40%+ (${m.week3Retention.cohort} people old enough)`} ok={m.week3Retention.rate === null ? null : m.week3Retention.rate >= 0.4} />
        <Card label="Lists shared per active person, 30 days" value={num(m.listsSharedPerActiveUser30d, 2)}
          goal="Goal: 1 or more" ok={m.listsSharedPerActiveUser30d === null ? null : m.listsSharedPerActiveUser30d >= 1} />
        <Card label="Searches" value={String(m.searches)} />
        <Card label="Spots opened" value={String(m.recallOpens)} />
        <Card label="Shared list views" value={String(m.sharedListViews)} />
      </div>
    </main>
  )
}
