import { BigLink } from './BigLink'

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-line bg-card p-6 text-center">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
      <BigLink to="/add" className="mt-5">Add a spot</BigLink>
    </div>
  )
}
