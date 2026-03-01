import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'
import { Card } from '@/components/ui/Card'
import { useRegistrationStore } from '@/features/registration/store'

function AnimatedCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let start = 0
    const end = value
    if (end === 0) {
      setDisplay(0)
      return
    }

    const startTime = performance.now()
    const durationMs = duration * 1000

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / durationMs, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplay(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, isInView, duration])

  return <span ref={ref}>{display}</span>
}

interface StatCardData {
  label: string
  value: number
  icon: string
  color: string
  bgColor: string
  subtitle?: string
}

export function StatCards() {
  const registrations = useRegistrationStore((s) => s.registrations)

  const totalAdults = registrations.reduce((sum, r) => sum + r.adultsCount, 0)
  const totalChildren = registrations.reduce(
    (sum, r) => sum + r.childrenCount,
    0
  )
  const totalGuests = totalAdults + totalChildren
  const campers = registrations.filter((r) => r.camping.wantsCamping)
  const totalCampingPersons = campers.reduce(
    (sum, r) => sum + (r.camping.personCount || r.adultsCount + r.childrenCount),
    0
  )
  const totalTents = campers.reduce((sum, r) => sum + r.camping.tentCount, 0)

  const stats: StatCardData[] = [
    {
      label: 'Gesamt',
      value: totalGuests,
      icon: '\uD83D\uDC65',
      color: 'text-primary-600',
      bgColor: 'bg-primary-50',
    },
    {
      label: 'Erwachsene',
      value: totalAdults,
      icon: '\uD83E\uDDD1',
      color: 'text-secondary-600',
      bgColor: 'bg-secondary-50',
    },
    {
      label: 'Kinder',
      value: totalChildren,
      icon: '\uD83D\uDC76',
      color: 'text-accent-600',
      bgColor: 'bg-amber-50',
    },
    {
      label: 'Zelter',
      value: totalCampingPersons,
      icon: '\u26FA',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      subtitle: `${totalTents} ${totalTents === 1 ? 'Zelt' : 'Zelte'}`,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card
            hover
            className="p-4 md:p-5 text-center group cursor-default"
          >
            <div
              className={`inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl ${stat.bgColor} mb-3 transition-transform duration-300 group-hover:scale-110`}
            >
              <span className="text-xl md:text-2xl">{stat.icon}</span>
            </div>
            <div
              className={`text-2xl md:text-3xl font-bold ${stat.color} mb-1 tabular-nums`}
            >
              <AnimatedCounter value={stat.value} />
            </div>
            <div className="text-xs md:text-sm font-medium text-warm-500">
              {stat.label}
            </div>
            {stat.subtitle && (
              <div className="text-[10px] md:text-xs text-warm-400 mt-0.5">
                {stat.subtitle}
              </div>
            )}
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
