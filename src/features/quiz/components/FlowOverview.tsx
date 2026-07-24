import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent } from '@/components/ui/Card'
import type { QrCode } from '../types'

/* ── Ablauf-Definition ─────────────────────────────────────
   Zwei Teams durchlaufen dieselben Stationen in unterschiedlicher
   Reihenfolge. `via` beschreibt den QR-Code / Link, über den man zur
   Station gelangt. `qr` referenziert entweder eine App-Seite (app:…)
   oder einen konfigurierbaren QR-Code (cfg:…); Maps-Links (in der App)
   haben keinen eigenen Ausdruck-QR. */

type QrRef = string | null // 'app:quiz' | 'cfg:see1' | 'maps' | null

interface Step {
  viaLabel: string | null
  qr: QrRef
  emoji: string
  title: string
  desc: string
  word?: number
  wordLabel?: string
  goal?: boolean
}

const START: Step = {
  viaLabel: null,
  qr: null,
  emoji: '✨',
  title: 'Start',
  desc: 'Beide Teams erhalten einen Text: An der Lichterkette hängen zwei QR-Codes.',
}

const TEAM1: Step[] = [
  START,
  { viaLabel: 'QR an der Lichterkette (Team 1)', qr: 'app:quiz', emoji: '🧩', title: 'Quiz', desc: '6 Fragen → Lösungswort + Maps-Link.', word: 1, wordLabel: 'Quiz' },
  { viaLabel: 'Maps-Link (Team 1, in der App)', qr: 'maps', emoji: '🌊', title: 'See 1', desc: 'Am Ufer hängt ein QR-Code mit Sprachnachricht.' },
  { viaLabel: 'QR-Code: Sprachnachricht (See 1)', qr: 'cfg:see1', emoji: '🌉', title: 'Brücke · Buch', desc: 'Unter der Brücke ein Buch: Text, Lösungswort und ein QR-Code als Bild.', word: 2, wordLabel: 'Buch' },
  { viaLabel: 'QR-Bild im Buch', qr: 'cfg:buch', emoji: '🛝', title: 'Rutsche', desc: 'An der Rutsche hängt der QR-Code der Foto-Station.' },
  { viaLabel: 'QR an der Rutsche', qr: 'app:foto', emoji: '📸', title: 'Foto', desc: 'Foto hochladen → Lösungswort.', word: 3, wordLabel: 'Foto' },
  { viaLabel: '3 Wörter komplett', qr: null, emoji: '🎯', title: 'what3words', desc: 'Reihenfolge: Quiz · Buch · Foto → Ziel finden.', goal: true },
]

const TEAM2: Step[] = [
  START,
  { viaLabel: 'QR an der Lichterkette (Team 2)', qr: 'cfg:lk2', emoji: '🌊', title: 'See 2', desc: 'Etwas anderer Ort. Am Ufer ein QR-Code mit Sprachnachricht.' },
  { viaLabel: 'QR-Code: Sprachnachricht (See 2)', qr: 'cfg:see2', emoji: '🛝', title: 'Rutsche', desc: 'An der Rutsche hängt der QR-Code der Foto-Station.' },
  { viaLabel: 'QR an der Rutsche', qr: 'app:foto', emoji: '📸', title: 'Foto', desc: 'Foto hochladen → Lösungswort + Link zum Quiz.', word: 1, wordLabel: 'Foto' },
  { viaLabel: 'Link / QR auf der Foto-Seite', qr: 'app:quiz2', emoji: '🧩', title: 'Quiz 2', desc: '6 Fragen → Lösungswort + Maps-Link.', word: 2, wordLabel: 'Quiz' },
  { viaLabel: 'Maps-Link (Team 2, in der App)', qr: 'maps', emoji: '🌉', title: 'Brücke · Buch', desc: 'Das Buch unter der Brücke: Text und Lösungswort.', word: 3, wordLabel: 'Buch' },
  { viaLabel: '3 Wörter komplett', qr: null, emoji: '🎯', title: 'what3words', desc: 'Reihenfolge: Foto · Quiz · Buch → Ziel finden.', goal: true },
]

function resolveUrl(ref: QrRef, origin: string, cfg: Record<string, string>): string {
  if (!ref) return ''
  if (ref.startsWith('app:')) return `${origin}/${ref.slice(4)}`
  if (ref.startsWith('cfg:')) {
    const url = cfg[ref.slice(4)] ?? ''
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('/')) return `${origin}${url}`
    return `https://${url}`
  }
  return ''
}

