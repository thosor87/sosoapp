import type { QuizQuestion } from './types'

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
