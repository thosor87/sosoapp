import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useQuizStore } from '../store'
import type { QuizQuestion } from '../types'

type Phase = 'intro' | 'playing' | 'done'

/** Normalisiert einen Link – ergänzt bei Bedarf das Schema. */
function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function QuizGame({ team = 1 }: { team?: 1 | 2 }) {
  const config = useQuizStore((s) => s.config)
  const isLoading = useQuizStore((s) => s.isLoading)
  const subscribe = useQuizStore((s) => s.subscribe)

  const [phase, setPhase] = useState<Phase>('intro')
  const [current, setCurrent] = useState(0)
  const [wrongTries, setWrongTries] = useState<number[]>([])
  const [solved, setSolved] = useState(false)

  useEffect(() => {
    const unsub = subscribe()
    return () => unsub()
  }, [subscribe])

  const questions = useMemo(() => config?.questions ?? [], [config])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
      </div>
    )
  }

  if (!config || questions.length === 0) {
    return (
      <div className="text-center py-24 text-warm-500">
        Das Quiz wird gerade vorbereitet. Bitte gleich noch einmal versuchen.
      </div>
    )
  }

  const question: QuizQuestion | undefined = questions[current]

  const handleStart = () => {
    setPhase('playing')
    setCurrent(0)
    setWrongTries([])
    setSolved(false)
  }

  const handleAnswer = (index: number) => {
    if (!question || solved) return
    if (index === question.correctIndex) {
      setSolved(true)
    } else if (!wrongTries.includes(index)) {
      setWrongTries((prev) => [...prev, index])
    }
  }

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setPhase('done')
      return
    }
    setCurrent((c) => c + 1)
    setWrongTries([])
    setSolved(false)
  }

  const handleRestart = () => {
    setPhase('intro')
    setCurrent(0)
    setWrongTries([])
    setSolved(false)
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <AnimatePresence mode="wait">
        {/* ── Startbildschirm ─────────────────────────────── */}
        {phase === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">💍</div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-warm-800">
              {config.title}
            </h1>
            <p className="mt-4 whitespace-pre-line text-warm-600 leading-relaxed">
              {config.intro}
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-xl bg-primary-500 px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-primary-600 hover:shadow-lg active:bg-primary-700 cursor-pointer"
            >
              Quiz starten
            </button>
            <p className="mt-4 text-xs text-warm-400">
              {questions.length} Fragen
            </p>
          </motion.div>
        )}

        {/* ── Spiel ───────────────────────────────────────── */}
        {phase === 'playing' && question && (
          <motion.div
            key={`q-${current}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
          >
            {/* Fortschritt */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-warm-500 mb-2">
                <span>
                  Frage {current + 1} von {questions.length}
                </span>
                <span>
                  {Math.round((current / questions.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-warm-100">
                <motion.div
                  className="h-full rounded-full bg-primary-500"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((current + (solved ? 1 : 0)) / questions.length) * 100}%`,
                  }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-warm-800 mb-6">
              {question.text}
            </h2>

            <div className="space-y-3">
              {question.options.map((option, i) => {
                const isCorrect = solved && i === question.correctIndex
                const isWrong = wrongTries.includes(i)
                const base =
                  'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-4 text-left text-base font-medium transition-all'
                const state = isCorrect
                  ? 'border-secondary-500 bg-secondary-50 text-secondary-800'
                  : isWrong
                    ? 'border-red-300 bg-red-50 text-red-400 line-through'
                    : 'border-warm-200 bg-white text-warm-800 hover:border-primary-300 hover:bg-primary-50 cursor-pointer'
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={solved || isWrong}
                    onClick={() => handleAnswer(i)}
                    className={`${base} ${state} disabled:cursor-default`}
                  >
                    <span
                      className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${
                        isCorrect
                          ? 'bg-secondary-500 text-white'
                          : isWrong
                            ? 'bg-red-200 text-red-500'
                            : 'bg-warm-100 text-warm-600'
                      }`}
                    >
                      {isCorrect ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{option}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 min-h-[3.5rem]">
              <AnimatePresence>
                {solved && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-secondary-700 font-medium">
                      Richtig! 🎉
                    </span>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-500 px-6 text-sm font-semibold text-white shadow-md transition-all hover:bg-primary-600 active:bg-primary-700 cursor-pointer"
                    >
                      {current + 1 >= questions.length ? 'Lösungswort anzeigen' : 'Weiter'}
                    </button>
                  </motion.div>
                )}
                {!solved && wrongTries.length > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 text-sm"
                  >
                    Leider falsch – versuch es noch einmal.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── Lösungswort ─────────────────────────────────── */}
        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-warm-600">{config.solutionMessage}</p>
            <p className="mt-6 text-sm uppercase tracking-widest text-warm-400">
              Euer Lösungswort
            </p>
            <motion.p
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mt-2 font-display text-4xl md:text-6xl font-extrabold text-primary-600 break-words"
            >
              {config.solutionWord}
            </motion.p>

            {(() => {
              const rawLink = team === 2 ? config.mapsLinkTeam2 : config.mapsLinkTeam1
              const link = normalizeUrl(rawLink ?? '')
              if (!link) return null
              return (
                <motion.a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-10 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary-500 px-8 text-base font-semibold text-white shadow-md transition-all hover:bg-secondary-600 active:bg-secondary-700"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {config.mapsLinkLabel || 'Weiter zur nächsten Station'}
                </motion.a>
              )
            })()}

            <div>
              <button
                type="button"
                onClick={handleRestart}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl border-2 border-primary-300 px-6 text-sm font-semibold text-primary-700 transition-all hover:bg-primary-50 cursor-pointer"
              >
                Nochmal spielen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
