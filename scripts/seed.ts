/**
 * Seed-Script: Erstellt das initiale Event-Dokument in Firestore.
 * Ausführen: npx tsx scripts/seed.ts
 */
import { initializeApp } from 'firebase/app'
import { initializeFirestore, doc, setDoc, Timestamp } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'CHANGE_ME',
  authDomain: 'CHANGE_ME',
  projectId: 'sosoapp-party',
  storageBucket: 'CHANGE_ME',
  messagingSenderId: 'CHANGE_ME',
  appId: '1:CHANGE_ME:web:5e0c1b61eb928d65f7a696',
}

const app = initializeApp(firebaseConfig)
// Force long polling for Node.js environment (gRPC has issues outside browser)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
})

async function seed() {
  console.log('Seeding Firestore...')

  // Create the initial event document
  const eventRef = doc(db, 'events', 'sommer2026')
  await setDoc(eventRef, {
    year: 2026,
    title: 'Sorings Sommerfest 2026',
    date: Timestamp.fromDate(new Date('2026-07-18T14:00:00')),
    location: 'Bei Familie Soring',
    accessToken: 'CHANGE_ME',
    adminPasswordHash: 'CHANGE_ME',
    announcements: [
      {
        id: 'welcome',
        title: 'Willkommen!',
        content:
          'Schön, dass ihr dabei seid! Meldet euch an und gebt an, was ihr mitbringt.',
        type: 'highlight',
        order: 0,
        isVisible: true,
      },
      {
        id: 'zelten-info',
        title: 'Zelten möglich!',
        content:
          'Dieses Jahr könnt ihr auch über Nacht bleiben. Gebt einfach bei der Anmeldung an, ob ihr zelten möchtet.',
        type: 'info',
        order: 1,
        isVisible: true,
      },
    ],
    isRegistrationOpen: true,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  })

  console.log('✅ Event "sommer2026" erstellt!')
  console.log('')
  console.log('Zugangsdaten:')
  console.log('  URL:           https://sosoapp-party.web.app/?token=DEIN_TOKEN')
  console.log('  Admin-Passwort: DEIN_PASSWORT')
  console.log('')

  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Fehler beim Seeding:', err)
  process.exit(1)
})
