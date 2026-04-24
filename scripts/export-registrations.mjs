/**
 * Export-Script: Liest alle Anmeldungen aus Firestore und schreibt eine CSV-Datei.
 * Wird von der GitHub Actions Backup-Pipeline täglich ausgeführt.
 *
 * Ausführen: node scripts/export-registrations.mjs
 * Benötigt: FIREBASE_SERVICE_ACCOUNT (JSON-String) als Umgebungsvariable
 */
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { writeFileSync, mkdirSync } from 'fs'

// Firebase Admin initialisieren
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

function escapeCsv(value) {
  const str = String(value ?? '')
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function exportRegistrations() {
  console.log('Lese Anmeldungen aus Firestore...')

  const snapshot = await db.collection('registrations').get()

  if (snapshot.empty) {
    console.log('Keine Anmeldungen vorhanden.')
    process.exit(0)
  }

  const headers = [
    'Haushalt/Familie',
    'Ansprechpartner',
    'E-Mail',
    'Erwachsene',
    'Kinder',
    'Gesamt',
    'Kuchen',
    'Kuchen-Beschreibung',
    'Salat',
    'Salat-Beschreibung',
    'Sonstiges',
    'Sonstiges-Beschreibung',
    'Zelten',
    'Zelte',
    'Zelten-Notizen',
    'Anmerkungen',
    'Angemeldet am',
    'Zuletzt geändert',
  ]

  const formatDate = (ts) =>
    ts?.toDate?.()
      ? ts.toDate().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : ''

  const rows = snapshot.docs.map((doc) => {
    const r = doc.data()
    return [
      r.familyName,
      r.contactName,
      r.email,
      r.adultsCount,
      r.childrenCount,
      (r.adultsCount || 0) + (r.childrenCount || 0),
      r.food?.bringsCake ? 'Ja' : 'Nein',
      r.food?.cakeDescription,
      r.food?.bringsSalad ? 'Ja' : 'Nein',
      r.food?.saladDescription,
      r.food?.bringsOther ? 'Ja' : 'Nein',
      r.food?.otherDescription,
      r.camping?.wantsCamping ? 'Ja' : 'Nein',
      r.camping?.tentCount,
      r.camping?.notes,
      r.comments,
      formatDate(r.createdAt),
      formatDate(r.updatedAt),
    ].map(escapeCsv)
  })

  const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')

  // Ausgabe-Verzeichnis: soso-app/sommer2026/
  mkdirSync('backup-output/soso-app/sommer2026', { recursive: true })

  const filename = 'backup-output/soso-app/sommer2026/anmeldungen.csv'
  writeFileSync(filename, '\uFEFF' + csv, 'utf-8') // BOM for Excel

  console.log(`${snapshot.size} Anmeldungen exportiert → ${filename}`)
}

exportRegistrations().catch((err) => {
  console.error('Fehler beim Export:', err)
  process.exit(1)
})
