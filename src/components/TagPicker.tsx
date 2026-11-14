import { useState } from 'react'
import { normalizeTag, PRESET_TAGS } from '../domain/tags'

interface Props {
  value: string[]
  onChange: (tags: string[]) => void
}

const isPreset = (t: string) => (PRESET_TAGS as readonly string[]).includes(t)

/** Multi-select vibe tags: 8 presets plus at most one custom tag. */
export function TagPicker({ value, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const custom = value.find((t) => !isPreset(t))
  const toggle = (t: string) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t])

  function addCustom() {
    const t = normalizeTag(draft)
    if (!t || custom) return
    setDraft('')
    onChange(value.includes(t) ? value : [...value, t])
  }

  const chip = (t: string) => (
    <button
      key={t}
      type="button"
      aria-pressed={value.includes(t)}
      onClick={() => toggle(t)}
      className={`rounded-full border-2 px-4 py-2 text-base font-medium ${
        value.includes(t) ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink'
      }`}
    >
      {t}
    </button>
  )

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {PRESET_TAGS.map(chip)}
        {custom && chip(custom)}
      </div>
      {!custom && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            addCustom()
          }}
        >
          <label className="sr-only" htmlFor="custom-tag">Add your own vibe</label>
          <input
            id="custom-tag"
            value={draft}
            maxLength={30}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add your own"
            className="min-w-0 flex-1 rounded-xl border-2 border-line bg-card px-4"
          />
          <button type="submit" className="rounded-xl border-2 border-ink px-4 font-semibold">Add</button>
        </form>
      )}
    </div>
  )
}
