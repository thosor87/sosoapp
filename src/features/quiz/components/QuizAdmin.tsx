import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { useToastStore } from '@/components/feedback/Toast'
import { useQuizStore } from '../store'
import type { QuizQuestion } from '../types'

const MAX_OPTIONS = 6
const MIN_OPTIONS = 2

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
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    initial.questions.map((q) => ({ ...q, options: [...q.options] }))
  )
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const participantUrl = `${window.location.origin}/quiz`

  useEffect(() => {
    QRCode.toDataURL(participantUrl, { width: 320, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [participantUrl])

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

  const copyLink = () => {
    navigator.clipboard
      .writeText(participantUrl)
      .then(() => notify('Link kopiert!', 'success'))
      .catch(() => notify('Kopieren fehlgeschlagen', 'error'))
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-warm-800">Quiz bearbeiten</h1>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Abmelden
        </Button>
      </div>

      {/* QR-Code & Link zum Teilen */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="font-semibold text-warm-800 mb-1">QR-Code für Gäste</h2>
          <p className="text-sm text-warm-500 mb-4">
            Diesen QR-Code ausdrucken oder anzeigen – die Gäste scannen ihn, um zum
            Quiz zu gelangen.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR-Code zum Quiz"
                className="h-40 w-40 rounded-xl border border-warm-100"
              />
            )}
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-warm-700 mb-1.5">
                Link zum Quiz
              </label>
              <div className="flex gap-2">
                <Input readOnly value={participantUrl} className="flex-1" />
                <Button variant="outline" onClick={copyLink}>
                  Kopieren
                </Button>
              </div>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download="quiz-qr-code.png"
                  className="mt-3 inline-block text-sm text-primary-600 underline hover:text-primary-700"
                >
                  QR-Code herunterladen
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Fragen */}
      <div className="space-y-4">
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

      {/* Speichern (sticky) */}
      <div className="sticky bottom-4 z-10">
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
