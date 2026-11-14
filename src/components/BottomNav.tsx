import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Home', icon: '◍' },
  { to: '/spots', label: 'My spots', icon: '☰' },
  { to: '/map', label: 'Map', icon: '⌖' },
  { to: '/best', label: 'Best bites', icon: '★' },
  { to: '/lists', label: 'Lists', icon: '✎' },
]

export function BottomNav() {
  return (
    <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 border-t border-line bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-between px-2">
        {items.map((i) => (
          <li key={i.to} className="flex-1">
            <NavLink
              to={i.to}
              end={i.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium ${isActive ? 'text-tomato' : 'text-muted'}`
              }
            >
              <span aria-hidden className="text-xl leading-none">{i.icon}</span>
              {i.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
