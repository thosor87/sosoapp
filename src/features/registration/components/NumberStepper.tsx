import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils/cn'

interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  error?: string
  className?: string
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
  error,
  className,
}: NumberStepperProps) {
  const decrement = () => {
    if (value > min) onChange(value - 1)
  }

  const increment = () => {
    if (value < max) onChange(value + 1)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-warm-700">
          {label}
        </label>
      )}
      <div className="inline-flex items-center gap-3 rounded-xl border border-warm-200 bg-white px-2 py-1.5">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-warm-100 text-warm-600 transition-all duration-200 hover:bg-primary-100 hover:text-primary-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>

        <div className="relative w-10 text-center overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="block text-xl font-bold text-warm-800 tabular-nums"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={increment}
          disabled={value >= max}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-warm-100 text-warm-600 transition-all duration-200 hover:bg-primary-100 hover:text-primary-700 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="8" y1="4" x2="8" y2="12" />
            <line x1="4" y1="8" x2="12" y2="8" />
          </svg>
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
