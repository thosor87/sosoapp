import { motion } from 'motion/react'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#FFFBF5]">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="text-5xl"
        >
          {'\u2600\uFE0F'}
        </motion.span>
        <p className="text-warm-400 text-sm font-medium">Laden...</p>
      </motion.div>
    </div>
  )
}
