import type { Rating } from '../domain/types'

interface Props {
  value: Rating | null
  onChange: (r: Rating) => void
}

export function ThumbsToggle({ value, onChange }: Props) {
  const opt = (r: Rating, emoji: string, label: string, on: string) => (
    <button
      type="button"
      aria-pressed={value === r}
      onClick={() => onChange(r)}
      className={`flex min-h-28 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-lg font-semibold transition active:scale-95 ${
        value === r ? `${on} text-white border-transparent` : 'border-line bg-card text-ink'
      }`}
    >
      <span aria-hidden className="text-4xl">{emoji}</span>
      {label}
    </button>
  )
  return (
    <div role="group" aria-label="How was it?" className="flex gap-3">
      {opt('up', '👍', 'Loved it', 'bg-olive')}
      {opt('down', '👎', 'Not for me', 'bg-tomato-dark')}
    </div>
  )
}
