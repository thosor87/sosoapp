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
  /** SHA-256-Hash (hex) des Admin-Passworts. */
  adminPasswordHash: string
  /** Die Fragen (Standard: 6). */
  questions: QuizQuestion[]
  /** Zeitpunkt der letzten Änderung. */
  updatedAt?: Timestamp
}
