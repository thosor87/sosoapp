import { useEffect, useState } from 'react'
// useSearchParams not needed - edit param read via window.location.search
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/features/auth/store'
import { useToastStore } from '@/components/feedback/Toast'
import { useRegistrationStore } from '@/features/registration/store'
import { useTimelineStore } from '@/features/timeline/store'
import { useMapStore } from '@/features/map/store'
import { RegistrationForm } from '@/features/registration/components/RegistrationForm'
import { TimelineDisplay } from '@/features/timeline/components/TimelineDisplay'
import { MapDisplay } from '@/features/map/components/MapDisplay'
import type { Registration } from '@/lib/firebase/types'

export function LandingPage() {
  const eventConfig = useAuthStore((s) => s.eventConfig)
  const eventId = useAuthStore((s) => s.eventId)
  const accessToken = useAuthStore((s) => s.accessToken)
  const addToast = useToastStore((s) => s.addToast)
  const [linkCopied, setLinkCopied] = useState(false)
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null)
  const registrations = useRegistrationStore((s) => s.registrations)
  const isRegLoading = useRegistrationStore((s) => s.isLoading)

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?token=${accessToken}`
    navigator.clipboard.writeText(url).then(() => {
      addToast('Einladungslink kopiert!', 'success')
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }).catch(() => {
      addToast('Kopieren fehlgeschlagen', 'error')
    })
  }
  const subscribeToRegistrations = useRegistrationStore(
    (s) => s.subscribeToRegistrations
  )
  const timelineItems = useTimelineStore((s) => s.items)
  const subscribeToTimeline = useTimelineStore((s) => s.subscribeToTimeline)
  const mapData = useMapStore((s) => s.mapData)
  const subscribeToMap = useMapStore((s) => s.subscribeToMap)

  useEffect(() => {
    if (!eventId) return
    const unsubscribe = subscribeToRegistrations(eventId)
    return () => unsubscribe()
  }, [eventId, subscribeToRegistrations])

  useEffect(() => {
    if (!eventId) return
    const unsubscribe = subscribeToTimeline(eventId)
    return () => unsubscribe()
  }, [eventId, subscribeToTimeline])

  useEffect(() => {
    if (!eventId) return
    const unsubscribe = subscribeToMap(eventId)
    return () => unsubscribe()
  }, [eventId, subscribeToMap])

  // Handle ?edit=REGISTRATION_ID from confirmation email
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const editRegId = params.get('edit')
    if (!editRegId || isRegLoading || registrations.length === 0) return
    const reg = registrations.find((r) => r.id === editRegId)
    if (reg) {
      setEditingRegistration(reg)
      params.delete('edit')
      const newSearch = params.toString()
      window.history.replaceState({}, '', newSearch ? `?${newSearch}` : window.location.pathname)
    }
  }, [registrations, isRegLoading])

  return (
    <PageContainer>
      {/* Hero Section — full bleed across viewport width */}
      <section
        className="relative text-center py-12 md:py-20 px-4 md:px-6 overflow-hidden bg-cover bg-center w-screen left-1/2 -translate-x-1/2"
        style={{ backgroundImage: "url('/hero-bg.webp')" }}
      >
        {/* Overlay to keep text readable over the photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-warm-50/70 via-warm-50/80 to-warm-50/95 pointer-events-none" />
        <div className="relative">
        <motion.span
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8 }}
          className="text-7xl md:text-8xl block mb-6"
        >
          {'\u2600\uFE0F'}
        </motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="font-display text-4xl md:text-6xl font-bold text-warm-800 mb-4"
        >
          {eventConfig?.title || 'Sorings Sommerfest'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-warm-500 max-w-lg mx-auto"
        >
          {eventConfig?.location || 'Ort wird noch bekannt gegeben'}
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium"
        >
          <span>{'\uD83D\uDCC5'}</span>
          <span>
            {eventConfig?.date
              ? eventConfig.date.toDate().toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Datum folgt'}
          </span>
        </motion.div>

        {/* Copy invite link button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4"
        >
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs text-warm-400 hover:text-primary-600 transition-colors cursor-pointer"
            title="Einladungslink kopieren"
          >
            {linkCopied ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
            <span>{linkCopied ? 'Kopiert!' : 'Einladungslink teilen'}</span>
          </button>
        </motion.div>
        </div>
      </section>

      {/* Announcements */}
      <section className="mt-12 md:mt-16 mb-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {eventConfig?.announcements
            ?.filter((a) => a.isVisible)
            .sort((a, b) => a.order - b.order)
            .map((announcement, index) => {
              const isHero = announcement.size === 'hero'
              const colorClass =
                announcement.type === 'highlight'
                  ? 'bg-primary-50 border-primary-200'
                  : announcement.type === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-warm-100'
              return (
                <motion.div
                  key={announcement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={`rounded-2xl border ${colorClass} ${
                    isHero
                      ? 'col-span-full p-6 md:p-8'
                      : 'p-5'
                  }`}
                >
                  <h3
                    className={
                      isHero
                        ? 'font-display text-xl md:text-2xl font-bold text-warm-800 mb-2'
                        : 'font-semibold text-warm-800 mb-1'
                    }
                  >
                    {announcement.title}
                  </h3>
                  <p
                    className={
                      isHero
                        ? 'text-base md:text-lg text-warm-600 whitespace-pre-line leading-relaxed'
                        : 'text-sm text-warm-500'
                    }
                  >
                    {announcement.content}
                  </p>
                </motion.div>
              )
            }) || (
            <p className="text-warm-400 col-span-full text-center py-8">
              Noch keine Neuigkeiten vorhanden.
            </p>
          )}
        </div>
      </section>

      {/* Registration Form */}
      <section className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-2xl font-display font-bold text-warm-800 mb-2">
            Anmeldung
          </h2>
          <p className="text-warm-500 mb-6">
            Melde dich und deine Familie an!
          </p>
          <RegistrationForm />
        </motion.div>
      </section>

      {/* Timeline / Ablaufplan */}
      <section className="mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-display font-bold text-warm-800 mb-2">
            Ablaufplan
          </h2>
          <p className="text-warm-500 mb-6">
            So läuft der Tag ab
          </p>
          {eventConfig?.timelineNotesTopPublic && (
            <p className="text-sm text-warm-600 bg-warm-50 rounded-xl p-4 mb-6 whitespace-pre-line">
              {eventConfig.timelineNotesTopPublic}
            </p>
          )}
          <TimelineDisplay items={timelineItems} />
          {eventConfig?.timelineNotesBottomPublic && (
            <p className="text-sm text-warm-600 bg-warm-50 rounded-xl p-4 mt-6 whitespace-pre-line">
              {eventConfig.timelineNotesBottomPublic}
            </p>
          )}
        </motion.div>
      </section>

      {/* Map / Geländeplan */}
      {mapData && mapData.isPublished && (
        <section className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <h2 className="text-2xl font-display font-bold text-warm-800 mb-2">
              Geländeplan
            </h2>
            <p className="text-warm-500 mb-6">
              So findest du dich zurecht
            </p>
            <MapDisplay mapData={mapData} />
          </motion.div>
        </section>
      )}

      {/* Edit Registration Modal (opened via ?edit=ID from confirmation email) */}
      <Modal
        isOpen={!!editingRegistration}
        onClose={() => setEditingRegistration(null)}
        title="Anmeldung bearbeiten"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {editingRegistration && (
          <RegistrationForm
            editRegistration={editingRegistration}
            onClose={() => setEditingRegistration(null)}
          />
        )}
      </Modal>
    </PageContainer>
  )
}