export function FlowOverview({ qrCodes }: { qrCodes: QrCode[] }) {
  const origin = window.location.origin
  const cfg: Record<string, string> = {}
  for (const q of qrCodes) cfg[q.id] = q.url

  // Alle benötigten QR-Ziele einsammeln und Data-URLs erzeugen
  const refs = new Set<string>()
  for (const s of [...TEAM1, ...TEAM2]) {
    if (s.qr && s.qr !== 'maps') refs.add(s.qr)
  }
  const urlByRef: Record<string, string> = {}
  for (const ref of refs) urlByRef[ref] = resolveUrl(ref, origin, cfg)

  const [qrByRef, setQrByRef] = useState<Record<string, string>>({})
  const depKey = JSON.stringify(urlByRef)

  useEffect(() => {
    let cancelled = false
    const entries = Object.entries(urlByRef).filter(([, url]) => url)
    Promise.all(
      entries.map(([ref, url]) =>
        QRCode.toDataURL(url, { width: 200, margin: 1 })
          .then((d) => [ref, d] as const)
          .catch(() => [ref, ''] as const)
      )
    ).then((pairs) => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const [ref, d] of pairs) map[ref] = d
      setQrByRef(map)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depKey])

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="font-semibold text-warm-800 mb-1">Ablauf der Rätsel-Rallye</h2>
        <p className="text-sm text-warm-500 mb-5">
          Beide Teams sammeln drei Lösungswörter (für what3words) – über dieselben
          Stationen, aber in unterschiedlicher Reihenfolge. QR-Codes ohne Ziel sind
          noch nicht gesetzt.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          <TeamFlow title="Team 1" accent="primary" steps={TEAM1} qrByRef={qrByRef} urlByRef={urlByRef} />
          <TeamFlow title="Team 2" accent="secondary" steps={TEAM2} qrByRef={qrByRef} urlByRef={urlByRef} />
        </div>
      </CardContent>
    </Card>
  )
}

function TeamFlow({
  title,
  accent,
  steps,
  qrByRef,
  urlByRef,
}: {
  title: string
  accent: 'primary' | 'secondary'
  steps: Step[]
  qrByRef: Record<string, string>
  urlByRef: Record<string, string>
}) {
  const ring = accent === 'primary' ? 'border-primary-200' : 'border-secondary-200'
  const dot = accent === 'primary' ? 'bg-primary-500' : 'bg-secondary-500'
  const chip = accent === 'primary' ? 'text-primary-700 bg-primary-50' : 'text-secondary-700 bg-secondary-50'
  const line = accent === 'primary' ? 'bg-primary-200' : 'bg-secondary-200'

  return (
    <div>
      <div className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${chip}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {title}
      </div>
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const url = s.qr && s.qr !== 'maps' ? urlByRef[s.qr] : ''
          const qr = s.qr && s.qr !== 'maps' ? qrByRef[s.qr] : ''
          const missing = s.qr?.startsWith('cfg:') && !url
          return (
            <li key={i}>
              {/* Verbindung / QR-Code zur Station */}
              {s.viaLabel && (
                <div className="flex items-stretch gap-3 pl-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-px flex-1 ${line}`} />
                  </div>
                  <div className="flex-1 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-medium ${chip}`}>
                        {s.qr === 'maps' ? '🔗 ' : s.qr ? '▣ ' : '✓ '}
                        {s.viaLabel}
                      </span>
                    </div>
                    {qr && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <img src={qr} alt="QR" className="h-16 w-16 rounded border border-warm-100" />
                        <a href={qr} download={`qr-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} className="text-xs text-primary-600 underline hover:text-primary-700">
                          Download
                        </a>
                      </div>
                    )}
                    {missing && (
                      <p className="mt-1 text-[11px] text-amber-600">Ziel noch nicht gesetzt</p>
                    )}
                  </div>
                </div>
              )}

              {/* Station */}
              <div className={`flex gap-3 rounded-xl border ${ring} bg-white/60 p-3`}>
                <div className={`flex h-9 w-9 flex-none items-center justify-center rounded-full text-lg ${s.goal ? dot : 'bg-warm-100'}`}>
                  {s.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-warm-800">{s.title}</span>
                    {s.word && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${chip}`}>
                        Wort {s.word}: {s.wordLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-warm-500">{s.desc}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
