import { create } from 'zustand'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { Registration } from '@/lib/firebase/types'

interface RegistrationState {
  registrations: Registration[]
  isLoading: boolean
  subscribeToRegistrations: (eventId: string) => () => void
  createRegistration: (
    data: Omit<Registration, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>
  updateRegistration: (
    id: string,
    data: Partial<Registration>
  ) => Promise<void>
  getRegistration: (id: string) => Registration | undefined
}

export const useRegistrationStore = create<RegistrationState>((set, get) => ({
  registrations: [],
  isLoading: true,

  subscribeToRegistrations: (eventId: string) => {
    set({ isLoading: true })
    const registrationsRef = collection(db, 'registrations')
    const q = query(
      registrationsRef,
      where('eventId', '==', eventId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const registrations = snapshot.docs
          .map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Registration[]
        // Sort client-side (avoids need for composite index)
        registrations.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? 0
          const bTime = b.createdAt?.seconds ?? 0
          return bTime - aTime
        })
        set({ registrations, isLoading: false })
      },
      (error) => {
        console.error('Registration subscription error:', error)
        set({ isLoading: false })
      }
    )

    return unsubscribe
  },

  createRegistration: async (data) => {
    const docRef = await addDoc(collection(db, 'registrations'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return docRef.id
  },

  updateRegistration: async (id, data) => {
    const docRef = doc(db, 'registrations', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })
  },

  getRegistration: (id: string) => {
    return get().registrations.find((r) => r.id === id)
  },
}))
