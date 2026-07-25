import { useEffect } from 'react'
import { motion } from 'motion/react'
import { useQuizStore } from '../store'

export function BuchRiddle() {
  const config = useQuizStore((s) => s.config)
  const isLoading = useQuizStore((s) => s.isLoading)
  const subscribe = useQuizStore((s) => s.subscribe)

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

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-warm-800">
          {config?.buchTitle || 'Das Rätsel'}
        </h1>

        <p className="mt-8 whitespace-pre-line text-left text-lg text-warm-700 leading-relaxed">
          {config?.buchRiddle}
        </p>

        {config?.buchHint && (
          <p className="mx-auto mt-8 max-w-md rounded-xl bg-primary-50 px-4 py-4 text-primary-800">
            🔑 {config.buchHint}
          </p>
        )}
      </motion.div>
    </div>
  )
}
