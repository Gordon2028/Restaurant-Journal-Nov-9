import { usePhoto } from '../hooks/useObjectUrl'

interface Props {
  photoKey: string
  alt: string
  fallbackLabel: string
  className?: string
}

/** Lazy-loaded visit photo, or a warm text tile when there is no photo. */
export function Photo({ photoKey, alt, fallbackLabel, className = '' }: Props) {
  const url = usePhoto(photoKey)
  if (photoKey && url) {
    return <img src={url} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className}`} />
  }
  return (
    <div
      role="img"
      aria-label={photoKey ? 'Loading photo' : 'No photo for this visit'}
      className={`flex items-center justify-center bg-blush p-2 text-center font-display font-bold leading-tight text-tomato-dark ${className}`}
    >
      <span aria-hidden className="line-clamp-3">{fallbackLabel}</span>
    </div>
  )
}
