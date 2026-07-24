import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useQuizStore } from '../store'
import { useAudioStore, type AudioStation } from '../audioStore'

export function VoiceStation({ station }: { station: AudioStation }) {
  const config = useQuizStore((s) => s.config)
  const isLoading = useQuizStore((s) => s.isLoading)
  const subscribeQuiz = useQuizStore((s) => s.subscribe)
  const audio = useAudioStore((s) => s.audios[station])
  const subscribeAudio = useAudioStore((s) => s.subscribe)

  useEffect(() => {
    const unsub = subscribeQuiz()
    return () => unsub()
  }, [subscribeQuiz])

  useEffect(() => {
    const unsub = subscribeAudio(station)
    return () => unsub()
  }, [subscribeAudio, station])

  if (isLoading || audio === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
      </div>
    )
  }

  const title = station === 'see1' ? config?.see1Title : config?.see2Title
  const text = station === 'see1' ? config?.see1Text : config?.see2Text

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🔊</div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-warm-800">
          {title || 'Sprachnachricht'}
        </h1>

        {audio ? (
          <audio
            controls
            src={audio}
            className="mt-8 w-full"
            preload="auto"
          >
            Dein Browser kann die Audiodatei nicht abspielen.
          </audio>
        ) : (
          <p className="mt-8 rounded-xl bg-warm-100 px-4 py-6 text-warm-500">
            Für diese Station wurde noch keine Sprachnachricht hinterlegt.
          </p>
        )}

        {text && (
          <p className="mt-8 whitespace-pre-line text-warm-600 leading-relaxed">
            {text}
          </p>
        )}
      </motion.div>
    </div>
  )
}
