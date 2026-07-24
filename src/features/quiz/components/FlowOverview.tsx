import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import type { QrCode } from '../types'

/* ── Ablauf-Definition ─────────────────────────────────────
   Zwei Teams, dieselben Stationen in unterschiedlicher Reihenfolge.
   `via` beschreibt, wie man zur Station gelangt:
   - appqr: fester QR-Code auf eine App-Seite (/quiz, /quiz2, /foto)
   - cfg:   konfigurierbarer QR-Code (Maps/Sprachnachricht) – hier direkt editierbar
   - maps:  In-App-Link nach dem Quiz (kein Ausdruck-QR) – hier direkt editierbar */

type Via =
  | { kind: 'appqr'; path: '/quiz' | '/quiz2' | '/foto'; label: string }
  | { kind: 'cfg'; ref: string; label: string }
  | { kind: 'maps'; team: 1 | 2; label: string }

interface Station {
  via?: Via
  emoji: string
  title: string
  desc: string
  appPath?: '/quiz' | '/quiz2' | '/foto'
  word?: number
  wordLabel?: string
  goal?: boolean
}

/** Labels für die konfigurierbaren QR-Codes (für Upsert). */
const CFG_LABELS: Record<string, string> = {
  lk2: 'Lichterkette – Team 2 → See 2 (Maps)',
  see1: 'See 1 – Sprachnachricht (Team 1)',
  see2: 'See 2 – Sprachnachricht (Team 2)',
  buch: 'Buch (Brücke) → Rutsche (Maps)',
}

const START: Station = {
  emoji: '✨',
  title: 'Start',
  desc: 'Beide Teams bekommen einen Text: An der Lichterkette hängen zwei QR-Codes.',
}

const TEAM1: Station[] = [
  START,
  { via: { kind: 'appqr', path: '/quiz', label: 'QR an der Lichterkette' }, emoji: '🧩', title: 'Quiz', appPath: '/quiz', desc: '6 Fragen → Lösungswort + Maps-Link.', word: 1, wordLabel: 'Quiz' },
  { via: { kind: 'maps', team: 1, label: 'Maps-Link nach dem Quiz' }, emoji: '🌊', title: 'See 1', desc: 'Am Ufer hängt ein QR-Code mit einer Sprachnachricht.' },
  { via: { kind: 'cfg', ref: 'see1', label: 'QR: Sprachnachricht (See 1)' }, emoji: '🌉', title: 'Brücke · Buch', desc: 'Unter der Brücke ein Buch: Text, Lösungswort und ein QR-Code als Bild.', word: 2, wordLabel: 'Buch' },
  { via: { kind: 'cfg', ref: 'buch', label: 'QR-Bild im Buch' }, emoji: '🛝', title: 'Rutsche', desc: 'An der Rutsche hängt der QR-Code der Foto-Station.' },
  { via: { kind: 'appqr', path: '/foto', label: 'QR an der Rutsche' }, emoji: '📸', title: 'Foto', appPath: '/foto', desc: 'Foto hochladen → Lösungswort.', word: 3, wordLabel: 'Foto' },
  { emoji: '🎯', title: 'what3words', desc: 'Reihenfolge: Quiz · Buch · Foto → Ziel finden.', goal: true },
]

const TEAM2: Station[] = [
  START,
  { via: { kind: 'cfg', ref: 'lk2', label: 'QR an der Lichterkette' }, emoji: '🌊', title: 'See 2', desc: 'Etwas anderer Ort. Am Ufer ein QR-Code mit Sprachnachricht.' },
  { via: { kind: 'cfg', ref: 'see2', label: 'QR: Sprachnachricht (See 2)' }, emoji: '🛝', title: 'Rutsche', desc: 'An der Rutsche hängt der QR-Code der Foto-Station.' },
  { via: { kind: 'appqr', path: '/foto', label: 'QR an der Rutsche' }, emoji: '📸', title: 'Foto', appPath: '/foto', desc: 'Foto hochladen → Lösungswort + Link zum Quiz.', word: 1, wordLabel: 'Foto' },
  { via: { kind: 'appqr', path: '/quiz2', label: 'Link/QR auf der Foto-Seite' }, emoji: '🧩', title: 'Quiz 2', appPath: '/quiz2', desc: '6 Fragen → Lösungswort + Maps-Link.', word: 2, wordLabel: 'Quiz' },
  { via: { kind: 'maps', team: 2, label: 'Maps-Link nach dem Quiz' }, emoji: '🌉', title: 'Brücke · Buch', desc: 'Das Buch unter der Brücke: Text und Lösungswort.', word: 3, wordLabel: 'Buch' },
  { emoji: '🎯', title: 'what3words', desc: 'Reihenfolge: Foto · Quiz · Buch → Ziel finden.', goal: true },
]

