export const PRESET_TAGS = [
  'date night',
  'big group',
  'cheap eats',
  'impressive for visitors',
  'brunch',
  'cocktails',
  'see-and-be-seen',
  'quick bite',
] as const

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 30)
}
