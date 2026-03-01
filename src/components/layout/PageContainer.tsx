import { motion } from 'motion/react'
import { cn } from '@/lib/utils/cn'
import type { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-10', className)}
    >
      {children}
    </motion.main>
  )
}
