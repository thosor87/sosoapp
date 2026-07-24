import type { Timestamp } from 'firebase/firestore'

/** Eine einzelne Quizfrage mit mehreren Antwortmöglichkeiten. */
export interface QuizQuestion {
  /** Stabile ID (für React-Keys & Reihenfolge unabhängig vom Index). */
  id: string
  /** Fragetext. */
  text: string
  /** Antwortmöglichkeiten (üblicherweise 4, min. 2, max. 6). */
  options: string[]
  /** Index der richtigen Antwort innerhalb von `options`. */
  correctIndex: number
}

/** Ein benannter QR-Code für eine Station der Rätsel-Rallye. */
export interface QrCode {
  /** Stabile ID. */
  id: string
  /** Bezeichnung (z. B. „Lichterkette – Team 1"). */
  label: string
  /** Ziel: interner Pfad (z. B. /quiz) oder vollständige URL. */
  url: string
}

/** Vollständige Quiz-Konfiguration (ein Firestore-Dokument). */
export interface QuizConfig {
  /** Überschrift des Quiz. */
  title: string
  /** Einleitungstext auf der Startseite. */
  intro: string
  /** Das Lösungswort, das nach korrektem Durchspielen erscheint. */
  solutionWord: string
  /** Optionale Nachricht, die zusammen mit dem Lösungswort angezeigt wird. */
  solutionMessage: string
  /** Button-Text für den Link zur nächsten Station (für beide Teams gleich). */
  mapsLinkLabel: string
  /** Google-Maps-Link zur nächsten Station – Team 1 (Route /quiz). */
  mapsLinkTeam1: string
  /** Google-Maps-Link zur nächsten Station – Team 2 (Route /quiz2). */
  mapsLinkTeam2: string

  /* ── Foto-Station (/foto) ─────────────────────────────── */
  /** Überschrift der Foto-Station. */
  fotoTitle: string
  /** Einleitungstext der Foto-Station. */
  fotoIntro: string
  /** Lösungswort, das nach dem Upload erscheint. */
  fotoSolutionWord: string
  /** Nachricht, die zusammen mit dem Foto-Lösungswort angezeigt wird. */
  fotoMessage: string
  /** Button-Text für den Link zur nächsten Station. */
  fotoNextLabel: string
  /** Ziel des Weiter-Buttons (z. B. /quiz2 oder eine vollständige URL). */
  fotoNextUrl: string
  /** Hinweistext unter dem Weiter-Button (what3words-Kontext). */
  fotoNote: string

  /** Frei konfigurierbare QR-Codes für die Rätsel-Rallye (zum Ausdrucken). */
  qrCodes: QrCode[]

  /** SHA-256-Hash (hex) des Admin-Passworts. */
  adminPasswordHash: string
  /** Die Fragen (Standard: 6). */
  questions: QuizQuestion[]
  /** Zeitpunkt der letzten Änderung. */
  updatedAt?: Timestamp
}
