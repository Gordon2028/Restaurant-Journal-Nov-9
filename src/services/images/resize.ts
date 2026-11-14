export const MAX_EDGE = 1600

/** Scale (w,h) down so the longest side is at most `max`. Never upscales. */
export function fitWithin(w: number, h: number, max = MAX_EDGE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h))
  return { width: Math.round(w * scale), height: Math.round(h * scale) }
}

/**
 * Downscale and re-encode as JPEG. Drawing to a canvas drops all EXIF metadata,
 * including GPS, so the stored copy carries no location.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitWithin(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not process photo'))), 'image/jpeg', 0.82),
  )
}