function toAbsolute(url: string, origin: string): string {
  const t = (url ?? '').trim()
  if (!t) return ''
  if (/^https?:\/\//i.test(t)) return t
  if (t.startsWith('/')) return `${origin}${t}`
  return `https://${t}`
}

interface Props {
  qrCodes: QrCode[]
  setQrCodes: React.Dispatch<React.SetStateAction<QrCode[]>>
  mapsLinkTeam1: string
  setMapsLinkTeam1: (v: string) => void
  mapsLinkTeam2: string
  setMapsLinkTeam2: (v: string) => void
}

export function FlowOverview(props: Props) {
  const { qrCodes } = props
  const origin = window.location.origin

  const cfgUrl = (ref: string) => qrCodes.find((q) => q.id === ref)?.url ?? ''
  const qrCodesKey = JSON.stringify(qrCodes)

  // Alle QR-Ziele (App + konfigurierte) einsammeln → Data-URLs erzeugen
  const targets = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of [...TEAM1, ...TEAM2]) {
      if (!s.via) continue
      if (s.via.kind === 'appqr') map[`app:${s.via.path}`] = `${origin}${s.via.path}`
      else if (s.via.kind === 'cfg') map[`cfg:${s.via.ref}`] = toAbsolute(cfgUrl(s.via.ref), origin)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, qrCodesKey])

  const [qrMap, setQrMap] = useState<Record<string, string>>({})
  const depKey = JSON.stringify(targets)

  useEffect(() => {
    let cancelled = false
    const entries = Object.entries(targets).filter(([, url]) => url)
    Promise.all(
      entries.map(([key, url]) =>
        QRCode.toDataURL(url, { width: 220, margin: 1 })
          .then((d) => [key, d] as const)
          .catch(() => [key, ''] as const)
      )
    ).then((pairs) => {
      if (cancelled) return
      setQrMap(Object.fromEntries(pairs))
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
        <p className="text-sm text-warm-500 mb-4 max-w-3xl">
          Beide Teams sammeln drei Lösungswörter (für what3words) – über dieselben
          Stationen, aber in anderer Reihenfolge. QR-Ziele könnt ihr direkt hier
          eintragen; gleiche QR-Codes werden automatisch überall übernommen.
        </p>
        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-xs text-warm-500">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-primary-500" /> Team 1</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-secondary-500" /> Team 2</span>
          <span>▣ QR-Code (ausdrucken)</span>
          <span>🔗 In-App-Link</span>
          <span>↗ App-Seite öffnen</span>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <TeamLane title="Team 1" accent="primary" stations={TEAM1} qrMap={qrMap} origin={origin} {...props} />
          <TeamLane title="Team 2" accent="secondary" stations={TEAM2} qrMap={qrMap} origin={origin} {...props} />
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Eine Team-Spur ────────────────────────────────────── */

function TeamLane({
  title,
  accent,
  stations,
  qrMap,
  origin,
  qrCodes,
  setQrCodes,
  mapsLinkTeam1,
  setMapsLinkTeam1,
  mapsLinkTeam2,
  setMapsLinkTeam2,
}: Props & {
  title: string
  accent: 'primary' | 'secondary'
  stations: Station[]
  qrMap: Record<string, string>
  origin: string
}) {
  const A =
    accent === 'primary'
      ? { chip: 'bg-primary-50 text-primary-700', dot: 'bg-primary-500', line: 'bg-primary-200', ring: 'border-primary-100', soft: 'bg-primary-50/40' }
      : { chip: 'bg-secondary-50 text-secondary-700', dot: 'bg-secondary-500', line: 'bg-secondary-200', ring: 'border-secondary-100', soft: 'bg-secondary-50/40' }

  const upsertCfg = (ref: string, url: string) => {
    setQrCodes((prev) => {
      const i = prev.findIndex((q) => q.id === ref)
      if (i >= 0) return prev.map((q) => (q.id === ref ? { ...q, url } : q))
      return [...prev, { id: ref, label: CFG_LABELS[ref] ?? ref, url }]
    })
  }

  const wordOrder = stations.filter((s) => s.word).map((s) => s.wordLabel).join(' · ')

  return (
    <div className={`rounded-2xl border ${A.ring} ${A.soft} p-4`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${A.chip}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${A.dot}`} />
          {title}
        </span>
        <span className="text-xs text-warm-500">Wörter: {wordOrder}</span>
      </div>

      <ol className="relative space-y-1">
        {stations.map((s, i) => {
          const via = s.via
          const cfgVal = via?.kind === 'cfg' ? cfgUrlFor(qrCodes, via.ref) : ''
          const mapsVal = via?.kind === 'maps' ? (via.team === 1 ? mapsLinkTeam1 : mapsLinkTeam2) : ''
          const qrKey = via?.kind === 'appqr' ? `app:${via.path}` : via?.kind === 'cfg' ? `cfg:${via.ref}` : ''
          const qr = qrKey ? qrMap[qrKey] : ''
          const absForCopy = via?.kind === 'appqr' ? `${origin}${via.path}` : ''

          return (
            <li key={i}>
              {/* Verbindung zur Station */}
              {via && (
                <div className="flex gap-3">
                  <div className="flex w-9 flex-none flex-col items-center">
                    <span className={`my-1 h-full w-px ${A.line}`} />
                  </div>
                  <div className="min-w-0 flex-1 py-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-warm-500">
                        {via.kind === 'maps' ? '🔗' : '▣'} {via.label}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-start gap-3">
                      {/* QR-Bild (App fest oder konfiguriert) */}
                      {(via.kind === 'appqr' || via.kind === 'cfg') && (
                        <div className="flex-none text-center">
                          {qr ? (
                            <>
                              <img src={qr} alt="QR-Code" className="h-16 w-16 rounded border border-warm-100 bg-white" />
                              <a href={qr} download={`qr-${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`} className="mt-0.5 block text-[10px] text-primary-600 underline">
                                Download
                              </a>
                            </>
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-warm-200 text-center text-[9px] leading-tight text-warm-400">
                              QR nach Eingabe
                            </div>
                          )}
                        </div>
                      )}

                      {/* Editierbares Ziel */}
                      <div className="min-w-0 flex-1 space-y-1">
                        {via.kind === 'appqr' && (
                          <div className="flex items-center gap-2">
                            <code className="truncate rounded bg-warm-100 px-2 py-1 text-xs text-warm-600">{via.path}</code>
                            <a href={absForCopy} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap text-xs font-medium text-primary-600 hover:text-primary-700">
                              Öffnen ↗
                            </a>
                          </div>
                        )}
                        {via.kind === 'cfg' && (
                          <Input
                            value={cfgVal}
                            onChange={(e) => upsertCfg(via.ref, e.target.value)}
                            placeholder="https://maps… oder Sprachnachricht-URL"
                            className="h-9 text-xs"
                          />
                        )}
                        {via.kind === 'maps' && (
                          <Input
                            value={mapsVal}
                            onChange={(e) => (via.team === 1 ? setMapsLinkTeam1(e.target.value) : setMapsLinkTeam2(e.target.value))}
                            placeholder="https://maps.app.goo.gl/…"
                            className="h-9 text-xs"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Station */}
              <div className={`flex items-start gap-3 rounded-xl border ${A.ring} bg-white p-3`}>
                <div className={`flex h-10 w-9 flex-none items-center justify-center rounded-full text-lg ${s.goal ? A.dot : 'bg-warm-100'}`}>
                  {s.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-warm-800">{s.title}</span>
                    {s.appPath && (
                      <a href={`${origin}${s.appPath}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary-600 hover:text-primary-700">
                        ↗ öffnen
                      </a>
                    )}
                    {s.word && (
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${A.chip}`}>
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

function cfgUrlFor(qrCodes: QrCode[], ref: string): string {
  return qrCodes.find((q) => q.id === ref)?.url ?? ''
}
