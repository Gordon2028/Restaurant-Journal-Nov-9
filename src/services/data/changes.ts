/**
 * Tiny pub/sub so screens refresh when data changes.
 * - local: the user saved/edited something here (triggers a sync)
 * - remote: a sync pulled changes in from the server (must NOT trigger another sync)
 */
type Cb = () => void
const local = new Set<Cb>()
const remote = new Set<Cb>()

export const onDataChange = (cb: Cb): (() => void) => (local.add(cb), () => local.delete(cb))
export const onRemoteChange = (cb: Cb): (() => void) => (remote.add(cb), () => remote.delete(cb))
export const emitDataChange = (): void => local.forEach((cb) => cb())
export const emitRemoteChange = (): void => remote.forEach((cb) => cb())

/** Screens use this: refresh on either kind of change. */
export function onAnyChange(cb: Cb): () => void {
  const a = onDataChange(cb)
  const b = onRemoteChange(cb)
  return () => (a(), b())
}
