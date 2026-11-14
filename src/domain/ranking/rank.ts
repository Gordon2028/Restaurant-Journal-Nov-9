import type { JournalEntry } from '../types'

/** Field weights: what people remember first (the dish) ranks highest. */
export const FIELD_WEIGHTS = { dish: 5, name: 4, tags: 3, neighborhood: 2, cuisine: 2, note: 1 } as const
type Field = keyof typeof FIELD_WEIGHTS

export function tokenize(s: string): string[] {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

/** Levenshtein distance, giving up early once it exceeds `max`. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    let rowMin = i
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      rowMin = Math.min(rowMin, cur[j])
    }
    if (rowMin > max) return max + 1
    prev = cur
  }
  return prev[b.length]
}

/** 0..1: how well one query word matches one word in a field. Handles partial words and typos. */
export function wordMatch(q: string, word: string): number {
  if (q === word) return 1
  if (q.length >= 2 && word.startsWith(q)) return 0.9
  if (q.length >= 3 && word.includes(q)) return 0.7
  if (q.length >= 4) {
    const allowed = q.length >= 7 ? 2 : 1
    const d = Math.min(editDistance(q, word, allowed), editDistance(q, word.slice(0, q.length), allowed))
    if (d <= allowed) return 0.6 - 0.1 * d
  }
  return 0
}

function fieldWords(e: JournalEntry): Record<Field, string[]> {
  return {
    dish: tokenize(e.visit.dishName),
    name: tokenize(e.place.name),
    tags: e.visit.tags.flatMap(tokenize),
    neighborhood: tokenize(e.place.neighborhood),
    cuisine: tokenize(e.place.cuisine),
    note: tokenize(e.visit.note),
  }
}

export interface Ranked {
  entry: JournalEntry
  score: number
}

/**
 * Forgiving search over restaurant, dish, neighborhood, cuisine and vibe tags.
 * Every query word must match something (typos and partial words allowed).
 * Ties and empty queries fall back to most recent first.
 */
export function rankEntries(entries: JournalEntry[], query: string): Ranked[] {
  const qs = tokenize(query)
  const byRecent = (a: Ranked, b: Ranked) => b.entry.visit.visitedAt.localeCompare(a.entry.visit.visitedAt)
  if (qs.length === 0) return entries.map((entry) => ({ entry, score: 0 })).sort(byRecent)

  const out: Ranked[] = []
  for (const entry of entries) {
    const words = fieldWords(entry)
    let total = 0
    let allMatched = true
    for (const q of qs) {
      let best = 0
      for (const field of Object.keys(FIELD_WEIGHTS) as Field[]) {
        for (const w of words[field]) best = Math.max(best, FIELD_WEIGHTS[field] * wordMatch(q, w))
      }
      if (best === 0) {
        allMatched = false
        break
      }
      total += best
    }
    if (allMatched) out.push({ entry, score: total })
  }
  return out.sort((a, b) => b.score - a.score || byRecent(a, b))
}

export interface Filters {
  upOnly: boolean
  neighborhood: string
  tag: string
}

export const NO_FILTERS: Filters = { upOnly: false, neighborhood: '', tag: '' }

export function applyFilters(entries: JournalEntry[], f: Filters): JournalEntry[] {
  return entries.filter(
    (e) =>
      (!f.upOnly || e.visit.rating === 'up') &&
      (!f.neighborhood || e.place.neighborhood === f.neighborhood) &&
      (!f.tag || e.visit.tags.includes(f.tag)),
  )
}
