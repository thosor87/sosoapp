# Admin-Antworten auf Gast-Kommentare — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin can write a public reply to each guest comment (`camping.notes` and `comments`); replies appear in the public overview and are included in Edit-Link emails when guests request them.

**Architecture:** Two new optional fields (`campingNotesReply`, `commentsReply`) on `Registration`, each holding `{ text, repliedAt, repliedBy? }`. New store mutations `setReply` / `deleteReply` write only the relevant field — the existing guest-edit path explicitly excludes reply fields, so guests cannot overwrite or inject replies through the form. Reply data flows into `CampingList` (existing) and a new `CommentsList` section in the overview, plus into the `sendEditLinkEmail` HTML body.

**Tech Stack:** React 19 + TypeScript, Vite, Tailwind v4, Firestore, Zustand, EmailJS.

**Verification model:** This codebase has no automated test framework. Each task ends with `npm run build` (TypeScript check), `npm run lint`, and manual UI verification in `npm run dev` against the local Firestore project. Verify steps describe the exact UI flow to walk through.

**Spec:** [`docs/superpowers/specs/2026-05-05-admin-comment-replies-design.md`](../specs/2026-05-05-admin-comment-replies-design.md)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `src/lib/firebase/types.ts` | modify | Add `AdminReply` interface, two optional fields on `Registration` |
| `src/lib/firebase/auditLog.ts` | modify | Add `buildReplySummary` helper |
| `src/features/registration/store.ts` | modify | Add `setReply` / `deleteReply`; ensure `updateRegistration` strips reply fields from guest-supplied data |
| `src/features/admin/components/CommentReplyEditor.tsx` | create | Reusable editor: shows comment + reply, edit/delete UI |
| `src/features/admin/components/RegistrationManager.tsx` | modify | Render `CommentReplyEditor` per registration when comment fields exist |
| `src/features/overview/components/CampingList.tsx` | modify | Render `campingNotesReply` under existing notes |
| `src/features/overview/components/CommentsList.tsx` | create | New overview section listing all `comments` + replies |
| `src/features/overview/components/ReplyBlock.tsx` | create | Shared visual block for displaying a reply (used by both overview lists) |
| `src/pages/OverviewPage.tsx` (or wherever the overview lists are composed) | modify | Mount `CommentsList` |
| `src/features/registration/components/RegistrationForm.tsx` | modify | Hint near `comments` field that it becomes publicly visible if filled |
| `src/lib/firebase/sendConfirmationEmail.ts` | modify | Inject reply block into `sendEditLinkEmail` HTML |
| `firestore.rules` | modify | Structural validation for reply fields on `registrations` update |

---

## Task 1: Datenmodell — AdminReply-Interface

**Files:**
- Modify: `src/lib/firebase/types.ts`

- [ ] **Step 1: Add `AdminReply` interface and extend `Registration`**

In `src/lib/firebase/types.ts`, add the `AdminReply` interface near the top of the file (after the imports) and extend `Registration` with two optional fields. Place `AdminReply` after the `Announcement` interface for consistency with the file's existing ordering:

```ts
export interface AdminReply {
  text: string
  repliedAt: Timestamp
  repliedBy?: string
}
```

Modify the `Registration` interface (currently at lines 35-49) to add the two optional fields after `comments`:

```ts
export interface Registration {
  id: string
  eventId: string
  familyName: string
  contactName: string
  adultsCount: number
  childrenCount: number
  food: FoodContribution
  camping: CampingInfo
  comments: string
  campingNotesReply?: AdminReply
  commentsReply?: AdminReply
  isDeleted?: boolean
  deletedAt?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd soso-app && npm run build`
