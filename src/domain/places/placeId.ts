/**
 * Deterministic place id (UUID v5-style, SHA-1) derived from the provider id.
 * Every device and every user computes the same id for the same real-world place, so the shared
 * `places` table needs no lookup/merge step when syncing.
 */
export async function placeIdFor(externalId: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`plate-place:${externalId}`)))
  bytes[6] = (bytes[6] & 0x0f) | 0x50
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
