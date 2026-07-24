import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { useToastStore } from '@/components/feedback/Toast'
import { useQuizStore } from '../store'
import { usePhotoStore } from '../photoStore'
import { useAudioStore, MAX_AUDIO_BYTES, type AudioStation } from '../audioStore'
import { FlowOverview } from './FlowOverview'
import type { QuizQuestion, QrCode } from '../types'

const MAX_OPTIONS = 6
const MIN_OPTIONS = 2

type TabKey = 'overview' | 'quiz' | 'foto' | 'audio' | 'qr' | 'settings'

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Übersicht', icon: '🗺️' },
  { key: 'quiz', label: 'Quiz', icon: '🧩' },
  { key: 'foto', label: 'Foto', icon: '📸' },
  { key: 'audio', label: 'Sprache', icon: '🔊' },
  { key: 'qr', label: 'QR-Codes', icon: '▣' },
  { key: 'settings', label: 'Einstellungen', icon: '⚙️' },
]

/** Erzeugt eine kurze, eindeutige Frage-ID. */
function newId() {
  return 'q' + Math.random().toString(36).slice(2, 8)
}

export function QuizAdmin() {
  const config = useQuizStore((s) => s.config)
  const isLoading = useQuizStore((s) => s.isLoading)
  const isAdmin = useQuizStore((s) => s.isAdmin)
  const subscribe = useQuizStore((s) => s.subscribe)
  const loginAdmin = useQuizStore((s) => s.loginAdmin)
  const logoutAdmin = useQuizStore((s) => s.logoutAdmin)
  const save = useQuizStore((s) => s.save)
  const changePassword = useQuizStore((s) => s.changePassword)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    const unsub = subscribe()
    return () => unsub()
  }, [subscribe])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
      </div>
    )
  }

  if (!isAdmin) {
    return <LoginForm onLogin={loginAdmin} onError={() => addToast('Falsches Passwort', 'error')} />
  }

  if (!config) {
    return (
      <div className="text-center py-24 text-warm-500">
        Quiz wird geladen…
      </div>
    )
  }

  return (
    <Editor
      key={config.updatedAt?.toMillis?.() ?? 'draft'}
      initial={config}
      onSave={save}
      onChangePassword={changePassword}
      onLogout={logoutAdmin}
      notify={addToast}
    />
  )
}

/* ── Login ─────────────────────────────────────────────── */

function LoginForm({
  onLogin,
  onError,
}: {
  onLogin: (pw: string) => Promise<boolean>
  onError: () => void
}) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const ok = await onLogin(password)
    setBusy(false)
    if (!ok) {
      onError()
      setPassword('')
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-warm-800 text-center mb-2">
        Quiz-Administration
      </h1>
      <p className="text-warm-500 text-center text-sm mb-6">
        Bitte Passwort eingeben
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Input
          type="password"
          label="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <Button type="submit" className="w-full" disabled={busy || !password}>
          {busy ? 'Prüfe…' : 'Anmelden'}
        </Button>
      </form>
    </div>
  )
}

/* ── Editor ────────────────────────────────────────────── */

interface EditorProps {
  initial: import('../types').QuizConfig
  onSave: (patch: {
    title: string
    intro: string
    solutionWord: string
    solutionMessage: string
    mapsLinkLabel: string
    mapsLinkTeam1: string
    mapsLinkTeam2: string
    fotoTitle: string
    fotoIntro: string
    fotoSolutionWord: string
    fotoMessage: string
    fotoNextLabel: string
    fotoNextUrl: string
    fotoNote: string
    see1Title: string
    see1Text: string
    see2Title: string
    see2Text: string
    qrCodes: QrCode[]
    questions: QuizQuestion[]
  }) => Promise<void>
  onChangePassword: (pw: string) => Promise<void>
  onLogout: () => void
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void
}

