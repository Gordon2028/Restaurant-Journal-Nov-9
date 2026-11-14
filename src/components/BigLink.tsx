import { Link, type LinkProps } from 'react-router-dom'

/** Same look as BigButton, but a real link (avoids a button nested in an anchor). */
export function BigLink({ className = '', ...rest }: LinkProps) {
  return (
    <Link
      className={`flex w-full items-center justify-center rounded-2xl bg-tomato px-6 py-4 text-lg font-semibold text-white shadow-[0_6px_0_var(--color-tomato-dark)] transition active:translate-y-1 active:shadow-none ${className}`}
      {...rest}
    />
  )
}
