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
  deleteField,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useToastStore } from '@/components/feedback/Toast'
import type { Registration } from '@/lib/firebase/types'
import { writeAuditLog, buildRegistrationSummary, buildUpdateSummary, buildReplySummary } from '@/lib/firebase/auditLog'
import { setPrivateEmailHash } from '@/lib/firebase/privateData'
import { useAuthStore } from '@/features/auth/store'

export const FOOD_LIMIT_DEFAULT = 15

function getCakeLimit(): number {
  return useAuthStore.getState().eventConfig?.cakeLimit ?? FOOD_LIMIT_DEFAULT
}
function getSaladLimit(): number {
  return useAuthStore.getState().eventConfig?.saladLimit ?? FOOD_LIMIT_DEFAULT
}

interface RegistrationState {
  registrations: Registration[]
  deletedRegistrations: Registration[]
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
  restoreRegistration: (
    id: string,
    performedBy?: 'user' | 'admin'
  ) => Promise<void>
  setReply: (
    id: string,
    field: 'campingNotesReply' | 'commentsReply',
    text: string
  ) => Promise<void>
  deleteReply: (
    id: string,
    field: 'campingNotesReply' | 'commentsReply'
  ) => Promise<void>
  getRegistration: (id: string) => Registration | undefined
}

export const useRegistrationStore = create<RegistrationState>((set, get) => ({
  registrations: [],
  deletedRegistrations: [],
  isLoading: true,

  subscribeToRegistrations: (eventId: string) => {
    set({ isLoading: true })
    const registrationsRef = collection(db, 'registrations')
    const q = query(registrationsRef, where('eventId', '==', eventId))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Registration[]
        const byNewest = (a: Registration, b: Registration) =>
          (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)
        set({
          registrations: all.filter((r) => !r.isDeleted).sort(byNewest),
          deletedRegistrations: all.filter((r) => r.isDeleted).sort((a, b) =>
            (b.deletedAt?.seconds ?? 0) - (a.deletedAt?.seconds ?? 0)
          ),
          isLoading: false,
        })
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
    const cakeLimit = getCakeLimit()
    const saladLimit = getSaladLimit()
    const cakeCount = current.filter((r) => r.food.bringsCake).length
    const saladCount = current.filter((r) => r.food.bringsSalad).length

    if (data.food.bringsCake && cakeCount >= cakeLimit) {
      throw new Error(`Das Kuchen-Kontingent ist leider voll (${cakeLimit}/${cakeLimit}).`)
    }
    if (data.food.bringsSalad && saladCount >= saladLimit) {
      throw new Error(`Das Salat-Kontingent ist leider voll (${saladLimit}/${saladLimit}).`)
    }

    const docRef = await addDoc(collection(db, 'registrations'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    // Store email in private subcollection to keep it out of the public document
    if (email) {
      setPrivateEmailHash(docRef.id, email).catch((err) =>
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
    // Replies are admin-only and never mutated through the standard update path.
    // Strip them defensively in case a caller passes them in.
    if ('campingNotesReply' in data) delete (data as Partial<Registration>).campingNotesReply
    if ('commentsReply' in data) delete (data as Partial<Registration>).commentsReply

    const existing = get().registrations.find((r) => r.id === id)
    const current = get().registrations

    const cakeLimit = getCakeLimit()
    const saladLimit = getSaladLimit()
    if (data.food?.bringsCake && !existing?.food.bringsCake) {
      const cakeCount = current.filter((r) => r.food.bringsCake && r.id !== id).length
      if (cakeCount >= cakeLimit) {
        throw new Error(`Das Kuchen-Kontingent ist leider voll (${cakeLimit}/${cakeLimit}).`)
      }
    }
    if (data.food?.bringsSalad && !existing?.food.bringsSalad) {
      const saladCount = current.filter((r) => r.food.bringsSalad && r.id !== id).length
      if (saladCount >= saladLimit) {
        throw new Error(`Das Salat-Kontingent ist leider voll (${saladLimit}/${saladLimit}).`)
      }
    }

    const docRef = doc(db, 'registrations', id)
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    })

    if (email) {
      setPrivateEmailHash(id, email).catch((err) =>
        console.error('Failed to update private email:', err)
      )
    }

    const merged = { ...existing, ...data } as Registration
    writeAuditLog({
      eventId: merged.eventId,
      action: 'update',
      entityId: id,
      familyName: merged.familyName,
      summary: existing ? buildUpdateSummary(existing as any, data as any) : buildRegistrationSummary(merged),
      performedBy,
    })
  },

  deleteRegistration: async (id, performedBy = 'user') => {
    const existing = get().registrations.find((r) => r.id === id)
    try {
      await updateDoc(doc(db, 'registrations', id), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
      })
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

  restoreRegistration: async (id, performedBy = 'admin') => {
    const existing = get().deletedRegistrations.find((r) => r.id === id)
    try {
      await updateDoc(doc(db, 'registrations', id), {
        isDeleted: deleteField(),
        deletedAt: deleteField(),
      })
      if (existing) {
        writeAuditLog({
          eventId: existing.eventId,
          action: 'restore',
          entityId: id,
          familyName: existing.familyName,
          summary: buildRegistrationSummary(existing),
          performedBy,
        })
      }
      useToastStore.getState().addToast('Anmeldung wiederhergestellt', 'success')
    } catch (error) {
      console.error('Error restoring registration:', error)
      useToastStore.getState().addToast('Fehler beim Wiederherstellen', 'error')
    }
  },

  setReply: async (id, field, text) => {
    const trimmed = text.trim()
    if (!trimmed) {
      useToastStore.getState().addToast('Antwort darf nicht leer sein', 'error')
      return
    }
    const existing = get().registrations.find((r) => r.id === id)
    if (!existing) {
      useToastStore.getState().addToast('Anmeldung nicht gefunden', 'error')
      return
    }
    try {
      await updateDoc(doc(db, 'registrations', id), {
        [field]: { text: trimmed, repliedAt: Timestamp.now() },
        updatedAt: serverTimestamp(),
      })
      writeAuditLog({
        eventId: existing.eventId,
        action: 'update',
        entityId: id,
        familyName: existing.familyName,
        summary: buildReplySummary(field, 'set', trimmed),
        performedBy: 'admin',
      })
      useToastStore.getState().addToast('Antwort gespeichert', 'success')
    } catch (error) {
      console.error('Error saving reply:', error)
      useToastStore.getState().addToast('Fehler beim Speichern der Antwort', 'error')
    }
  },

  deleteReply: async (id, field) => {
    const existing = get().registrations.find((r) => r.id === id)
    if (!existing) return
    try {
      await updateDoc(doc(db, 'registrations', id), {
        [field]: deleteField(),
        updatedAt: serverTimestamp(),
      })
      writeAuditLog({
        eventId: existing.eventId,
        action: 'update',
        entityId: id,
        familyName: existing.familyName,
        summary: buildReplySummary(field, 'delete'),
        performedBy: 'admin',
      })
      useToastStore.getState().addToast('Antwort gelöscht', 'success')
    } catch (error) {
      console.error('Error deleting reply:', error)
      useToastStore.getState().addToast('Fehler beim Löschen der Antwort', 'error')
    }
  },

  getRegistration: (id: string) => {
    return get().registrations.find((r) => r.id === id)
  },
}))
