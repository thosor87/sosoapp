import { motion, AnimatePresence } from 'motion/react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils/cn'
import { create } from 'zustand'

interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastStore {
  toasts: ToastData[]
  addToast: (message: string, type?: ToastData['type']) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

function ToastItem({ toast }: { toast: ToastData }) {
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={cn(
        'pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg',
        {
          'bg-emerald-500 text-white': toast.type === 'success',
          'bg-red-500 text-white': toast.type === 'error',
          'bg-warm-800 text-white': toast.type === 'info',
        }
      )}
    >
      {toast.message}
    </motion.div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
