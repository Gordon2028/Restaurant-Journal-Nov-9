import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'quiet' }

export function BigButton({ variant = 'primary', className = '', ...rest }: Props) {
  const base =
    'w-full rounded-2xl px-6 py-4 text-lg font-semibold transition active:scale-[0.98] disabled:opacity-50'
  const look =
    variant === 'primary'
      ? 'bg-tomato text-white shadow-[0_6px_0_var(--color-tomato-dark)] active:translate-y-1 active:shadow-none'
      : 'border-2 border-ink/20 bg-card text-ink'
  return <button className={`${base} ${look} ${className}`} {...rest} />
}
