/**
 * Verkleinert und komprimiert ein Bild clientseitig zu einem JPEG-Data-URL,
 * damit es sicher in ein Firestore-Dokument (< 1 MB) passt.
 * Nutzt bevorzugt createImageBitmap mit EXIF-Orientierung.
 */
export async function compressImage(
  file: File,
  opts: { maxDim?: number; maxBytes?: number } = {}
): Promise<string> {
  const maxDim = opts.maxDim ?? 1600
  const maxBytes = opts.maxBytes ?? 850_000

  const { source, width: srcW, height: srcH } = await loadDrawable(file)

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  let width = Math.max(1, Math.round(srcW * scale))
  let height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar')

  const render = (w: number, h: number, quality: number) => {
    canvas.width = w
    canvas.height = h
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(source, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  }

  let quality = 0.75
  let out = render(width, height, quality)

  // 1) Qualität schrittweise senken
  while (out.length > maxBytes && quality > 0.35) {
    quality = Math.round((quality - 0.1) * 100) / 100
    out = render(width, height, quality)
  }

  // 2) Falls immer noch zu groß: weiter verkleinern
  while (out.length > maxBytes && Math.max(width, height) > 640) {
    width = Math.round(width * 0.85)
    height = Math.round(height * 0.85)
    out = render(width, height, 0.7)
  }

  if (typeof (source as ImageBitmap).close === 'function') {
    ;(source as ImageBitmap).close()
  }

  return out
}

interface Drawable {
  source: CanvasImageSource
  width: number
  height: number
}

async function loadDrawable(file: File): Promise<Drawable> {
  // Bevorzugt: createImageBitmap respektiert die EXIF-Orientierung
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height }
    } catch {
      // Fallback unten
    }
  }
  const dataUrl = await readAsDataURL(file)
  const img = await loadImage(dataUrl)
  return { source: img, width: img.naturalWidth, height: img.naturalHeight }
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