Expected: Build succeeds. The new optional fields are unused at this point; no other file should break.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase/types.ts
git commit -m "feat(types): add AdminReply interface and reply fields on Registration"
```

---

## Task 2: Audit-Log-Helper für Reply-Aktionen

**Files:**
- Modify: `src/lib/firebase/auditLog.ts`

- [ ] **Step 1: Inspect existing summary builders**

Read `src/lib/firebase/auditLog.ts` to find `buildRegistrationSummary` and `buildUpdateSummary`. The helper for replies must follow the same return-type and naming style.

- [ ] **Step 2: Add `buildReplySummary` helper**

Append the following function to `auditLog.ts` (export it):

```ts
export function buildReplySummary(
  field: 'campingNotesReply' | 'commentsReply',
  action: 'set' | 'delete',
  text?: string
): string {
  const fieldLabel = field === 'campingNotesReply' ? 'Zelten-Antwort' : 'Anmerkung-Antwort'
  if (action === 'delete') return `${fieldLabel} entfernt`
  const preview = (text ?? '').trim().slice(0, 60)
  const ellipsis = (text ?? '').length > 60 ? '…' : ''
  return `${fieldLabel}: „${preview}${ellipsis}"`
}
```

- [ ] **Step 3: Verify build**

Run: `cd soso-app && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/firebase/auditLog.ts
git commit -m "feat(audit): add buildReplySummary for admin reply actions"
```

---

## Task 3: Store-Mutationen `setReply` und `deleteReply`

**Files:**
- Modify: `src/features/registration/store.ts`

- [ ] **Step 1: Extend the `RegistrationState` interface**

In `store.ts`, add two new methods to the interface (after `restoreRegistration`):

```ts
setReply: (
  id: string,
  field: 'campingNotesReply' | 'commentsReply',
  text: string
) => Promise<void>
deleteReply: (
  id: string,
  field: 'campingNotesReply' | 'commentsReply'
) => Promise<void>
```

- [ ] **Step 2: Import the new audit helper and `Timestamp`**

Add to existing imports:

```ts
import { writeAuditLog, buildRegistrationSummary, buildUpdateSummary, buildReplySummary } from '@/lib/firebase/auditLog'
import { Timestamp } from 'firebase/firestore'
```

(Keep the existing `serverTimestamp`, `deleteField`, etc. imports.)

- [ ] **Step 3: Implement `setReply` inside the store factory**

Add the implementation alongside the other mutations (e.g. after `restoreRegistration`):

```ts
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
  const reply = {
    text: trimmed,
    repliedAt: Timestamp.now(),
  }
  try {
    await updateDoc(doc(db, 'registrations', id), {
      [field]: reply,
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
```

- [ ] **Step 4: Implement `deleteReply`**

Add right after `setReply`:

```ts
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
```

- [ ] **Step 5: Harden `updateRegistration` against reply-field injection**

Inside `updateRegistration` (lines 128–168), at the very top of the function (before the cake/salad limit checks), add:

```ts
// Replies are admin-only and never mutated through the standard update path.
// Strip them defensively in case a caller passes them in.
if ('campingNotesReply' in data) delete (data as Partial<Registration>).campingNotesReply
if ('commentsReply' in data) delete (data as Partial<Registration>).commentsReply
```

- [ ] **Step 6: Verify build and lint**

```
cd soso-app && npm run build && npm run lint
```
Expected: both PASS, no new warnings.

- [ ] **Step 7: Manual smoke test — store wiring**

Run `npm run dev`, sign in as admin, open the browser console on the admin page, then run:

```js
const s = window.__zustand_registrations__ ?? null  // not exported — skip if undefined
```

If no console hook is exposed, defer the runtime test to Task 4 where the UI will exercise the mutations.

- [ ] **Step 8: Commit**

```bash
git add src/features/registration/store.ts
git commit -m "feat(store): add setReply/deleteReply mutations and reply-field guard"
```

---

## Task 4: Reusable `CommentReplyEditor` Component

**Files:**
- Create: `src/features/admin/components/CommentReplyEditor.tsx`

- [ ] **Step 1: Create the component file**

Write `src/features/admin/components/CommentReplyEditor.tsx` with the full content below:

```tsx
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
          <div className="text-xs font-semibold text-orange-700">Antwort von Familie Soring</div>
          <div className="mt-1 whitespace-pre-wrap text-stone-800">{reply.text}</div>
          <div className="mt-2 flex gap-2">
            <Button variant="secondary" onClick={startEdit} disabled={saving}>
              Bearbeiten
            </Button>
            <Button variant="secondary" onClick={remove} disabled={saving}>
              Löschen
            </Button>
          </div>
        </div>
      )}

      {!isEditing && !reply && (
        <Button className="mt-3" onClick={startEdit}>
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
            <Button onClick={save} disabled={saving || !draft.trim()}>
              Speichern
            </Button>
            <Button variant="secondary" onClick={cancel} disabled={saving}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
```

> **Note on Button variants:** Verify in `src/components/ui/Button.tsx` that the `variant="secondary"` prop exists. If the actual API uses different prop names (e.g. `variant="outline"`), adapt the JSX above to match — do not introduce a new variant just for this component.

- [ ] **Step 2: Verify build**

Run: `cd soso-app && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/components/CommentReplyEditor.tsx
git commit -m "feat(admin): add CommentReplyEditor component"
```

---

## Task 5: `RegistrationManager` Integration

**Files:**
- Modify: `src/features/admin/components/RegistrationManager.tsx`

- [ ] **Step 1: Locate the per-registration row JSX**

Read `RegistrationManager.tsx` and identify where each registration's details are rendered (the row showing family name, food contribution, etc.). The reply editors must be rendered inside that row, after the existing summary content.

- [ ] **Step 2: Import `CommentReplyEditor`**

Add at the top of `RegistrationManager.tsx`:

```ts
import { CommentReplyEditor } from './CommentReplyEditor'
```

- [ ] **Step 3: Render reply editors conditionally**

Inside the per-registration row, after the existing fields, insert:

```tsx
{reg.camping.notes?.trim() && (
  <CommentReplyEditor
    registrationId={reg.id}
    field="campingNotesReply"
    comment={reg.camping.notes}
    reply={reg.campingNotesReply}
    label="Anmerkung Zelten"
  />
)}
{reg.comments?.trim() && (
  <CommentReplyEditor
    registrationId={reg.id}
    field="commentsReply"
    comment={reg.comments}
    reply={reg.commentsReply}
    label="Allgemeine Anmerkung"
  />
)}
```

(Use the actual variable name the file uses for the registration in the map — it may be `registration` or `r`, not `reg`. Match the surrounding code.)

- [ ] **Step 4: Verify build and lint**

```
cd soso-app && npm run build && npm run lint
```

- [ ] **Step 5: Manual UI verification**

1. `npm run dev`
2. Submit a test registration with text in both `Anmerkungen zum Zelten` and the general `Anmerkungen` field.
3. Open the admin dashboard → Anmeldungen.
4. For each comment field on the test registration, confirm: comment is shown, "Antwort schreiben"-Button visible.
5. Click "Antwort schreiben", type text, click Speichern. Confirm: toast appears, button row swaps to "Bearbeiten / Löschen".
6. Reload the page. Confirm: reply persists.
7. Click "Bearbeiten", change text, save. Confirm: new text appears.
8. Click "Löschen", confirm prompt. Confirm: editor returns to "Antwort schreiben" state.
9. Open Audit-Log: confirm entries for set + delete with reasonable summaries.

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/components/RegistrationManager.tsx
git commit -m "feat(admin): show CommentReplyEditor per comment in registration list"
```

---

## Task 6: `ReplyBlock` Shared Display Component

**Files:**
- Create: `src/features/overview/components/ReplyBlock.tsx`

- [ ] **Step 1: Write the component**

```tsx
import type { AdminReply } from '@/lib/firebase/types'

interface ReplyBlockProps {
  reply: AdminReply
}

export function ReplyBlock({ reply }: ReplyBlockProps) {
  return (
    <div className="mt-2 ml-4 rounded-md border-l-4 border-orange-400 bg-orange-50 px-3 py-2 text-sm">
      <div className="text-xs font-semibold text-orange-700">Antwort von Familie Soring</div>
      <div className="mt-1 whitespace-pre-wrap text-stone-800">{reply.text}</div>
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run: `cd soso-app && npm run build`

- [ ] **Step 3: Commit**

```bash
git add src/features/overview/components/ReplyBlock.tsx
git commit -m "feat(overview): add ReplyBlock display component"
```

---

## Task 7: `CampingList` zeigt Antwort

**Files:**
- Modify: `src/features/overview/components/CampingList.tsx`

- [ ] **Step 1: Import `ReplyBlock`**

Add to existing imports:

```ts
import { ReplyBlock } from './ReplyBlock'
```

- [ ] **Step 2: Render reply under existing notes**

Locate the block at line 56–58 that renders `{reg.camping.notes && (...)}`. Directly after that block — still inside the same map iteration — add:

```tsx
{reg.campingNotesReply && <ReplyBlock reply={reg.campingNotesReply} />}
```

- [ ] **Step 3: Verify build**

Run: `cd soso-app && npm run build`

- [ ] **Step 4: Manual UI check**

In the public overview, find the test registration with a saved camping reply. Confirm the reply appears under the notes, visually offset (left border, light background).

- [ ] **Step 5: Commit**

```bash
git add src/features/overview/components/CampingList.tsx
git commit -m "feat(overview): display admin reply under camping notes"
```

---

## Task 8: Neue `CommentsList` Section in der Übersicht

**Files:**
- Create: `src/features/overview/components/CommentsList.tsx`
- Modify: the page that composes the overview sections (locate via `git grep CampingList src/`)

- [ ] **Step 1: Create `CommentsList.tsx`**

```tsx
import { useRegistrationStore } from '@/features/registration/store'
import { ReplyBlock } from './ReplyBlock'

export function CommentsList() {
  const registrations = useRegistrationStore((s) => s.registrations)
  const withComments = registrations.filter((r) => r.comments?.trim() || r.commentsReply)

  if (withComments.length === 0) return null

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold text-stone-800">Anmerkungen</h2>
      <ul className="mt-3 space-y-4">
        {withComments.map((reg) => (
          <li key={reg.id} className="rounded-lg border border-stone-200 bg-white p-4">
            <div className="text-sm font-semibold text-stone-700">{reg.familyName}</div>
            {reg.comments?.trim() && (
              <div className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{reg.comments}</div>
            )}
            {reg.commentsReply && <ReplyBlock reply={reg.commentsReply} />}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

> Match the heading/list styling to the conventions used by `CampingList.tsx`. Adapt classes accordingly if the existing list uses different spacing or typography.

- [ ] **Step 2: Locate the overview composer**

Run from `soso-app/`: `git grep -n "CampingList" src/`. The file that imports and renders `CampingList` is also where `CommentsList` must be mounted.

- [ ] **Step 3: Mount `CommentsList`**

In that file, add the import:

```ts
import { CommentsList } from '@/features/overview/components/CommentsList'
```

Place `<CommentsList />` immediately after `<CampingList />` in the JSX.

- [ ] **Step 4: Verify build**

Run: `cd soso-app && npm run build`

- [ ] **Step 5: Manual UI check**

Open the public overview. Confirm:
- With at least one registration that has `comments` filled: the new "Anmerkungen" section appears under the camping list, listing the family name, comment, and reply (if any).
- With no `comments` anywhere: section is not rendered (no empty heading).

- [ ] **Step 6: Commit**

```bash
git add src/features/overview/components/CommentsList.tsx <overview-composer-file>
git commit -m "feat(overview): add Anmerkungen section showing public comments and replies"
```

---

## Task 9: Hinweis im Formular zur öffentlichen Sichtbarkeit

**Files:**
- Modify: `src/features/registration/components/RegistrationForm.tsx`

- [ ] **Step 1: Locate the `comments` textarea**

Search the file for `comments` (the field bound to `formData.comments`). Identify the surrounding label/helper-text element.

- [ ] **Step 2: Add a visibility hint**

Below the textarea (or as the field's helper text, depending on the form's existing pattern), add:

```tsx
<p className="mt-1 text-xs text-stone-500">
  Hinweis: Anmerkungen werden in der Gäste-Übersicht öffentlich angezeigt. Bitte keine sensiblen Informationen schreiben.
</p>
```

If there's already a helper-text slot, append to it instead of adding a new element. Match the existing helper-text styling.

- [ ] **Step 3: Verify build**

Run: `cd soso-app && npm run build`

- [ ] **Step 4: Manual UI check**

Open the registration form and confirm the hint is visible right under the general `Anmerkungen` textarea.

- [ ] **Step 5: Commit**

```bash
git add src/features/registration/components/RegistrationForm.tsx
git commit -m "feat(form): warn that comments become publicly visible"
```

---

## Task 10: Mail — Replies in `sendEditLinkEmail`

**Files:**
- Modify: `src/lib/firebase/sendConfirmationEmail.ts`

- [ ] **Step 1: Read the existing `sendEditLinkEmail`**

Open `sendConfirmationEmail.ts` around line 143. Identify how `editLink` is built and where the HTML body is assembled.

- [ ] **Step 2: Build a reply HTML helper**

Near the top of the file (after existing helpers like `wrapHtml`), add:

```ts
function renderReplyBlock(label: string, comment: string, replyText: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `
    <div style="margin: 16px 0; padding: 12px 16px; background: #FFF7ED; border-left: 4px solid #F97316; border-radius: 6px;">
      <div style="font-size: 12px; font-weight: 600; color: #C2410C; text-transform: uppercase;">${escape(label)}</div>
      <div style="margin-top: 6px; color: #57534E; white-space: pre-wrap;">"${escape(comment)}"</div>
      <div style="margin-top: 8px; font-weight: 600; color: #1C1917;">→ ${escape(replyText)}</div>
    </div>
  `
}
```

- [ ] **Step 3: Inject reply blocks into `sendEditLinkEmail`**

Inside `sendEditLinkEmail`, before the HTML containing the edit-link button is assembled, build a `repliesHtml` string:

```ts
const repliesHtml = [
  registration.campingNotesReply && registration.camping?.notes
    ? renderReplyBlock('Antwort zu Anmerkung Zelten', registration.camping.notes, registration.campingNotesReply.text)
    : '',
  registration.commentsReply && registration.comments
    ? renderReplyBlock('Antwort zu Anmerkung', registration.comments, registration.commentsReply.text)
    : '',
].join('')
```

Then insert `${repliesHtml}` into the existing HTML template, immediately above the `<a href="${editLink}" …>` button.

- [ ] **Step 4: Verify build**

Run: `cd soso-app && npm run build`

- [ ] **Step 5: Manual mail-render check**

Trigger an Edit-Link mail (via the envelope button on the overview) for a registration that has a saved reply. Open the received mail in a desktop and a mobile client (Apple Mail + Gmail web is enough). Confirm:
- Reply block(s) render with the orange-tinted background and the original quote line.
- For a registration without replies, the mail looks identical to before.

- [ ] **Step 6: Commit**

```bash
git add src/lib/firebase/sendConfirmationEmail.ts
git commit -m "feat(email): include admin replies in edit-link emails"
```

---

## Task 11: Firestore-Rules — strukturelle Validierung der Reply-Felder

**Files:**
- Modify: `firestore.rules`

> **Context:** The current rules do not authenticate users — they only validate field shapes and value ranges. A "real" admin-only restriction would require Firebase Auth, which the project does not use today. This task therefore adds **structural validation only**: if reply fields are present, they must have the correct shape. The behavioural admin-only invariant is enforced in client code (Task 3, Step 5: `updateRegistration` strips reply fields).

- [ ] **Step 1: Extend the `update` rule for `registrations`**

In `firestore.rules`, locate the `match /registrations/{regId}` block. The current `allow update` (lines 34–43) validates a fixed set of fields. Append the following clauses joined with `&&`:

```
&& (!('campingNotesReply' in request.resource.data)
    || (request.resource.data.campingNotesReply.text is string
        && request.resource.data.campingNotesReply.text.size() > 0
        && request.resource.data.campingNotesReply.text.size() <= 1000
        && request.resource.data.campingNotesReply.repliedAt is timestamp))
&& (!('commentsReply' in request.resource.data)
    || (request.resource.data.commentsReply.text is string
        && request.resource.data.commentsReply.text.size() > 0
        && request.resource.data.commentsReply.text.size() <= 1000
        && request.resource.data.commentsReply.repliedAt is timestamp))
```

- [ ] **Step 2: Deploy rules to a non-production project**

If a staging Firebase project is configured: `firebase deploy --only firestore:rules --project <staging>`. Otherwise, run the local Firestore emulator and deploy rules to it for testing. Do **not** deploy to production yet.

- [ ] **Step 3: Manually verify rule behaviour**

Use the Firestore console or a small ad-hoc script:
- Update a registration with valid reply fields → must succeed.
- Update with a reply object missing `text` or with empty `text` → must be rejected.
- Update with `text` longer than 1000 chars → must be rejected.
- Regular update without reply fields → must still succeed (no regression).

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat(rules): structural validation for reply fields on registrations update"
```

- [ ] **Step 5: Defer production deploy**

Do **not** deploy to production from this task. Production deploy happens after all tasks pass review, together with the rest of the change.

---

## Task 12: End-to-End Verification

**Files:** none (verification only)

- [ ] **Step 1: Build and lint clean**

```
cd soso-app && npm run build && npm run lint
```
Expected: both PASS, no errors.

- [ ] **Step 2: Full happy-path walkthrough**

1. Submit a fresh registration as a guest, fill both `camping.notes` and `comments`, provide an email.
2. As admin, open the Anmeldungen list, write replies to both comments.
3. Open the public overview: confirm both replies are visible (camping list + new Anmerkungen section).
4. From the overview, request a new edit-link mail for that registration.
5. Open the received email: confirm both reply blocks are rendered above the edit button.
6. Click the edit link, change a non-reply field, save. Confirm replies are **not** lost.
7. As admin, delete one reply. Confirm it disappears from overview and admin UI; audit log shows the delete entry.

- [ ] **Step 3: Regression check**

- Submit a registration without comments — admin UI shows no reply editors for it.
- Public overview without any replies looks identical to before this change.
- Edit-link mail for a registration without replies looks identical to before.

- [ ] **Step 4: Commit a CHANGELOG entry**

Append to `soso-app/CHANGELOG.md` under the next unreleased version:

```
- Admin-Antworten auf Gast-Kommentare (Zelten + Allgemein), Anzeige in der Übersicht und in Edit-Link-Mails.
```

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): admin replies for guest comments"
```

---

## Self-Review Result

- Spec coverage: every section of the spec maps to at least one task (datenmodell → T1, admin-UI → T4/T5, übersicht → T6/T7/T8, mail → T10, rules → T11, formular-hinweis → T9).
- Placeholder scan: no TBD/TODO; helper-prop adaptations (Button variant, overview composer file) are explicitly framed as small adaptation steps with a fallback instruction.
- Type consistency: `AdminReply`, field names `campingNotesReply` / `commentsReply`, store methods `setReply` / `deleteReply`, and helper `buildReplySummary` are used consistently across all tasks.
- Scope: single feature, no decomposition needed.
