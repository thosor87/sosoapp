import type { QuizQuestion, QrCode } from './types'

/** Firestore-Dokument-ID des Quiz. */
export const QUIZ_DOC_ID = 'wedding'

/** Standard-Admin-Passwort (kann in der Admin-Oberfläche geändert werden). */
export const DEFAULT_ADMIN_PASSWORD = 'trauung'

export const DEFAULT_TITLE = 'Ja?Wort – Das Hochzeitsquiz'

export const DEFAULT_INTRO =
  'Willkommen zur Hochzeit von Birgit & Thomas! 🎉\n\n' +
  'Beantwortet die sechs Fragen richtig, um das Lösungswort zu erhalten. ' +
  'Keine Sorge – ihr könnt so oft raten, wie ihr möchtet.'

export const DEFAULT_SOLUTION_WORD = 'LIEBE'

export const DEFAULT_SOLUTION_MESSAGE =
  'Herzlichen Glückwunsch – ihr habt es geschafft! 💍'

export const DEFAULT_MAPS_LABEL = 'Weiter zur nächsten Station 📍'

/* ── Foto-Station (/foto) ─────────────────────────────────── */
export const DEFAULT_FOTO_TITLE = 'Foto-Station 📸'
export const DEFAULT_FOTO_INTRO =
  'Ladet hier ein gemeinsames Foto von euch hoch – danach bekommt ihr euer nächstes Lösungswort.'
export const DEFAULT_FOTO_SOLUTION_WORD = 'FREUDE'
export const DEFAULT_FOTO_MESSAGE = 'Super – euer Foto ist gespeichert! 📸'
export const DEFAULT_FOTO_NEXT_LABEL = 'Weiter zum Quiz'
export const DEFAULT_FOTO_NEXT_URL = '/quiz2'
export const DEFAULT_FOTO_NOTE =
  'Das Quiz müsst ihr natürlich nur ausfüllen, wenn ihr schon drei Wörter beisammen habt. 😉'

/* ── Sprachnachricht-Stationen (/see1, /see2) ─────────────── */
export const DEFAULT_SEE1_TITLE = 'Sprachnachricht 🔊'
export const DEFAULT_SEE1_TEXT =
  'Hört euch die Nachricht an – sie verrät euch, wohin es weitergeht.'
export const DEFAULT_SEE2_TITLE = 'Sprachnachricht 🔊'
export const DEFAULT_SEE2_TEXT =
  'Hört euch die Nachricht an – sie verrät euch, wohin es weitergeht.'

/**
 * Zusätzliche (externe) QR-Codes, deren Ziele ihr selbst eintragt (Maps-Links).
 * App-interne QR-Codes (Quiz 1/2, Foto, See 1/2) sind fest und müssen nicht
 * eingegeben werden.
 */
export const DEFAULT_QR_CODES: QrCode[] = [
  { id: 'lk2', label: 'Lichterkette – Team 2 → See 2 (Maps)', url: '' },
  { id: 'buch', label: 'Buch (Brücke) → Rutsche (Maps)', url: '' },
]

/**
 * Beispiel-Fragen als Platzhalter. Können vollständig über die
 * Admin-Oberfläche geändert werden.
 */
export const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    text: 'Wo haben sich Birgit und Thomas kennengelernt?',
    options: ['Auf der Arbeit', 'Im Urlaub', 'Über Freunde', 'Beim Sport'],
    correctIndex: 0,
  },
  {
    id: 'q2',
    text: 'Was war das erste gemeinsame Reiseziel?',
    options: ['Italien', 'Norwegen', 'Spanien', 'Österreich'],
    correctIndex: 1,
  },
  {
    id: 'q3',
    text: 'Welches Haustier haben die beiden?',
    options: ['Katze', 'Hund', 'Kaninchen', 'Keins'],
    correctIndex: 1,
  },
  {
    id: 'q4',
    text: 'Wie lange sind Birgit und Thomas schon ein Paar?',
    options: ['3 Jahre', '5 Jahre', '8 Jahre', '10 Jahre'],
    correctIndex: 2,
  },
  {
    id: 'q5',
    text: 'Was ist das gemeinsame Lieblingsessen?',
    options: ['Pizza', 'Sushi', 'Pasta', 'Burger'],
    correctIndex: 2,
  },
  {
    id: 'q6',
    text: 'Wer hat den Heiratsantrag gemacht?',
    options: ['Thomas', 'Birgit', 'Beide gleichzeitig', 'Ein Freund'],
    correctIndex: 0,
  },
]

/**
 * Alle konfigurierbaren Standard-Felder (ohne Passwort/Timestamp).
 * Dient sowohl dem Erst-Seed als auch dem Backfill fehlender Felder in
 * bestehenden Dokumenten.
 */
export const DEFAULT_CONFIG_FIELDS = {
  title: DEFAULT_TITLE,
  intro: DEFAULT_INTRO,
  solutionWord: DEFAULT_SOLUTION_WORD,
  solutionMessage: DEFAULT_SOLUTION_MESSAGE,
  mapsLinkLabel: DEFAULT_MAPS_LABEL,
  mapsLinkTeam1: '',
  mapsLinkTeam2: '',
  fotoTitle: DEFAULT_FOTO_TITLE,
  fotoIntro: DEFAULT_FOTO_INTRO,
  fotoSolutionWord: DEFAULT_FOTO_SOLUTION_WORD,
  fotoMessage: DEFAULT_FOTO_MESSAGE,
  fotoNextLabel: DEFAULT_FOTO_NEXT_LABEL,
  fotoNextUrl: DEFAULT_FOTO_NEXT_URL,
  fotoNote: DEFAULT_FOTO_NOTE,
  see1Title: DEFAULT_SEE1_TITLE,
  see1Text: DEFAULT_SEE1_TEXT,
  see2Title: DEFAULT_SEE2_TITLE,
  see2Text: DEFAULT_SEE2_TEXT,
  qrCodes: DEFAULT_QR_CODES,
  questions: DEFAULT_QUESTIONS,
} as const
