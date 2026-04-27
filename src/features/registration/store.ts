import { create } from 'zustand'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useToastStore } from '@/components/feedback/Toast'
import type { Registration } from '@/lib/firebase/types'
import { writeAuditLog, buildRegistrationSummary } from '@/lib/firebase/auditLog'
import { setPrivateEmail, deletePrivateContact } from '@/lib/firebase/privateData'
import { useAuthStore } from '@/features/auth/store'

export const FOOD_LIMIT_DEFAULT = 15

function getFoodLimit(): number {
  return useAuthStore.getState().eventConfig?.foodLimit ?? FOOD_LIMIT_DEFAULT
}

interface RegistrationState {
  registrations: Registration[]
  isLoading: boolean
  subscribeToRegistrations: (eventId: string) => () => void
  createRegistration: (
    data: Omit<Registration, 'id' | 'createdAt' | 'updatedAt'>,
    email: string,
    performedBy?: 'user' | 'admin'
  ) => Promise<string>
  updateRegistration: (
    id: string,
    data: Partial<Registration>,
    email: string,
    performedBy?: 'user' | 'admin'
  ) => Promise<void>
  deleteRegistration: (
    id: string,
    performedBy?: 'user' | 'admin'
  ) => Promise<void>
  getRegistration: (id: string) => Registration | undefined
}

export const useRegistrationStore = create<RegistrationState>((set, get) => ({
  registrations: [],
  isLoading: true,

  subscribeToRegistrations: (eventId: string) => {
    set({ isLoading: true })
    const registrationsRef = collection(db, 'registrations')
    const q = query(registrationsRef, where('eventId', '==', eventId))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const registrations = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Registration[]
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

  createRegistration: async (data, email, performedBy = 'user') => {
    const current = get().registrations
    const limit = getFoodLimit()
    const cakeCount = current.filter((r) => r.food.bringsCake).length
    const saladCount = current.filter((r) => r.food.bringsSalad).length

    if (data.food.bringsCake && cakeCount >= limit) {
      throw new Error(`Das Kuchen-Kontingent ist leider voll (${limit}/${limit}).`)
    }
    if (data.food.bringsSalad && saladCount >= limit) {
      throw new Error(`Das Salat-Kontingent ist leider voll (${limit}/${limit}).`)
    }

    const docRef = await addDoc(collection(db, 'registrations'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Store email in private subcollection to keep it out of the public document
    if (email) {
      setPrivateEmail(docRef.id, email).catch((err) =>
        console.error('Failed to write private email:', err)
      )
    }

    writeAuditLog({
      eventId: data.eventId,
      action: 'create',
      entityId: docRef.id,
      familyName: data.familyName,
      summary: buildRegistrationSummary(data),
      performedBy,
    })

    return docRef.id
  },

  updateRegistration: async (id, data, email, performedBy = 'user') => {
    const existing = get().registrations.find((r) => r.id === id)
    const current = get().registrations

    const limit = getFoodLimit()
    if (data.food?.bringsCake && !existing?.food.bringsCake) {
      const cakeCount = current.filter((r) => r.food.bringsCake && r.id !== id).length
      if (cakeCount >= limit) {
        throw new Error(`Das Kuchen-Kontingent ist leider voll (${limit}/${limit}).`)
      }
    }
    if (data.food?.bringsSalad && !existing?.food.bringsSalad) {
      const saladCount = current.filter((r) => r.food.bringsSalad && r.id !== id).length
      if (saladCount >= limit) {
        throw new Error(`Das Salat-Kontingent ist leider voll (${limit}/${limit}).`)
      }
    }

    const docRef = doc(db, 'registrations', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    if (email) {
      setPrivateEmail(id, email).catch((err) =>
        console.error('Failed to update private email:', err)
      )
    }

    const merged = { ...existing, ...data } as Registration
    writeAuditLog({
      eventId: merged.eventId,
      action: 'update',
      entityId: id,
      familyName: merged.familyName,
      summary: buildRegistrationSummary(merged),
      performedBy,
    })
  },

  deleteRegistration: async (id, performedBy = 'user') => {
    const existing = get().registrations.find((r) => r.id === id)
    try {
      await deleteDoc(doc(db, 'registrations', id))
      deletePrivateContact(id)
      if (existing) {
        writeAuditLog({
          eventId: existing.eventId,
          action: 'delete',
          entityId: id,
          familyName: existing.familyName,
          summary: buildRegistrationSummary(existing),
          performedBy,
        })
      }
      useToastStore.getState().addToast('Anmeldung zurückgezogen', 'success')
    } catch (error) {
      console.error('Error deleting registration:', error)
      useToastStore.getState().addToast('Fehler beim Löschen der Anmeldung', 'error')
    }
  },

  getRegistration: (id: string) => {
    return get().registrations.find((r) => r.id === id)
  },
}))
