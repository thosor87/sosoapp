import { useEffect } from 'react'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useAuthStore } from '@/features/auth/store'
import { useRegistrationStore } from '@/features/registration/store'
import { StatCards } from '@/features/overview/components/StatCards'
import { RegistrationList } from '@/features/overview/components/RegistrationList'
import { FoodOverview } from '@/features/overview/components/FoodOverview'
import { CampingList } from '@/features/overview/components/CampingList'

export function OverviewPage() {
  const eventId = useAuthStore((s) => s.eventId)
  const subscribeToRegistrations = useRegistrationStore(
    (s) => s.subscribeToRegistrations
  )

  useEffect(() => {
    if (!eventId) return
    const unsubscribe = subscribeToRegistrations(eventId)
    return () => unsubscribe()
  }, [eventId, subscribeToRegistrations])

  return (
    <PageContainer>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-display font-bold text-warm-800 mb-6"
      >
        Übersicht
      </motion.h1>

      {/* Stat Cards */}
      <section className="mb-8">
        <StatCards />
      </section>

      {/* Registration List */}
      <section className="mb-8">
        <RegistrationList />
      </section>

      {/* Food & Camping */}
      <section className="mb-8 space-y-4">
        <FoodOverview />
        <CampingList />
      </section>
    </PageContainer>
  )
}
