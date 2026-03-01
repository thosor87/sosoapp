import { useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { cn } from '@/lib/utils/cn'
import type { TimelineCategory, TimelineItem } from '@/lib/firebase/types'

const CATEGORY_ICON_MAP: Record<TimelineCategory, string> = {
  general: '\uD83D\uDCCB',
  food: '\uD83C\uDF7D\uFE0F',
  music: '\uD83C\uDFB5',
  games: '\uD83C\uDFAE',
  ceremony: '\uD83E\uDD42',
  other: '\u2728',
}

const CATEGORY_COLOR_MAP: Record<TimelineCategory, { bg: string; text: string; dot: string }> = {
  general: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  food: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-400' },
  music: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-400' },
  games: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400' },
  ceremony: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  other: { bg: 'bg-pink-50', text: 'text-pink-700', dot: 'bg-pink-400' },
}

function TimelineNode({
  item,
  index,
  isLast,
}: {
  item: TimelineItem
  index: number
  isLast: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const isEven = index % 2 === 0
  const colors = CATEGORY_COLOR_MAP[item.category]

  return (
    <div ref={ref} className="relative flex items-start">
      {/* Desktop layout: alternating sides */}
      {/* Left content (desktop only) */}
      <div className="hidden md:flex flex-1 justify-end pr-8">
        {isEven && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-sm text-right"
          >
            <TimelineCard item={item} colors={colors} align="right" />
          </motion.div>
        )}
      </div>

      {/* Center line + dot (desktop) */}
      <div className="hidden md:flex flex-col items-center shrink-0">
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : {}}
          transition={{ type: 'spring', duration: 0.5, delay: 0.05 }}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center z-10 ring-4 ring-white shadow-md',
            colors.dot
          )}
        >
          <span className="text-sm">{CATEGORY_ICON_MAP[item.category]}</span>
        </motion.div>
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-0.5 flex-1 bg-warm-200 origin-top min-h-[40px]"
          />
        )}
      </div>

      {/* Right content (desktop only) */}
      <div className="hidden md:flex flex-1 pl-8">
        {!isEven && (
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-sm"
          >
            <TimelineCard item={item} colors={colors} align="left" />
          </motion.div>
        )}
      </div>

      {/* Mobile layout: left line + right content */}
      <div className="flex md:hidden items-start gap-4 w-full">
        {/* Left line + dot */}
        <div className="flex flex-col items-center shrink-0">
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ type: 'spring', duration: 0.5, delay: 0.05 }}
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center z-10 ring-4 ring-[#FFFBF5] shadow-md',
              colors.dot
            )}
          >
            <span className="text-xs">{CATEGORY_ICON_MAP[item.category]}</span>
          </motion.div>
          {!isLast && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="w-0.5 flex-1 bg-warm-200 origin-top min-h-[24px]"
            />
          )}
        </div>

        {/* Right content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 pb-6"
        >
          <TimelineCard item={item} colors={colors} align="left" />
        </motion.div>
      </div>
    </div>
  )
}

function TimelineCard({
  item,
  colors,
  align,
}: {
  item: TimelineItem
  colors: { bg: string; text: string; dot: string }
  align: 'left' | 'right'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-warm-100 bg-white p-4 shadow-sm mb-4 md:mb-0',
        align === 'right' ? 'md:text-right' : ''
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 mb-2',
          align === 'right' ? 'md:flex-row-reverse' : ''
        )}
      >
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold',
            colors.bg,
            colors.text
          )}
        >
          {item.time}
        </span>
      </div>
      <h4 className="font-semibold text-warm-800 mb-1">{item.title}</h4>
      {item.description && (
        <p className="text-sm text-warm-500">{item.description}</p>
      )}
    </div>
  )
}

interface TimelineDisplayProps {
  items: TimelineItem[]
}

export function TimelineDisplay({ items }: TimelineDisplayProps) {
  const visibleItems = items.filter((item) => item.isVisible)

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center text-warm-400">
        Der Ablaufplan wird noch erstellt.
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Desktop center line (behind everything) */}
      <div className="hidden md:block absolute left-1/2 top-5 bottom-5 w-0.5 bg-warm-200 -translate-x-1/2" />

      <div className="space-y-0">
        {visibleItems.map((item, index) => (
          <TimelineNode
            key={item.id}
            item={item}
            index={index}
            isLast={index === visibleItems.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
