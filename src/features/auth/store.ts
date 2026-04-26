import { create } from 'zustand'
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { EventConfig } from '@/lib/firebase/types'
import { sha256hex } from '@/lib/utils/sha256'

interface AuthState {
  accessToken: string | null
  eventId: string | null
  eventConfig: EventConfig | null
  isAdmin: boolean
  isValidated: boolean
  isLoading: boolean
  validateToken: (token: string) => Promise<boolean>
  loginAdmin: (password: string) => Promise<boolean>
  logoutAdmin: () => void
  setLoading: (loading: boolean) => void
}

// Keep track of the event config listener so we can unsubscribe
let eventConfigUnsubscribe: (() => void) | null = null

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  eventId: null,
  eventConfig: null,
  isAdmin: false,
  isValidated: false,
  isLoading: true,

  validateToken: async (token: string) => {
    try {
      set({ isLoading: true })
      const eventsRef = collection(db, 'events')
      const q = query(eventsRef, where('accessToken', '==', token))
      const snapshot = await getDocs(q)

      if (snapshot.empty) {
        set({ isValidated: false, isLoading: false })
        return false
      }

      const eventDoc = snapshot.docs[0]
      const eventConfig = { id: eventDoc.id, ...eventDoc.data() } as EventConfig

      localStorage.setItem('soso-token', token)

      // Restore admin session from sessionStorage (survives page reload)
      const isAdmin = sessionStorage.getItem('soso-admin') === 'true'

      set({
        accessToken: token,
        eventId: eventDoc.id,
        eventConfig,
        isAdmin,
        isValidated: true,
        isLoading: false,
      })

      // Set up realtime listener for the event document
      // so admin changes (announcements, settings) update immediately
      if (eventConfigUnsubscribe) {
        eventConfigUnsubscribe()
      }

      eventConfigUnsubscribe = onSnapshot(
        doc(db, 'events', eventDoc.id),
        (docSnap) => {
          if (docSnap.exists()) {
            const updated = { id: docSnap.id, ...docSnap.data() } as EventConfig
            set({ eventConfig: updated })
          }
        },
        (error) => {
          console.error('Event config listener error:', error)
        }
      )

      return true
    } catch (error) {
      console.error('Token validation failed:', error)
      set({ isValidated: false, isLoading: false })
      return false
    }
  },

  loginAdmin: async (password: string) => {
    const { eventConfig } = get()
    if (!eventConfig) return false

    const hashed = await sha256hex(password)
    const stored = eventConfig.adminPasswordHash ?? ''
    // support both legacy plaintext and new SHA-256 hashes
    const match = stored.length === 64 ? hashed === stored : password === stored
    if (match) {
      sessionStorage.setItem('soso-admin', 'true')
      set({ isAdmin: true })
      return true
    }
    return false
  },

  logoutAdmin: () => {
    sessionStorage.removeItem('soso-admin')
    set({ isAdmin: false })
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),
}))
