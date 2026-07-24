import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import QRCode from 'qrcode'
import { compressImage } from '@/lib/utils/image'
import { useQuizStore } from '../store'
import { usePhotoStore } from '../photoStore'

type Phase = 'select' | 'processing' | 'done'

/** Wandelt einen konfigurierten Link in eine absolute URL um (für Anzeige & QR). */
function toAbsolute(url: string): string {
  const trimmed = (url ?? '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return `${window.location.origin}${trimmed}`
  return `https://${trimmed}`
}

export function FotoUpload() {
  const config = useQuizStore((s) => s.config)
  const isLoading = useQuizStore((s) => s.isLoading)
  const subscribe = useQuizStore((s) => s.subscribe)
  const uploadPhoto = usePhotoStore((s) => s.uploadPhoto)

  const [phase, setPhase] = useState<Phase>('select')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [nextQr, setNextQr] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const unsub = subscribe()
    return () => unsub()
  }, [subscribe])

  const nextUrlAbs = toAbsolute(config?.fotoNextUrl ?? '')

  useEffect(() => {
    if (!nextUrlAbs) return
    let cancelled = false
    QRCode.toDataURL(nextUrlAbs, { width: 300, margin: 1 })
      .then((d) => {
        if (!cancelled) setNextQr(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [nextUrlAbs])

  // Objekt-URL für die Vorschau wieder freigeben
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center py-24 text-warm-500">
        Die Foto-Station wird gerade vorbereitet. Bitte gleich noch einmal versuchen.
      </div>
    )
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) return
    setPhase('processing')
    setError('')
    try {
      const compressed = await compressImage(file)
      await uploadPhoto(compressed)
      setPhase('done')
    } catch (err) {
      console.error('Foto-Upload fehlgeschlagen:', err)
      setError('Der Upload hat leider nicht geklappt. Bitte versucht es noch einmal.')
      setPhase('select')
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <AnimatePresence mode="wait">
        {/* ── Auswahl / Upload ────────────────────────────── */}
        {phase !== 'done' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">📸</div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-warm-800">
              {config.fotoTitle}
            </h1>
            <p className="mt-4 whitespace-pre-line text-warm-600 leading-relaxed">
              {config.fotoIntro}
            </p>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleSelect}
              className="hidden"
            />

            {preview ? (
              <div className="mt-6">
                <img
                  src={preview}
                  alt="Vorschau"
                  className="mx-auto max-h-72 w-auto rounded-2xl border border-warm-100 object-contain shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="mt-3 text-sm text-primary-600 underline hover:text-primary-700 cursor-pointer"
                  disabled={phase === 'processing'}
                >
                  Anderes Foto wählen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-8 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary-300 bg-primary-50/50 px-6 py-12 text-primary-700 transition-colors hover:bg-primary-50 cursor-pointer"
              >
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span className="font-semibold">Foto auswählen</span>
                <span className="text-xs text-primary-500">Kamera oder Galerie</span>
              </button>
            )}

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

            <button
              type="button"
              onClick={handleUpload}
              disabled={!file || phase === 'processing'}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-500 px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-600 active:bg-primary-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              {phase === 'processing' ? (
                <>
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Wird hochgeladen…
                </>
              ) : (
                'Foto hochladen'
              )}
            </button>
          </motion.div>
        )}

        {/* ── Lösungswort nach Upload ─────────────────────── */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-4"
          >
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-warm-600">{config.fotoMessage}</p>
            <p className="mt-6 text-sm uppercase tracking-widest text-warm-400">
              Euer Lösungswort
            </p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mt-2 font-display text-4xl md:text-6xl font-extrabold text-primary-600 break-words"
            >
              {config.fotoSolutionWord}
            </motion.p>

            {nextUrlAbs && (
              <div className="mt-10 flex flex-col items-center gap-4">
                <a
                  href={nextUrlAbs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-secondary-600 active:bg-secondary-700"
                >
                  {config.fotoNextLabel || 'Weiter'}
                </a>
                {nextQr && (
                  <img
                    src={nextQr}
                    alt="QR-Code zur nächsten Station"
                    className="h-36 w-36 rounded-xl border border-warm-100"
                  />
                )}
              </div>
            )}

            {config.fotoNote && (
              <p className="mx-auto mt-8 max-w-md rounded-xl bg-warm-100 px-4 py-3 text-sm text-warm-600">
                {config.fotoNote}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
