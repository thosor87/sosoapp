import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuthStore } from '@/features/auth/store'
import { useRegistrationStore } from '@/features/registration/store'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils/cn'
import { AnnouncementEditor } from './AnnouncementEditor'
import { RegistrationManager } from './RegistrationManager'
import { EventSettings } from './EventSettings'
import { TimelineEditor } from '@/features/timeline/components/TimelineEditor'
import { MapEditor } from '@/features/map/components/MapEditor'

type TabId = 'announcements' | 'registrations' | 'timeline' | 'map' | 'settings'

interface Tab {
  id: TabId
  label: string
  icon: string
}

const TABS: Tab[] = [
  { id: 'announcements', label: 'Ankündigungen', icon: '\uD83D\uDCE2' },
  { id: 'registrations', label: 'Anmeldungen', icon: '\uD83D\uDC65' },
  { id: 'timeline', label: 'Ablaufplan', icon: '\u23F0' },
  { id: 'map', label: 'Karte', icon: '\uD83D\uDDFA\uFE0F' },
  { id: 'settings', label: 'Einstellungen', icon: '\u2699\uFE0F' },
]

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('announcements')
  const eventId = useAuthStore((s) => s.eventId)
  const logoutAdmin = useAuthStore((s) => s.logoutAdmin)
  const subscribeToRegistrations = useRegistrationStore(
    (s) => s.subscribeToRegistrations
  )

  useEffect(() => {
    if (!eventId) return
    const unsubscribe = subscribeToRegistrations(eventId)
    return () => unsubscribe()
  }, [eventId, subscribeToRegistrations])

  const renderContent = () => {
    switch (activeTab) {
      case 'announcements':
        return <AnnouncementEditor />
      case 'registrations':
        return <RegistrationManager />
      case 'timeline':
        return <TimelineEditor />
      case 'map':
        return <MapEditor />
      case 'settings':
        return <EventSettings />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[60vh]">
      {/* Mobile: horizontal scrollable tab bar */}
      <div className="md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white shadow-md'
                  : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: left sidebar */}
      <div className="hidden md:block w-56 shrink-0">
        <div className="sticky top-24 space-y-1">
          <div className="mb-4">
            <h2 className="text-xs font-semibold text-warm-400 uppercase tracking-wider px-3 mb-2">
              Administration
            </h2>
          </div>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer text-left',
                activeTab === tab.id
                  ? 'text-primary-700'
                  : 'text-warm-500 hover:text-warm-700 hover:bg-warm-100'
              )}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="admin-tab-bg"
                  className="absolute inset-0 bg-primary-50 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative">{tab.icon}</span>
              <span className="relative">{tab.label}</span>
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-warm-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={logoutAdmin}
              className="w-full justify-start text-warm-400 hover:text-red-600"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Abmelden
            </Button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderContent()}
        </motion.div>

        {/* Mobile logout button */}
        <div className="md:hidden mt-8 pt-4 border-t border-warm-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={logoutAdmin}
            className="text-warm-400 hover:text-red-600"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Abmelden
          </Button>
        </div>
      </div>
    </div>
  )
}
