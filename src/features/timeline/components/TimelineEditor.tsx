import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuthStore } from '@/features/auth/store'
import { useTimelineStore } from '@/features/timeline/store'
import { useToastStore } from '@/components/feedback/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/lib/utils/cn'
import type { TimelineCategory, TimelineItem } from '@/lib/firebase/types'

const CATEGORY_OPTIONS: { value: TimelineCategory; label: string; icon: string }[] = [
  { value: 'general', label: 'Allgemein', icon: '\uD83D\uDCCB' },
  { value: 'food', label: 'Essen', icon: '\uD83C\uDF7D\uFE0F' },
  { value: 'music', label: 'Musik', icon: '\uD83C\uDFB5' },
  { value: 'games', label: 'Spiele', icon: '\uD83C\uDFAE' },
  { value: 'ceremony', label: 'Zeremonie', icon: '\uD83E\uDD42' },
  { value: 'other', label: 'Sonstiges', icon: '\u2728' },
]

const CATEGORY_ICON_MAP: Record<TimelineCategory, string> = {
  general: '\uD83D\uDCCB',
  food: '\uD83C\uDF7D\uFE0F',
  music: '\uD83C\uDFB5',
  games: '\uD83C\uDFAE',
  ceremony: '\uD83E\uDD42',
  other: '\u2728',
}

interface EditFormData {
  time: string
  title: string
  description: string
  category: TimelineCategory
  notes: string
  isVisible: boolean
}

const emptyForm: EditFormData = {
  time: '',
  title: '',
  description: '',
  category: 'general',
  notes: '',
  isVisible: true,
}

