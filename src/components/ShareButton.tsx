import { useState } from 'react'
import { BigButton } from './BigButton'

interface Props {
  url: string
  title: string
  disabled?: boolean
  onShared: () => void
}

/** Native share sheet when available, otherwise copy the link. */
export function ShareButton({ url, title, disabled, onShared }: Props) {
  const [status, setStatus] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('Link copied. Paste it in a message.')
    } catch {
      window.prompt('Copy this link:', url)
      setStatus('')
    }
    onShared()
  }

  async function share() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: `${title} on Plate`, url })
        onShared()
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return // user closed the sheet
      }
    }
    await copy()
  }

  return (
    <div>
      <BigButton disabled={disabled} onClick={() => void share()}>Share this list</BigButton>
      {typeof navigator.share === 'function' && (
        <button type="button" disabled={disabled} onClick={() => void copy()} className="mt-2 w-full py-3 font-semibold text-tomato underline">
          Copy link instead
        </button>
      )}
      <p role="status" className="mt-2 text-olive">{status}</p>
    </div>
  )
}
