import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuthStore } from '@/features/auth/store'
import { useToastStore } from '@/components/feedback/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Toggle } from '@/components/ui/Toggle'
import { cn } from '@/lib/utils/cn'
import type { Announcement } from '@/lib/firebase/types'

const TYPE_OPTIONS: { value: Announcement['type']; label: string; icon: string }[] = [
  { value: 'info', label: 'Info', icon: '\u2139\uFE0F' },
  { value: 'warning', label: 'Warnung', icon: '\u26A0\uFE0F' },
  { value: 'highlight', label: 'Highlight', icon: '\u2B50' },
]

function createEmptyAnnouncement(order: number): Announcement {
  return {
    id: crypto.randomUUID(),
    title: '',
    content: '',
    type: 'info',
    order,
    isVisible: true,
  }
}

export function AnnouncementEditor() {
  const eventConfig = useAuthStore((s) => s.eventConfig)
  const eventId = useAuthStore((s) => s.eventId)
  const addToast = useToastStore((s) => s.addToast)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Announcement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)

  const announcements = eventConfig?.announcements ?? []

  // Wrap or prepend markdown markers around the current selection in the content textarea.
  const applyMarkdown = (mode: 'bold' | 'italic' | 'list') => {
    const ta = contentRef.current
    if (!ta || !editData) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const value = editData.content
    const selected = value.slice(start, end)
    let next: string
    let newCursor: number

    if (mode === 'list') {
      // Prepend "- " to each line in the selection (or current line if no selection)
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineEnd = end > start ? end : value.indexOf('\n', start)
      const sliceEnd = lineEnd === -1 ? value.length : lineEnd
      const block = value.slice(lineStart, sliceEnd)
      const transformed = block
        .split('\n')
        .map((line) => (line.startsWith('- ') ? line : `- ${line}`))
        .join('\n')
      next = value.slice(0, lineStart) + transformed + value.slice(sliceEnd)
      newCursor = lineStart + transformed.length
    } else {
      const marker = mode === 'bold' ? '**' : '*'
      const placeholder = mode === 'bold' ? 'fett' : 'kursiv'
      const inner = selected || placeholder
      next = value.slice(0, start) + marker + inner + marker + value.slice(end)
      newCursor = start + marker.length + inner.length + marker.length
    }

    setEditData({ ...editData, content: next })
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(newCursor, newCursor)
    })
  }

  const saveAnnouncements = async (updated: Announcement[]) => {
    if (!eventId) return
    setIsSaving(true)
    try {
      const docRef = doc(db, 'events', eventId)
      await updateDoc(docRef, {
        announcements: updated,
        updatedAt: serverTimestamp(),
      })
      addToast('Ankündigungen gespeichert', 'success')
    } catch (error) {
      console.error('Error saving announcements:', error)
      addToast('Fehler beim Speichern', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleNew = () => {
    const newAnnouncement = createEmptyAnnouncement(announcements.length)
    setEditData(newAnnouncement)
    setEditingId(newAnnouncement.id)
  }

  const handleEdit = (announcement: Announcement) => {
    setEditData({ ...announcement })
    setEditingId(announcement.id)
  }

  const handleSave = async () => {
    if (!editData) return

    if (!editData.title.trim()) {
      addToast('Bitte Titel eingeben', 'error')
      return
    }

    const exists = announcements.some((a) => a.id === editData.id)
    const updated = exists
      ? announcements.map((a) => (a.id === editData.id ? editData : a))
      : [...announcements, editData]

    await saveAnnouncements(updated)
    setEditingId(null)
    setEditData(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData(null)
  }

  const handleDelete = async (id: string) => {
    const updated = announcements.filter((a) => a.id !== id)
    // Re-index order
    const reordered = updated.map((a, i) => ({ ...a, order: i }))
    await saveAnnouncements(reordered)
    setDeleteConfirmId(null)
    if (editingId === id) {
      setEditingId(null)
      setEditData(null)
    }
  }

  const handleToggleVisibility = async (id: string) => {
    const updated = announcements.map((a) =>
      a.id === id ? { ...a, isVisible: !a.isVisible } : a
    )
    await saveAnnouncements(updated)
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return
    const updated = [...announcements]
    const temp = updated[index - 1]
    updated[index - 1] = { ...updated[index], order: index - 1 }
    updated[index] = { ...temp, order: index }
    await saveAnnouncements(updated)
  }

  const handleMoveDown = async (index: number) => {
    if (index >= announcements.length - 1) return
    const updated = [...announcements]
    const temp = updated[index + 1]
    updated[index + 1] = { ...updated[index], order: index + 1 }
    updated[index] = { ...temp, order: index }
    await saveAnnouncements(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-bold text-warm-800">
          Ankündigungen
        </h2>
        <Button size="sm" onClick={handleNew} disabled={isSaving}>
          + Neue Ankündigung
        </Button>
      </div>

      {/* Inline edit form */}
      <AnimatePresence>
        {editingId && editData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border-2 border-primary-200 bg-primary-50/50 p-5 space-y-4">
              <Input
                label="Titel"
                value={editData.title}
                onChange={(e) =>
                  setEditData({ ...editData, title: e.target.value })
                }
                placeholder="Ankündigungstitel..."
              />
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-warm-700">
                  Inhalt
                </label>
                <div className="flex items-center gap-1 px-1">
                  <button
                    type="button"
                    onClick={() => applyMarkdown('bold')}
                    className="px-2.5 py-1 rounded-lg text-sm font-bold text-warm-600 hover:bg-warm-100 cursor-pointer transition-colors"
                    title="Fett (Strg+B)"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdown('italic')}
                    className="px-2.5 py-1 rounded-lg text-sm italic text-warm-600 hover:bg-warm-100 cursor-pointer transition-colors"
                    title="Kursiv (Strg+I)"
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={() => applyMarkdown('list')}
                    className="px-2.5 py-1 rounded-lg text-sm text-warm-600 hover:bg-warm-100 cursor-pointer transition-colors"
                    title="Aufzählung"
                  >
                    {'• Liste'}
                  </button>
                  <span className="ml-auto text-xs text-warm-400">
                    Markdown: **fett**, *kursiv*, - Liste
                  </span>
                </div>
                <Textarea
                  ref={contentRef}
                  value={editData.content}
                  onChange={(e) =>
                    setEditData({ ...editData, content: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
                      e.preventDefault()
                      applyMarkdown('bold')
                    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
                      e.preventDefault()
                      applyMarkdown('italic')
                    }
                  }}
                  placeholder="Beschreibung..."
                  className="min-h-[120px]"
                />
              </div>

              {/* Type Selector */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-warm-700">
                  Typ
                </label>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setEditData({ ...editData, type: opt.value })
                      }
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                        editData.type === opt.value
                          ? opt.value === 'info'
                            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                            : opt.value === 'warning'
                              ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
                              : 'bg-primary-100 text-primary-700 ring-2 ring-primary-300'
                          : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
                      )}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Toggle
                checked={editData.size === 'hero'}
                onChange={(checked) =>
                  setEditData({ ...editData, size: checked ? 'hero' : 'normal' })
                }
                label="Als großes Element (Einleitungstext, volle Breite)"
              />

              <Toggle
                checked={editData.isVisible}
                onChange={(checked) =>
                  setEditData({ ...editData, isVisible: checked })
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

      {/* Announcement list */}
      {announcements.length === 0 && !editingId ? (
        <div className="rounded-2xl border border-warm-100 bg-white p-8 text-center text-warm-400">
          Noch keine Ankündigungen vorhanden.
        </div>
      ) : (
        <div className="space-y-2">
          {announcements
            .sort((a, b) => a.order - b.order)
            .map((announcement, index) => (
              <motion.div
                key={announcement.id}
                layout
                className={cn(
                  'rounded-xl border bg-white p-4 flex items-center gap-3',
                  !announcement.isVisible && 'opacity-50',
                  announcement.type === 'warning' && 'border-amber-200',
                  announcement.type === 'highlight' && 'border-primary-200',
                  announcement.type === 'info' && 'border-warm-100'
                )}
              >
                {/* Type indicator */}
                <span className="text-lg shrink-0">
                  {announcement.type === 'info'
                    ? '\u2139\uFE0F'
                    : announcement.type === 'warning'
                      ? '\u26A0\uFE0F'
                      : '\u2B50'}
                </span>

                {/* Title + content preview */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-warm-800 truncate">
                    {announcement.title || 'Ohne Titel'}
                  </p>
                  {announcement.content && (
                    <p className="text-xs text-warm-400 truncate">
                      {announcement.content}
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
                    disabled={index >= announcements.length - 1 || isSaving}
                    className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 disabled:opacity-30 cursor-pointer transition-colors"
                    title="Nach unten"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Visibility toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(announcement.id)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg text-warm-400 hover:text-warm-600 hover:bg-warm-100 cursor-pointer transition-colors"
                    title={announcement.isVisible ? 'Verbergen' : 'Anzeigen'}
                  >
                    {announcement.isVisible ? (
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
                    onClick={() => handleEdit(announcement)}
                    disabled={isSaving}
                    className="p-1.5 rounded-lg text-warm-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors"
                    title="Bearbeiten"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete */}
                  {deleteConfirmId === announcement.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(announcement.id)}
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
                      onClick={() => setDeleteConfirmId(announcement.id)}
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
    </div>
  )
}
