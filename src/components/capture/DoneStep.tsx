import { useState } from 'react'
import { visitRepo } from '../../services/data/localRepos'
import { BigButton } from '../BigButton'
import { BigLink } from '../BigLink'
import { TagPicker } from '../TagPicker'

interface Props {
  visitId: string
  placeName: string
  onAnother: () => void
}

export function DoneStep({ visitId, placeName, onAnother }: Props) {
  const [tags, setTags] = useState<string[]>([])

  function change(next: string[]) {
    setTags(next)
    void visitRepo.update(visitId, { tags: next })
  }

  return (
    <section>
      <p aria-live="polite" className="text-sm font-semibold text-olive">Saved ✓</p>
      <h1 className="mt-1 text-3xl font-bold leading-tight">{placeName} is in your journal</h1>
      <h2 className="mt-8 text-lg font-semibold">What was the vibe? <span className="font-normal text-muted">(optional)</span></h2>
      <div className="mt-3"><TagPicker value={tags} onChange={change} /></div>
      <div className="mt-8 space-y-3">
        <BigLink to="/">Done</BigLink>
        <BigButton variant="quiet" onClick={onAnother}>Add another</BigButton>
      </div>
    </section>
  )
}
