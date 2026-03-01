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
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useToastStore } from '@/components/feedback/Toast'
import type { MapDocument, MapBackup, GeoJSONFeature } from '@/lib/firebase/types'

interface MapState {
  mapData: MapDocument | null
  isLoading: boolean
  subscribeToMap: (eventId: string) => () => void
  saveMap: (
    eventId: string,
    data: {
      name: string
      center: { lat: number; lng: number }
      zoom: number
      bearing: number
      shapes: GeoJSONFeature[]
    }
  ) => Promise<void>
  restoreBackup: (backupId: string) => Promise<void>
  renameBackup: (backupId: string, name: string) => Promise<void>
  deleteBackup: (backupId: string) => Promise<void>
  publishMap: (mapId: string, isPublished: boolean) => Promise<void>
  deleteMap: (mapId: string) => Promise<void>
}

export const useMapStore = create<MapState>((set, get) => ({
  mapData: null,
  isLoading: true,

  subscribeToMap: (eventId: string) => {
    set({ isLoading: true })
    const mapsRef = collection(db, 'maps')
    const q = query(mapsRef, where('eventId', '==', eventId), limit(1))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          set({ mapData: null, isLoading: false })
        } else {
          const docSnap = snapshot.docs[0]
          const mapData = { id: docSnap.id, ...docSnap.data() } as MapDocument
          set({ mapData, isLoading: false })
        }
      },
      (error) => {
        console.error('Map subscription error:', error)
        set({ isLoading: false })
      }
    )

    return unsubscribe
  },

  saveMap: async (eventId, data) => {
    try {
      const { mapData } = get()

      if (mapData) {
        // Create backup of current state before saving
        const backup: MapBackup = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          label: new Date().toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }),
          name: '',
          shapes: mapData.shapes || [],
          center: mapData.center,
          zoom: mapData.zoom,
          bearing: mapData.bearing ?? 0,
        }

        const existingBackups = mapData.backups || []
        // Keep max 10 backups
        const backups = [backup, ...existingBackups].slice(0, 10)

        const docRef = doc(db, 'maps', mapData.id)
        await updateDoc(docRef, {
          ...data,
          backups,
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'maps'), {
          eventId,
          ...data,
          backups: [],
          isPublished: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }

      useToastStore.getState().addToast('Karte gespeichert', 'success')
    } catch (error) {
      console.error('Error saving map:', error)
      useToastStore.getState().addToast('Fehler beim Speichern der Karte', 'error')
    }
  },

  restoreBackup: async (backupId: string) => {
    try {
      const { mapData } = get()
      if (!mapData) return

      const backups = mapData.backups || []
      const backup = backups.find((b) => b.id === backupId)
      if (!backup) return

      const docRef = doc(db, 'maps', mapData.id)
      await updateDoc(docRef, {
        shapes: backup.shapes,
        center: backup.center,
        zoom: backup.zoom,
        bearing: backup.bearing ?? 0,
        updatedAt: serverTimestamp(),
      })

      useToastStore.getState().addToast('Backup wiederhergestellt', 'success')
    } catch (error) {
      console.error('Error restoring backup:', error)
      useToastStore.getState().addToast('Fehler beim Wiederherstellen', 'error')
    }
  },

  renameBackup: async (backupId: string, name: string) => {
    try {
      const { mapData } = get()
      if (!mapData) return

      const backups = (mapData.backups || []).map((b) =>
        b.id === backupId ? { ...b, name } : b
      )

      const docRef = doc(db, 'maps', mapData.id)
      await updateDoc(docRef, { backups, updatedAt: serverTimestamp() })
    } catch (error) {
      console.error('Error renaming backup:', error)
    }
  },

  deleteBackup: async (backupId: string) => {
    try {
      const { mapData } = get()
      if (!mapData) return

      const backups = (mapData.backups || []).filter((b) => b.id !== backupId)

      const docRef = doc(db, 'maps', mapData.id)
      await updateDoc(docRef, {
        backups,
        updatedAt: serverTimestamp(),
      })

      useToastStore.getState().addToast('Backup gelöscht', 'success')
    } catch (error) {
      console.error('Error deleting backup:', error)
      useToastStore.getState().addToast('Fehler beim Löschen', 'error')
    }
  },

  publishMap: async (mapId, isPublished) => {
    try {
      const docRef = doc(db, 'maps', mapId)
      await updateDoc(docRef, {
        isPublished,
        updatedAt: serverTimestamp(),
      })
      useToastStore
        .getState()
        .addToast(
          isPublished ? 'Karte veröffentlicht' : 'Karte verborgen',
          'success'
        )
    } catch (error) {
      console.error('Error publishing map:', error)
      useToastStore
        .getState()
        .addToast('Fehler beim Aktualisieren', 'error')
    }
  },

  deleteMap: async (mapId) => {
    try {
      await deleteDoc(doc(db, 'maps', mapId))
      useToastStore.getState().addToast('Karte gelöscht', 'success')
    } catch (error) {
      console.error('Error deleting map:', error)
      useToastStore
        .getState()
        .addToast('Fehler beim Löschen der Karte', 'error')
    }
  },
}))
