import { create } from 'zustand'
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { sha256hex } from '@/lib/utils/sha256'
import type { QuizConfig } from './types'
import {
  QUIZ_DOC_ID,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_TITLE,
  DEFAULT_INTRO,
  DEFAULT_SOLUTION_WORD,
  DEFAULT_SOLUTION_MESSAGE,
  DEFAULT_MAPS_LABEL,
  DEFAULT_QUESTIONS,
} from './defaults'

const ADMIN_SESSION_KEY = 'jawort-admin'

interface QuizState {
  config: QuizConfig | null
  isLoading: boolean
  isAdmin: boolean
  /** Startet den Realtime-Listener; legt bei Bedarf das Standarddokument an. */
  subscribe: () => () => void
  loginAdmin: (password: string) => Promise<boolean>
  logoutAdmin: () => void
  /** Speichert Teiländerungen der Konfiguration. */
  save: (patch: Partial<Omit<QuizConfig, 'updatedAt'>>) => Promise<void>
  /** Setzt ein neues Admin-Passwort (wird als SHA-256-Hash gespeichert). */
  changePassword: (newPassword: string) => Promise<void>
}

function quizDocRef() {
  return doc(db, 'quiz', QUIZ_DOC_ID)
}

let seeding = false

async function seedDefault() {
  if (seeding) return
  seeding = true
  try {
    const adminPasswordHash = await sha256hex(DEFAULT_ADMIN_PASSWORD)
    await setDoc(
      quizDocRef(),
      {
        title: DEFAULT_TITLE,
        intro: DEFAULT_INTRO,
        solutionWord: DEFAULT_SOLUTION_WORD,
        solutionMessage: DEFAULT_SOLUTION_MESSAGE,
        mapsLinkLabel: DEFAULT_MAPS_LABEL,
        mapsLinkTeam1: '',
        mapsLinkTeam2: '',
        adminPasswordHash,
        questions: DEFAULT_QUESTIONS,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  } catch (err) {
    console.error('Quiz seed failed:', err)
  } finally {
    seeding = false
  }
}

export const useQuizStore = create<QuizState>((set, get) => ({
  config: null,
  isLoading: true,
  isAdmin: sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true',

  subscribe: () => {
    const unsub = onSnapshot(
      quizDocRef(),
      (snap) => {
        if (!snap.exists()) {
          // Dokument existiert noch nicht → Standardwerte anlegen.
          void seedDefault()
          set({ isLoading: false })
          return
        }
        set({ config: snap.data() as QuizConfig, isLoading: false })
      },
      (err) => {
        console.error('Quiz listener error:', err)
        set({ isLoading: false })
      }
    )
    return unsub
  },

  loginAdmin: async (password: string) => {
    const { config } = get()
    if (!config) return false
    const hashed = await sha256hex(password)
    const stored = config.adminPasswordHash ?? ''
    // Sowohl SHA-256-Hash als auch (Alt-)Klartext unterstützen.
    const match = stored.length === 64 ? hashed === stored : password === stored
    if (match) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true')
      set({ isAdmin: true })
      return true
    }
    return false
  },

  logoutAdmin: () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    set({ isAdmin: false })
  },

  save: async (patch) => {
    await updateDoc(quizDocRef(), { ...patch, updatedAt: serverTimestamp() })
  },

  changePassword: async (newPassword: string) => {
    const adminPasswordHash = await sha256hex(newPassword)
    await updateDoc(quizDocRef(), {
      adminPasswordHash,
      updatedAt: serverTimestamp(),
    })
  },
}))
