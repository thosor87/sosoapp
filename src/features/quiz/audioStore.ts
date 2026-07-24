import { create } from 'zustand'
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

/** Max. Größe der Base64-Audiodaten (Firestore-Dokument < 1 MB). */
export const MAX_AUDIO_BYTES = 950_000

export type AudioStation = 'see1' | 'see2'

interface AudioState {
  /** id → Data-URL (oder '' wenn keins). undefined = noch nicht geladen. */
  audios: Record<string, string | undefined>
  /** Realtime-Listener für eine Station. */
  subscribe: (id: AudioStation) => () => void
  /** Speichert eine (bereits als Data-URL vorliegende) Audiodatei. */
  uploadAudio: (id: AudioStation, data: string) => Promise<void>
  deleteAudio: (id: AudioStation) => Promise<void>
}

export const useAudioStore = create<AudioState>((set) => ({
  audios: {},

  subscribe: (id) => {
    const unsub = onSnapshot(
      doc(db, 'audio', id),
      (snap) => {
        const data = snap.exists() ? ((snap.data().data as string) ?? '') : ''
        set((s) => ({ audios: { ...s.audios, [id]: data } }))
      },
      (err) => {
        console.error('Audio listener error:', err)
        set((s) => ({ audios: { ...s.audios, [id]: '' } }))
      }
    )
    return unsub
  },

  uploadAudio: async (id, data) => {
    await setDoc(doc(db, 'audio', id), { data, updatedAt: serverTimestamp() })
  },

  deleteAudio: async (id) => {
    await deleteDoc(doc(db, 'audio', id))
  },
}))
