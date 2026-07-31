import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

/* ── Die Maulwurf Company – digitale Nummernkarten ─────────────────
   Ersatz für die fehlenden physischen Zahlenscheiben des Ravensburger-
   Spiels. Jeder Spieler besitzt einen Satz Scheiben mit den Werten
   1, 2, 2, 3, 3, 4 in seiner Farbe. Die Scheiben werden verdeckt
   gemischt und einzeln aufgedeckt; sind alle sechs aufgedeckt, wird
   der Satz neu gemischt. */

/** Werte einer Zahlenscheiben-Runde je Spielerfarbe. */
const DISC_VALUES = [1, 2, 2, 3, 3, 4] as const
const ROUND_SIZE = DISC_VALUES.length

interface PlayerColor {
  name: string
  /** Tailwind-Klassen für die Karte in Spielerfarbe. */
  header: string
  ring: string
  chip: string
  chipText: string
  dot: string
}

const COLORS: PlayerColor[] = [
  {
    name: 'Rot',
    header: 'bg-red-500',
    ring: 'ring-red-300',
    chip: 'bg-red-50 border-red-300',
    chipText: 'text-red-600',
    dot: 'bg-red-500',
  },
  {
    name: 'Blau',
    header: 'bg-blue-500',
    ring: 'ring-blue-300',
    chip: 'bg-blue-50 border-blue-300',
    chipText: 'text-blue-600',
    dot: 'bg-blue-500',
  },
  {
    name: 'Grün',
    header: 'bg-green-600',
    ring: 'ring-green-300',
    chip: 'bg-green-50 border-green-300',
    chipText: 'text-green-700',
    dot: 'bg-green-600',
  },
  {
    name: 'Gelb',
    header: 'bg-amber-400',
    ring: 'ring-amber-300',
    chip: 'bg-amber-50 border-amber-300',
    chipText: 'text-amber-600',
    dot: 'bg-amber-400',
  },
]

/** Anzahl Maulwürfe je Spieler nach Spielerzahl (Spielregel). */
const MOLES_PER_PLAYER: Record<number, number> = { 2: 10, 3: 7, 4: 6 }

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface PlayerState {
  /** Aktuell gemischter Satz Zahlenscheiben. */
  deck: number[]
  /** Wie viele Scheiben dieser Runde bereits aufgedeckt wurden (0…6). */
  drawn: number
  /** Ob gerade neu gemischt wurde (für kurzen Hinweis). */
  reshuffled: boolean
}

function freshPlayer(): PlayerState {
  return { deck: shuffle(DISC_VALUES), drawn: 0, reshuffled: false }
}

interface PlayerCardProps {
  color: PlayerColor
  state: PlayerState
  onDraw: () => void
}

function PlayerCard({ color, state, onDraw }: PlayerCardProps) {
  const current = state.drawn > 0 ? state.deck[state.drawn - 1] : null
  const remaining = ROUND_SIZE - state.drawn

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white shadow-md ring-1 ${color.ring}`}
    >
      <div
        className={`${color.header} flex items-center justify-between px-4 py-2.5 text-white`}
      >
        <span className="font-display text-lg font-bold">{color.name}</span>
        <span className="text-xs font-medium opacity-90">
          {remaining} verdeckt
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 px-4 py-6">
        {/* Zahlenscheibe */}
        <div className="relative flex h-28 w-28 items-center justify-center">
          <AnimatePresence mode="wait">
            {current === null ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-dashed border-warm-200 text-4xl text-warm-300"
              >
                ?
              </motion.div>
            ) : (
              <motion.div
                key={`${state.drawn}-${current}`}
                initial={{ rotateY: 90, opacity: 0, scale: 0.85 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={{ rotateY: -90, opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.28 }}
                className={`flex h-28 w-28 items-center justify-center rounded-full border-4 ${color.chip} font-display text-6xl font-extrabold ${color.chipText} shadow-inner`}
              >
                {current}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Verbleibende Scheiben als Punkte */}
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: ROUND_SIZE }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i < remaining ? color.dot : 'bg-warm-200'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onDraw}
          className={`w-full rounded-xl ${color.header} px-4 py-3 font-semibold text-white shadow-sm transition-transform active:scale-95`}
        >
          {remaining === 0 ? 'Neu mischen & aufdecken' : 'Scheibe aufdecken'}
        </button>

        <AnimatePresence>
          {state.reshuffled && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs text-warm-400"
            >
              🔀 Satz neu gemischt
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function NumberCards() {
  const [playerCount, setPlayerCount] = useState(2)
  const [players, setPlayers] = useState<PlayerState[]>(() => [
    freshPlayer(),
    freshPlayer(),
  ])

  useEffect(() => {
    const previous = document.title
    document.title = 'Maulwurf Company – Nummernkarten'
    return () => {
      document.title = previous
    }
  }, [])

  function setCount(count: number) {
    setPlayerCount(count)
    setPlayers(Array.from({ length: count }, freshPlayer))
  }

  function drawFor(index: number) {
    setPlayers((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p
        if (p.drawn >= ROUND_SIZE) {
          // Runde vorbei: neu mischen und erste Scheibe aufdecken
          const deck = shuffle(DISC_VALUES)
          return { deck, drawn: 1, reshuffled: true }
        }
        return { ...p, drawn: p.drawn + 1, reshuffled: false }
      })
    )
  }

  function resetAll() {
    setPlayers(Array.from({ length: playerCount }, freshPlayer))
  }

  const molesHint = useMemo(() => MOLES_PER_PLAYER[playerCount], [playerCount])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="text-center">
        <div className="mb-2 text-5xl">🐭</div>
        <h1 className="font-display text-3xl font-extrabold text-warm-800 md:text-4xl">
          Die Maulwurf Company
        </h1>
        <p className="mt-2 text-warm-500">
          Digitale Zahlenscheiben – tippe zum Aufdecken. Jede Farbe hat die
          Werte <span className="font-semibold">1&nbsp;·&nbsp;2&nbsp;·&nbsp;2&nbsp;·&nbsp;3&nbsp;·&nbsp;3&nbsp;·&nbsp;4</span>,
          verdeckt gemischt.
        </p>
      </div>

      {/* Spieleranzahl */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-warm-400">
          Spieler
        </span>
        <div className="inline-flex rounded-xl bg-warm-100 p-1">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`min-w-[3rem] rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                playerCount === n
                  ? 'bg-white text-warm-800 shadow-sm'
                  : 'text-warm-500 hover:text-warm-700'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {molesHint && (
          <p className="text-xs text-warm-400">
            {molesHint} Maulwürfe je Spieler
          </p>
        )}
      </div>

      {/* Spielerkarten */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {players.map((state, i) => (
          <PlayerCard
            key={i}
            color={COLORS[i]}
            state={state}
            onDraw={() => drawFor(i)}
          />
        ))}
      </div>

      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={resetAll}
          className="rounded-xl border border-warm-200 bg-white px-5 py-2 text-sm font-medium text-warm-600 shadow-sm transition-colors hover:bg-warm-50"
        >
          Alle Sätze neu mischen
        </button>
      </div>
    </div>
  )
}
