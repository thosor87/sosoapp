# Admin-Antworten auf Gast-Kommentare

**Datum:** 2026-05-05
**Status:** Spec genehmigt, bereit für Implementierungsplan

## Ziel

Admins können auf Gast-Kommentare aus dem Anmeldeformular antworten. Antworten erscheinen öffentlich in der Gäste-Übersicht und werden bei der nächsten Edit-Link-Mail mitgeschickt.

## Hintergrund

Beim Anmeldeformular gibt es zwei freie Textfelder:
- `Registration.camping.notes` — Anmerkungen zum Zelten (in Übersicht öffentlich sichtbar)
- `Registration.comments` — allgemeine Anmerkungen (bisher nur im Admin-Bereich sichtbar)

Gäste schreiben dort Fragen oder Hinweise, auf die das Admin-Team aktuell nur außerhalb der App reagieren kann. Eine Antwortfunktion direkt in der App fehlt.

## Privacy-Constraint

E-Mails der Gäste werden nur als SHA-256-Hash gespeichert ([privateData.ts](../../../src/lib/firebase/privateData.ts)). Direkter Mail-Versand an einen Gast ist daher nicht möglich, ohne die Privacy-Architektur zu brechen. Daraus folgt: Antworten werden **in der Übersicht** angezeigt und nur dann per Mail transportiert, wenn der Gast selbst einen Edit-Link anfordert (Hybrid-Ansatz).

## Datenmodell

In [types.ts](../../../src/lib/firebase/types.ts):

```ts
export interface AdminReply {
  text: string
  repliedAt: Timestamp
  repliedBy?: string
}

export interface Registration {
  // ... bestehende Felder
  campingNotesReply?: AdminReply
  commentsReply?: AdminReply
}
```

Beide Reply-Felder optional. `repliedBy` optional für spätere Erweiterung (z. B. mehrere Admin-Accounts).

Bearbeiten überschreibt das Feld, Löschen entfernt es.

## Admin-UI

In [RegistrationManager.tsx](../../../src/features/admin/components/RegistrationManager.tsx):

Pro Anmeldung, falls `camping.notes` oder `comments` befüllt sind, wird unter dem jeweiligen Kommentar ein Antwort-Bereich angezeigt:

- **Ohne bestehende Antwort:** Textarea + „Antwort speichern"-Button
- **Mit bestehender Antwort:** Antwort-Text, „Bearbeiten"- und „Löschen"-Button

Jede Aktion (Create / Update / Delete einer Antwort) erzeugt einen Audit-Log-Eintrag über [auditLog.ts](../../../src/lib/firebase/auditLog.ts) mit `performedBy: 'admin'`.

## Übersicht-UI

### Camping-Liste

In [CampingList.tsx](../../../src/features/overview/components/CampingList.tsx) wird unter dem bestehenden Notes-Block die Antwort als visuell abgesetzter, eingerückter Block angezeigt — z. B. mit Label „Antwort von Familie Soring:" und farblich hervorgehoben.

### Neue Anmerkungen-Section

Eine neue Section auf der Übersichtsseite zeigt alle Anmeldungen, deren `Registration.comments` befüllt ist (analog zur Camping-Liste). Pro Eintrag: Familienname, Kommentar, ggf. Antwort darunter. Section wird nur gerendert, wenn mindestens ein Eintrag existiert.

Das Feld `comments` wird damit erstmals öffentlich sichtbar — Gäste sollten daraufhin im Formular einen entsprechenden Hinweis sehen (siehe „Offene Punkte").

## Mail-Integration

`sendEditLinkEmail` in [sendConfirmationEmail.ts](../../../src/lib/firebase/sendConfirmationEmail.ts) wird erweitert: Falls `campingNotesReply` oder `commentsReply` existieren, wird ein Block oberhalb des Edit-Buttons eingefügt:

> **Antwort auf deinen Kommentar zum Zelten:**
> „[Original-Kommentar]"
> → [Antwort-Text]

Kein neuer Mail-Trigger — Antworten werden nur transportiert, wenn der Gast ohnehin einen Edit-Link anfordert.

## Firestore-Rules

In `firestore.rules` muss sichergestellt sein, dass `campingNotesReply` und `commentsReply` ausschließlich durch authentifizierte Admins geschrieben werden können. Updates über öffentliche Pfade (Gast bearbeitet eigene Anmeldung) müssen diese Felder explizit ausklammern, damit sie nicht überschrieben oder injiziert werden können.

## Komponenten-Übersicht

| Bereich | Datei | Änderung |
|---|---|---|
| Datenmodell | `src/lib/firebase/types.ts` | `AdminReply`-Interface, zwei neue optionale Felder an `Registration` |
| Admin-UI | `src/features/admin/components/RegistrationManager.tsx` | Antwort-Editor pro Kommentarfeld |
| Store/Mutationen | `src/features/registration/store.ts` | Neue Aktionen `setReply` / `deleteReply` mit Audit-Log |
| Übersicht Camping | `src/features/overview/components/CampingList.tsx` | Reply-Anzeige unter Notes |
| Übersicht Anmerkungen | `src/features/overview/components/` (neue Datei) | Neue Liste für `comments` + Replies |
| Mail | `src/lib/firebase/sendConfirmationEmail.ts` | Reply-Block in `sendEditLinkEmail` |
| Rules | `firestore.rules` | Reply-Felder admin-only |

## Offene Punkte (für Implementierungsplan zu klären)

- **Hinweis im Formular**, dass `comments` jetzt in der Übersicht sichtbar werden — Wording und Platzierung
- Visueller Stil der Reply-Anzeige (Farbe, Label) — Abstimmung mit bestehendem Look
- Maximale Länge der Antwort (Textarea-Validierung)

## Nicht im Scope

- Mehrere Admin-Antworten je Kommentar (Thread)
- Antworten durch andere Gäste (öffentlicher Diskussionsfaden)
- Push-Benachrichtigung an Gast bei neuer Antwort
- Plaintext-Speicherung der Mail für direkten Reply-Versand
