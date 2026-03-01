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
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useToastStore } from '@/components/feedback/Toast'
import type { TimelineItem } from '@/lib/firebase/types'

interface TimelineState {
  items: TimelineItem[]
  isLoading: boolean
  subscribeToTimeline: (eventId: string) => () => void
  addItem: (item: Omit<TimelineItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateItem: (id: string, data: Partial<TimelineItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  reorderItems: (items: TimelineItem[]) => Promise<void>
}

export const useTimelineStore = create<TimelineState>((set) => ({
  items: [],
  isLoading: true,

  subscribeToTimeline: (eventId: string) => {
    set({ isLoading: true })
    const timelineRef = collection(db, 'timeline')
    const q = query(
      timelineRef,
      where('eventId', '==', eventId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as TimelineItem[]
        // Sort client-side by order (avoids composite index)
        items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        set({ items, isLoading: false })
      },
      (error) => {
        console.error('Timeline subscription error:', error)
        set({ isLoading: false })
      }
    )

    return unsubscribe
  },

  addItem: async (item) => {
    try {
      await addDoc(collection(db, 'timeline'), {
        ...item,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      useToastStore.getState().addToast('Zeitpunkt hinzugefügt', 'success')
    } catch (error) {
      console.error('Error adding timeline item:', error)
      useToastStore.getState().addToast('Fehler beim Hinzufügen', 'error')
    }
  },

  updateItem: async (id, data) => {
    try {
      const docRef = doc(db, 'timeline', id)
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      })
      useToastStore.getState().addToast('Zeitpunkt aktualisiert', 'success')
    } catch (error) {
      console.error('Error updating timeline item:', error)
      useToastStore.getState().addToast('Fehler beim Aktualisieren', 'error')
    }
  },

  deleteItem: async (id) => {
    try {
      await deleteDoc(doc(db, 'timeline', id))
      useToastStore.getState().addToast('Zeitpunkt gelöscht', 'success')
    } catch (error) {
      console.error('Error deleting timeline item:', error)
      useToastStore.getState().addToast('Fehler beim Löschen', 'error')
    }
  },

  reorderItems: async (items) => {
    try {
      const batch = writeBatch(db)
      items.forEach((item, index) => {
        const docRef = doc(db, 'timeline', item.id)
        batch.update(docRef, { order: index, updatedAt: serverTimestamp() })
      })
      await batch.commit()
    } catch (error) {
      console.error('Error reordering timeline items:', error)
      useToastStore.getState().addToast('Fehler beim Sortieren', 'error')
    }
  },
}))
