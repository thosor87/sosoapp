import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useRegistrationStore } from '@/features/registration/store'
import type { AdminReply } from '@/lib/firebase/types'

interface CommentReplyEditorProps {
  registrationId: string
  field: 'campingNotesReply' | 'commentsReply'
  comment: string
  reply?: AdminReply
  label: string
}

const MAX_LENGTH = 1000

export function CommentReplyEditor({
  registrationId,
  field,
  comment,
  reply,
  label,
}: CommentReplyEditorProps) {
  const setReply = useRegistrationStore((s) => s.setReply)
  const deleteReply = useRegistrationStore((s) => s.deleteReply)

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(reply?.text ?? '')
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setDraft(reply?.text ?? '')
    setIsEditing(true)
  }

  const cancel = () => {
    setDraft(reply?.text ?? '')
    setIsEditing(false)
  }

  const save = async () => {
    setSaving(true)
    await setReply(registrationId, field, draft)
    setSaving(false)
    setIsEditing(false)
  }

  const remove = async () => {
    if (!confirm('Antwort wirklich löschen?')) return
    setSaving(true)
    await deleteReply(registrationId, field)
    setSaving(false)
    setIsEditing(false)
  }

  return (
    <div className="mt-2 rounded-md border border-orange-200 bg-orange-50 p-3 text-sm">
      <div className="text-xs font-semibold uppercase text-orange-700">{label}</div>
      <div className="mt-1 whitespace-pre-wrap text-stone-700">{comment}</div>

      {!isEditing && reply && (
        <div className="mt-3 rounded bg-white p-2">
          <div className="text-xs font-semibold text-orange-700">Antwort vom Orga-Team</div>
          <div className="mt-1 whitespace-pre-wrap text-stone-800">{reply.text}</div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={startEdit} disabled={saving}>
              Bearbeiten
            </Button>
            <Button size="sm" variant="ghost" onClick={remove} disabled={saving}>
              Löschen
            </Button>
          </div>
        </div>
      )}

      {!isEditing && !reply && (
        <Button size="sm" className="mt-3" onClick={startEdit}>
          Antwort schreiben
        </Button>
      )}

      {isEditing && (
        <div className="mt-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            rows={3}
            className="w-full rounded border border-stone-300 p-2 text-sm"
            placeholder="Antwort schreiben…"
          />
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span>{draft.length}/{MAX_LENGTH}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving || !draft.trim()}>
              Speichern
            </Button>
            <Button size="sm" variant="outline" onClick={cancel} disabled={saving}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