export function TimelineEditor() {
  const eventId = useAuthStore((s) => s.eventId)
  const eventConfig = useAuthStore((s) => s.eventConfig)
  const { items, isLoading, subscribeToTimeline, addItem, updateItem, deleteItem, reorderItems } =
    useTimelineStore()
  const addToast = useToastStore((s) => s.addToast)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [formData, setFormData] = useState<EditFormData>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [notesTopInternal, setNotesTopInternal] = useState('')
  const [notesTopPublic, setNotesTopPublic] = useState('')
  const [notesBottomInternal, setNotesBottomInternal] = useState('')
  const [notesBottomPublic, setNotesBottomPublic] = useState('')
  const [notesDirty, setNotesDirty] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)

  useEffect(() => {
    if (!eventConfig) return
    setNotesTopInternal(eventConfig.timelineNotesTop ?? '')
    setNotesTopPublic(eventConfig.timelineNotesTopPublic ?? '')
    setNotesBottomInternal(eventConfig.timelineNotesBottom ?? '')
    setNotesBottomPublic(eventConfig.timelineNotesBottomPublic ?? '')
    setNotesDirty(false)
  }, [eventConfig])

  const handleSaveNotes = useCallback(async () => {
    if (!eventId) return
    setNotesSaving(true)
    try {
      await updateDoc(doc(db, 'events', eventId), {
        timelineNotesTop: notesTopInternal,
        timelineNotesTopPublic: notesTopPublic,
        timelineNotesBottom: notesBottomInternal,
        timelineNotesBottomPublic: notesBottomPublic,
        updatedAt: serverTimestamp(),
      })
      addToast('Notizen gespeichert', 'success')
      setNotesDirty(false)
    } catch (error) {
      console.error('Error saving timeline notes:', error)
      addToast('Fehler beim Speichern', 'error')
    } finally {
      setNotesSaving(false)
    }
  }, [eventId, notesTopInternal, notesTopPublic, notesBottomInternal, notesBottomPublic, addToast])

  useEffect(() => {
    if (!eventId) return
    const unsubscribe = subscribeToTimeline(eventId)
    return () => unsubscribe()
  }, [eventId, subscribeToTimeline])

  const handleNew = () => {
    setFormData(emptyForm)
    setEditingId('__new__')
    setIsNew(true)
  }

  const handleEdit = (item: TimelineItem) => {
    setFormData({
      time: item.time,
      title: item.title,
      description: item.description,
      category: item.category,
      notes: item.notes,
      isVisible: item.isVisible,
    })
    setEditingId(item.id)
    setIsNew(false)
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsNew(false)
    setFormData(emptyForm)
  }

  const handleSave = async () => {
    if (!eventId) return
    if (!formData.title.trim()) {
      addToast('Bitte Titel eingeben', 'error')
      return
    }
    if (!formData.time.trim()) {
      addToast('Bitte Uhrzeit eingeben', 'error')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        await addItem({
          eventId,
          time: formData.time,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          notes: formData.notes,
          isVisible: formData.isVisible,
          order: items.length,
        })
      } else if (editingId) {
        await updateItem(editingId, {
          time: formData.time,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          notes: formData.notes,
          isVisible: formData.isVisible,
        })
      }
      setEditingId(null)
      setIsNew(false)
      setFormData(emptyForm)
    } catch (error) {
      console.error('Error saving timeline item:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await deleteItem(id)
    setDeleteConfirmId(null)
    if (editingId === id) {
      setEditingId(null)
      setFormData(emptyForm)
    }
  }

  const handleToggleVisibility = async (item: TimelineItem) => {
    await updateItem(item.id, { isVisible: !item.isVisible })
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const reordered = [...items]
    const temp = reordered[index - 1]
    reordered[index - 1] = reordered[index]
    reordered[index] = temp
    await reorderItems(reordered)
  }

  const handleMoveDown = async (index: number) => {
    if (index >= items.length - 1) return
    const reordered = [...items]
    const temp = reordered[index + 1]
    reordered[index + 1] = reordered[index]
    reordered[index] = temp
    await reorderItems(reordered)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-warm-400">
        <div className="w-6 h-6 border-2 border-warm-300 border-t-primary-500 rounded-full animate-spin" />
        <span className="ml-3 text-sm">Laden...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-warm-800">
          Ablaufplan
        </h2>
        <Button size="sm" onClick={handleNew} disabled={isSaving}>
          + Neuer Zeitpunkt
        </Button>
      </div>

      {/* General notes – top */}
      <div className="rounded-2xl border border-warm-100 bg-white p-4 space-y-3">
        <p className="text-xs font-medium text-warm-500 uppercase tracking-wider">
          Notizen oben (vor dem Ablaufplan)
        </p>
        <Textarea
          label="Öffentlich (für alle sichtbar)"
          value={notesTopPublic}
          onChange={(e) => {
            setNotesTopPublic(e.target.value)
            setNotesDirty(true)
          }}
          placeholder="z.B. Bitte pünktlich kommen, Parkhinweise..."
        />
        <Textarea
          label="Intern (nur für Admins)"
          value={notesTopInternal}
          onChange={(e) => {
            setNotesTopInternal(e.target.value)
            setNotesDirty(true)
          }}
          placeholder="z.B. Wer baut auf? Schlüssel bei Oma abholen..."
        />
      </div>

      {/* Inline edit form */}
      <AnimatePresence>
        {editingId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Uhrzeit"
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                />
                <Input
                  label="Titel"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="z.B. Ankunft & Begrüßung"
                />
              </div>

              <Textarea
                label="Beschreibung"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optionale Beschreibung..."
              />

              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-warm-700">
                  Kategorie
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, category: opt.value })
                      }
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                        formData.category === opt.value
                          ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
                          : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
                      )}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                label="Orga-Notizen (nur für Admins sichtbar)"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Interne Notizen..."
              />

              <Toggle
                checked={formData.isVisible}
                onChange={(checked) =>
                  setFormData({ ...formData, isVisible: checked })
                }
                label="Sichtbar"
              />

              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Wird gespeichert...' : 'Speichern'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Timeline items list */}
      {items.length === 0 && !editingId ? (
        <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center text-warm-400">
          Noch keine Zeitpunkte vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              className={cn(
                'rounded-xl border border-warm-100 bg-white p-4 flex items-center gap-3',
                !item.isVisible && 'opacity-50'
              )}
            >
              {/* Time badge */}
              <div className="shrink-0 w-14 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">
                {item.time}
              </div>

              {/* Category icon */}
              <span className="text-lg shrink-0">
                {CATEGORY_ICON_MAP[item.category]}
              </span>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-warm-800 truncate">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-warm-400 truncate">
                    {item.description}
                  </p>
                )}
                {item.notes && (
                  <p className="text-xs text-amber-600 truncate mt-0.5">
                    {'\uD83D\uDCDD'} {item.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Reorder */}
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0 || isSaving}
                  className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Nach oben"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index >= items.length - 1 || isSaving}
                  className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 disabled:opacity-30 cursor-pointer transition-colors"
                  title="Nach unten"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Visibility */}
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(item)}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 cursor-pointer transition-colors"
                  title={item.isVisible ? 'Verbergen' : 'Anzeigen'}
                >
                  {item.isVisible ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  )}
                </button>

                {/* Edit */}
                <button
                  type="button"
                  onClick={() => handleEdit(item)}
                  disabled={isSaving}
                  className="p-1.5 rounded-lg text-warm-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors"
                  title="Bearbeiten"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Delete */}
                {deleteConfirmId === item.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={isSaving}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer transition-colors text-xs font-medium"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="p-1.5 rounded-lg text-warm-400 hover:bg-warm-100 cursor-pointer transition-colors text-xs font-medium"
                    >
                      Nein
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg text-warm-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                    title="Löschen"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* General notes – bottom */}
      <div className="rounded-2xl border border-warm-100 bg-white p-4 space-y-3">
        <p className="text-xs font-medium text-warm-500 uppercase tracking-wider">
          Notizen unten (nach dem Ablaufplan)
        </p>
        <Textarea
          label="Öffentlich (für alle sichtbar)"
          value={notesBottomPublic}
          onChange={(e) => {
            setNotesBottomPublic(e.target.value)
            setNotesDirty(true)
          }}
          placeholder="z.B. Bitte beim Aufräumen helfen, Kontaktdaten..."
        />
        <Textarea
          label="Intern (nur für Admins)"
          value={notesBottomInternal}
          onChange={(e) => {
            setNotesBottomInternal(e.target.value)
            setNotesDirty(true)
          }}
          placeholder="z.B. Müllentsorgung, Aufräum-Team..."
        />
      </div>

      {/* Save notes button */}
      {notesDirty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving}>
            {notesSaving ? 'Wird gespeichert...' : 'Notizen speichern'}
          </Button>
        </motion.div>
      )}
    </div>
  )
}