function Editor({ initial, onSave, onChangePassword, onLogout, notify }: EditorProps) {
  const [title, setTitle] = useState(initial.title)
  const [intro, setIntro] = useState(initial.intro)
  const [solutionWord, setSolutionWord] = useState(initial.solutionWord)
  const [solutionMessage, setSolutionMessage] = useState(initial.solutionMessage ?? '')
  const [mapsLinkLabel, setMapsLinkLabel] = useState(
    initial.mapsLinkLabel ?? 'Weiter zur nächsten Station 📍'
  )
  const [mapsLinkTeam1, setMapsLinkTeam1] = useState(initial.mapsLinkTeam1 ?? '')
  const [mapsLinkTeam2, setMapsLinkTeam2] = useState(initial.mapsLinkTeam2 ?? '')
  const [fotoTitle, setFotoTitle] = useState(initial.fotoTitle ?? 'Foto-Station 📸')
  const [fotoIntro, setFotoIntro] = useState(initial.fotoIntro ?? '')
  const [fotoSolutionWord, setFotoSolutionWord] = useState(initial.fotoSolutionWord ?? '')
  const [fotoMessage, setFotoMessage] = useState(initial.fotoMessage ?? '')
  const [fotoNextLabel, setFotoNextLabel] = useState(initial.fotoNextLabel ?? 'Weiter zum Quiz')
  const [fotoNextUrl, setFotoNextUrl] = useState(initial.fotoNextUrl ?? '/quiz2')
  const [fotoNote, setFotoNote] = useState(initial.fotoNote ?? '')
  const [see1Title, setSee1Title] = useState(initial.see1Title ?? 'Sprachnachricht 🔊')
  const [see1Text, setSee1Text] = useState(initial.see1Text ?? '')
  const [see2Title, setSee2Title] = useState(initial.see2Title ?? 'Sprachnachricht 🔊')
  const [see2Text, setSee2Text] = useState(initial.see2Text ?? '')
  const [qrCodes, setQrCodes] = useState<QrCode[]>(
    (initial.qrCodes ?? []).map((q) => ({ ...q }))
  )
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initial.questions.map((q) => ({ ...q, options: [...q.options] }))
  )
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<TabKey>('overview')
  const urlTeam1 = `${window.location.origin}/quiz`
  const urlTeam2 = `${window.location.origin}/quiz2`
  const urlFoto = `${window.location.origin}/foto`
  const urlSee1 = `${window.location.origin}/see1`
  const urlSee2 = `${window.location.origin}/see2`

  const updateQuestion = (id: string, patch: Partial<QuizQuestion>) => {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const updateOption = (id: string, index: number, value: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id
          ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) }
          : q
      )
    )
  }

  const addOption = (id: string) => {
    setQuestions((qs) =>
      qs.map((q) =>
        q.id === id && q.options.length < MAX_OPTIONS
          ? { ...q, options: [...q.options, ''] }
          : q
      )
    )
  }

  const removeOption = (id: string, index: number) => {
    setQuestions((qs) =>
      qs.map((q) => {
        if (q.id !== id || q.options.length <= MIN_OPTIONS) return q
        const options = q.options.filter((_, i) => i !== index)
        let correctIndex = q.correctIndex
        if (index === correctIndex) correctIndex = 0
        else if (index < correctIndex) correctIndex -= 1
        return { ...q, options, correctIndex }
      })
    )
  }

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      { id: newId(), text: '', options: ['', '', '', ''], correctIndex: 0 },
    ])
  }

  const removeQuestion = (id: string) => {
    setQuestions((qs) => qs.filter((q) => q.id !== id))
  }

  const moveQuestion = (index: number, dir: -1 | 1) => {
    setQuestions((qs) => {
      const next = [...qs]
      const target = index + dir
      if (target < 0 || target >= next.length) return qs
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const validate = (): string | null => {
    if (!title.trim()) return 'Bitte einen Titel angeben.'
    if (!solutionWord.trim()) return 'Bitte ein Lösungswort angeben.'
    if (questions.length === 0) return 'Mindestens eine Frage erforderlich.'
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.text.trim()) return `Frage ${i + 1}: Text fehlt.`
      if (q.options.some((o) => !o.trim()))
        return `Frage ${i + 1}: Alle Antwortmöglichkeiten müssen ausgefüllt sein.`
    }
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) {
      notify(err, 'error')
      return
    }
    setSaving(true)
    try {
      await onSave({
        title: title.trim(),
        intro,
        solutionWord: solutionWord.trim(),
        solutionMessage,
        mapsLinkLabel: mapsLinkLabel.trim(),
        mapsLinkTeam1: mapsLinkTeam1.trim(),
        mapsLinkTeam2: mapsLinkTeam2.trim(),
        fotoTitle: fotoTitle.trim(),
        fotoIntro,
        fotoSolutionWord: fotoSolutionWord.trim(),
        fotoMessage,
        fotoNextLabel: fotoNextLabel.trim(),
        fotoNextUrl: fotoNextUrl.trim(),
        fotoNote,
        see1Title: see1Title.trim(),
        see1Text,
        see2Title: see2Title.trim(),
        see2Text,
        qrCodes: qrCodes.map((q) => ({ ...q, label: q.label.trim(), url: q.url.trim() })),
        questions,
      })
      if (newPassword) {
        await onChangePassword(newPassword)
        setNewPassword('')
      }
      notify('Gespeichert!', 'success')
    } catch {
      notify('Speichern fehlgeschlagen', 'error')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => notify('Link kopiert!', 'success'))
      .catch(() => notify('Kopieren fehlgeschlagen', 'error'))
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 space-y-8">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-800">Quiz bearbeiten</h1>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Abmelden
        </Button>
      </div>

      {/* Tab-Navigation */}
      <div className="sticky top-0 z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-warm-100 bg-[#FFFBF5]/90 px-4 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-none rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              tab === t.key ? 'bg-primary-500 text-white' : 'text-warm-600 hover:bg-warm-100'
            }`}
          >
            <span className="mr-1">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Übersicht ─────────────────────────────────────── */}
      {tab === 'overview' && (
        <FlowOverview
          qrCodes={qrCodes}
          setQrCodes={setQrCodes}
          mapsLinkTeam1={mapsLinkTeam1}
          setMapsLinkTeam1={setMapsLinkTeam1}
          mapsLinkTeam2={mapsLinkTeam2}
          setMapsLinkTeam2={setMapsLinkTeam2}
        />
      )}

      {/* ── QR-Codes: Druck-Übersicht ─────────────────────── */}
      {tab === 'qr' && (
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-semibold text-warm-800 mb-1">
                Alle QR-Codes zum Ausdrucken
              </h2>
              <p className="text-sm text-warm-500 mb-4">
                Feste App-QR-Codes und die im Tab „Übersicht" eingetragenen Ziele.
                Ziele ändern? Einfach in die <strong>Übersicht</strong> wechseln.
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <QrPrintTile label="Quiz – Team 1" url={urlTeam1} onCopy={copyLink} />
                <QrPrintTile label="Quiz – Team 2" url={urlTeam2} onCopy={copyLink} />
                <QrPrintTile label="Foto-Station" url={urlFoto} onCopy={copyLink} />
                <QrPrintTile label="See 1 – Sprachnachricht" url={urlSee1} onCopy={copyLink} />
                <QrPrintTile label="See 2 – Sprachnachricht" url={urlSee2} onCopy={copyLink} />
                {qrCodes
                  .filter((q) => q.url.trim())
                  .map((q) => (
                    <QrPrintTile
                      key={q.id}
                      label={q.label}
                      url={toAbsolute(q.url)}
                      onCopy={copyLink}
                    />
                  ))}
              </div>
              {qrCodes.some((q) => !q.url.trim()) && (
                <p className="mt-4 text-xs text-amber-600">
                  {qrCodes.filter((q) => !q.url.trim()).length} QR-Code(s) ohne Ziel –
                  in der Übersicht ergänzen.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Quiz ──────────────────────────────────────────── */}
      {tab === 'quiz' && (
        <div className="mx-auto max-w-2xl space-y-8">
      {/* Grundeinstellungen */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-warm-800">Grundeinstellungen</h2>
          <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea
            label="Einleitungstext"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={4}
          />
          <Input
            label="Lösungswort"
            value={solutionWord}
            onChange={(e) => setSolutionWord(e.target.value)}
          />
          <Textarea
            label="Nachricht beim Lösungswort"
            value={solutionMessage}
            onChange={(e) => setSolutionMessage(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Nächste Station – Google-Maps-Links je Team */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-warm-800">Nächste Station (Google Maps)</h2>
          <p className="text-sm text-warm-500">
            Nach dem Lösungswort erscheint ein Button mit dem Link zur nächsten
            Station. Der Button-Text ist für beide Teams gleich – der Link
            unterscheidet sich je Team. Leer lassen, um keinen Button anzuzeigen.
          </p>
          <Input
            label="Button-Text (für beide Teams)"
            value={mapsLinkLabel}
            onChange={(e) => setMapsLinkLabel(e.target.value)}
            placeholder="Weiter zur nächsten Station 📍"
          />
          <Input
            label="Google-Maps-Link – Team 1 (/quiz)"
            value={mapsLinkTeam1}
            onChange={(e) => setMapsLinkTeam1(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
          />
          <Input
            label="Google-Maps-Link – Team 2 (/quiz2)"
            value={mapsLinkTeam2}
            onChange={(e) => setMapsLinkTeam2(e.target.value)}
            placeholder="https://maps.app.goo.gl/…"
          />
        </CardContent>
      </Card>
        </div>
      )}

      {/* ── Foto ──────────────────────────────────────────── */}
      {tab === 'foto' && (
        <div className="mx-auto max-w-2xl space-y-8">
      {/* Foto-Station (/foto) */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-warm-800">Foto-Station (/foto)</h2>
          <p className="text-sm text-warm-500">
            Nach dem Foto-Upload erscheinen Lösungswort, ein Weiter-Button mit
            QR-Code und ein Hinweistext.
          </p>
          <Input
            label="Titel"
            value={fotoTitle}
            onChange={(e) => setFotoTitle(e.target.value)}
          />
          <Textarea
            label="Einleitungstext"
            value={fotoIntro}
            onChange={(e) => setFotoIntro(e.target.value)}
            rows={2}
          />
          <Input
            label="Lösungswort"
            value={fotoSolutionWord}
            onChange={(e) => setFotoSolutionWord(e.target.value)}
          />
          <Textarea
            label="Nachricht nach dem Upload"
            value={fotoMessage}
            onChange={(e) => setFotoMessage(e.target.value)}
            rows={2}
          />
          <Input
            label="Weiter-Button: Text"
            value={fotoNextLabel}
            onChange={(e) => setFotoNextLabel(e.target.value)}
            placeholder="Weiter zum Quiz"
          />
          <Input
            label="Weiter-Button: Ziel (z. B. /quiz2 oder volle URL)"
            value={fotoNextUrl}
            onChange={(e) => setFotoNextUrl(e.target.value)}
            placeholder="/quiz2"
          />
          <Textarea
            label="Hinweistext unter dem Button"
            value={fotoNote}
            onChange={(e) => setFotoNote(e.target.value)}
            rows={2}
          />
        </CardContent>
      </Card>

      {/* Foto-Galerie */}
      <PhotoGallery notify={notify} />
        </div>
      )}

      {/* ── Sprachnachrichten ─────────────────────────────── */}
      {tab === 'audio' && (
        <div className="mx-auto max-w-2xl space-y-8">
          <p className="text-sm text-warm-500">
            Zwei Sprachnachricht-Stationen. Die QR-Codes dafür (`/see1`, `/see2`)
            findet ihr im Tab „QR-Codes". Titel und Text sowie die Audiodatei sind
            hier einstellbar.
          </p>
          <AudioStationEditor
            station="see1"
            heading="See 1 – Sprachnachricht (Team 1 → Brücke)"
            title={see1Title}
            setTitle={setSee1Title}
            text={see1Text}
            setText={setSee1Text}
            notify={notify}
          />
          <AudioStationEditor
            station="see2"
            heading="See 2 – Sprachnachricht (Team 2 → Rutsche)"
            title={see2Title}
            setTitle={setSee2Title}
            text={see2Text}
            setText={setSee2Text}
            notify={notify}
          />
        </div>
      )}

      {/* ── Fragen (Teil von „Quiz") ──────────────────────── */}
      {tab === 'quiz' && (
        <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-warm-800">
            Fragen ({questions.length})
          </h2>
          <Button variant="outline" size="sm" onClick={addQuestion}>
            + Frage
          </Button>
        </div>

        {questions.map((q, qi) => (
          <Card key={q.id}>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary-600">
                  Frage {qi + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(qi, -1)}
                    disabled={qi === 0}
                    className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 disabled:opacity-30 cursor-pointer"
                    title="Nach oben"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(qi, 1)}
                    disabled={qi === questions.length - 1}
                    className="rounded-lg p-1.5 text-warm-400 hover:bg-warm-100 hover:text-warm-700 disabled:opacity-30 cursor-pointer"
                    title="Nach unten"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    title="Frage löschen"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <Textarea
                value={q.text}
                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                placeholder="Fragetext…"
                rows={2}
              />

              <div className="space-y-2">
                <p className="text-xs text-warm-500">
                  Antwortmöglichkeiten – die richtige links markieren:
                </p>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctIndex === oi}
                      onChange={() => updateQuestion(q.id, { correctIndex: oi })}
                      className="h-5 w-5 flex-none accent-secondary-500 cursor-pointer"
                      title="Als richtige Antwort markieren"
                    />
                    <Input
                      value={opt}
                      onChange={(e) => updateOption(q.id, oi, e.target.value)}
                      placeholder={`Antwort ${String.fromCharCode(65 + oi)}`}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(q.id, oi)}
                      disabled={q.options.length <= MIN_OPTIONS}
                      className="rounded-lg p-2 text-warm-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                      title="Antwort entfernen"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {q.options.length < MAX_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => addOption(q.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 cursor-pointer"
                  >
                    + Antwortmöglichkeit
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      {/* ── Einstellungen ─────────────────────────────────── */}
      {tab === 'settings' && (
        <div className="mx-auto max-w-2xl space-y-8">
      {/* Passwort ändern */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <h2 className="font-semibold text-warm-800">Admin-Passwort ändern</h2>
          <p className="text-sm text-warm-500">
            Leer lassen, um das aktuelle Passwort beizubehalten.
          </p>
          <Input
            type="password"
            label="Neues Passwort"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
        </CardContent>
      </Card>
        </div>
      )}

      {/* Speichern (sticky) */}
      <div className="sticky bottom-4 z-10 mx-auto max-w-2xl">
        <Button
          size="lg"
          className="w-full shadow-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Speichere…' : 'Änderungen speichern'}
        </Button>
      </div>
    </div>
  )
}

/* ── QR-Druckkachel (schreibgeschützt) ─────────────────── */

/** Interner Pfad oder volle URL → absolute URL (für Anzeige & QR). */
function toAbsolute(url: string): string {
  const trimmed = (url ?? '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('/')) return `${window.location.origin}${trimmed}`
  return `https://${trimmed}`
}

