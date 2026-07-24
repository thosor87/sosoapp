import { create } from 'zustand'
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from 'firebase/firestore'
import type { Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export interface Photo {
  id: string
  imageData: string
  createdAt?: Timestamp
}

interface PhotoState {
  photos: Photo[]
  isLoading: boolean
  /** Lädt ein (bereits komprimiertes) Foto als Data-URL hoch. */
  uploadPhoto: (imageData: string) => Promise<void>
  /** Realtime-Listener für die Admin-Galerie. */
  subscribe: () => () => void
  deletePhoto: (id: string) => Promise<void>
}

export const usePhotoStore = create<PhotoState>((set) => ({
  photos: [],
  isLoading: true,

  uploadPhoto: async (imageData: string) => {
    await addDoc(collection(db, 'photos'), {
      imageData,
      createdAt: serverTimestamp(),
    })
  },

  subscribe: () => {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const photos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Photo)
        set({ photos, isLoading: false })
      },
      (err) => {
        console.error('Photo listener error:', err)
        set({ isLoading: false })
      }
    )
    return unsub
  },

  deletePhoto: async (id: string) => {
    await deleteDoc(doc(db, 'photos', id))
  },
}))