function QrPrintTile({
  label,
  url,
  onCopy,
}: {
  label: string
  url: string
  onCopy: (url: string) => void
}) {
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (!url) return
    let cancelled = false
    QRCode.toDataURL(url, { width: 320, margin: 1 })
      .then((d) => {
        if (!cancelled) setQr(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url])

  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return (
    <div className="flex flex-col items-center rounded-xl border border-warm-100 p-4 text-center">
      <p className="mb-2 text-sm font-semibold text-primary-600">{label}</p>
      {qr ? (
        <img src={qr} alt={`QR-Code ${label}`} className="h-32 w-32 rounded-lg border border-warm-100" />
      ) : (
        <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-warm-200 text-[11px] text-warm-400">
          kein Ziel
        </div>
      )}
      <p className="mt-2 w-full truncate text-[11px] text-warm-400" title={url}>
        {url}
      </p>
      <div className="mt-2 flex gap-3 text-xs">
        {qr && (
          <a href={qr} download={`qr-${slug}.png`} className="text-primary-600 underline hover:text-primary-700">
            Download
          </a>
        )}
        <button
          type="button"
          onClick={() => onCopy(url)}
          className="text-warm-500 underline hover:text-warm-700 cursor-pointer"
        >
          Link
        </button>
      </div>
    </div>
  )
}

/* ── Foto-Galerie ──────────────────────────────────────── */

function PhotoGallery({
  notify,
}: {
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void
}) {
  const photos = usePhotoStore((s) => s.photos)
  const isLoading = usePhotoStore((s) => s.isLoading)
  const subscribe = usePhotoStore((s) => s.subscribe)
  const deletePhoto = usePhotoStore((s) => s.deletePhoto)

  useEffect(() => {
    const unsub = subscribe()
    return () => unsub()
  }, [subscribe])

  const handleDelete = async (id: string) => {
    if (!window.confirm('Dieses Foto wirklich löschen?')) return
    try {
      await deletePhoto(id)
      notify('Foto gelöscht', 'success')
    } catch {
      notify('Löschen fehlgeschlagen', 'error')
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="font-semibold text-warm-800 mb-1">
          Hochgeladene Fotos ({photos.length})
        </h2>
        <p className="text-sm text-warm-500 mb-4">
          Fotos der Gäste – zum Herunterladen antippen oder löschen.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          </div>
        ) : photos.length === 0 ? (
          <p className="py-6 text-center text-sm text-warm-400">
            Noch keine Fotos hochgeladen.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p, i) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-warm-100">
                <img src={p.imageData} alt={`Foto ${i + 1}`} className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <a
                    href={p.imageData}
                    download={`hochzeit-foto-${i + 1}.jpg`}
                    className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-warm-800 hover:bg-white"
                  >
                    ⬇ Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-red-600 hover:bg-white cursor-pointer"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Sprachnachricht-Station (Audio-Upload) ────────────── */

function AudioStationEditor({
  station,
  heading,
  title,
  setTitle,
  text,
  setText,
  notify,
}: {
  station: AudioStation
  heading: string
  title: string
  setTitle: (v: string) => void
  text: string
  setText: (v: string) => void
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void
}) {
  const audio = useAudioStore((s) => s.audios[station])
  const subscribe = useAudioStore((s) => s.subscribe)
  const uploadAudio = useAudioStore((s) => s.uploadAudio)
  const deleteAudio = useAudioStore((s) => s.deleteAudio)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const unsub = subscribe(station)
    return () => unsub()
  }, [subscribe, station])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = reader.result as string
        if (data.length > MAX_AUDIO_BYTES) {
          notify('Audiodatei zu groß (max. ~0,9 MB). Bitte eine kürzere/kleinere Aufnahme verwenden.', 'error')
          return
        }
        await uploadAudio(station, data)
        notify('Sprachnachricht gespeichert', 'success')
      } catch {
        notify('Upload fehlgeschlagen', 'error')
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      notify('Datei konnte nicht gelesen werden', 'error')
      setBusy(false)
    }
    reader.readAsDataURL(file)
  }

  const handleDelete = async () => {
    if (!window.confirm('Sprachnachricht wirklich löschen?')) return
    try {
      await deleteAudio(station)
      notify('Sprachnachricht gelöscht', 'success')
    } catch {
      notify('Löschen fehlgeschlagen', 'error')
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h2 className="font-semibold text-warm-800">{heading}</h2>
        <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          label="Text (unter dem Player)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />

        <div>
          <p className="mb-1.5 text-sm font-medium text-warm-700">Audiodatei</p>
          {audio === undefined ? (
            <p className="text-sm text-warm-400">lädt…</p>
          ) : audio ? (
            <div className="space-y-2">
              <audio controls src={audio} className="w-full" />
              <div className="flex gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="text-primary-600 underline hover:text-primary-700 cursor-pointer"
                  disabled={busy}
                >
                  Ersetzen
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-red-500 underline hover:text-red-600 cursor-pointer"
                >
                  Löschen
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50/50 px-4 py-6 text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Wird hochgeladen…' : '🔊 Audiodatei auswählen'}
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            onChange={handleFile}
            className="hidden"
          />
          <p className="mt-1.5 text-xs text-warm-400">
            Kurze Aufnahme (max. ~0,9 MB). Tipp: als MP3/M4A mit niedriger Bitrate.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
