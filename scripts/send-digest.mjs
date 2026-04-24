// Daily digest: fetches audit logs since last run, sends via EmailJS HTTP API.
// Called from CI: node scripts/send-digest.mjs
import admin from 'firebase-admin'

const SA = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY
const ADMIN_EMAIL = process.env.ADMIN_EMAIL

const missing = [
  !EMAILJS_SERVICE_ID && 'EMAILJS_SERVICE_ID',
  !EMAILJS_TEMPLATE_ID && 'EMAILJS_TEMPLATE_ID',
  !EMAILJS_PUBLIC_KEY && 'EMAILJS_PUBLIC_KEY',
  !ADMIN_EMAIL && 'ADMIN_EMAIL',
].filter(Boolean)
if (missing.length > 0) {
  console.log('Missing env vars:', missing.join(', '))
  process.exit(0)
}

admin.initializeApp({ credential: admin.credential.cert(SA) })
const db = admin.firestore()

const today = new Date().toISOString().slice(0, 10)

// Read last digest date from Firestore (shared across browser + CI)
const metaRef = db.collection('adminMeta').doc('ci-digest')
const metaSnap = await metaRef.get()
const lastDigestDate = metaSnap.exists ? (metaSnap.data()?.lastDigestDate ?? '') : ''
console.log('Last digest date:', lastDigestDate || '(never)')

if (lastDigestDate === today) {
  console.log('Already sent today.')
  process.exit(0)
}

// Find active event (isRegistrationOpen = true)
const eventsSnap = await db.collection('events').where('isRegistrationOpen', '==', true).limit(1).get()
if (eventsSnap.empty) {
  console.log('No active event found.')
  await metaRef.set({ lastDigestDate: today }, { merge: true })
  process.exit(0)
}
const eventDoc = eventsSnap.docs[0]
const eventId = eventDoc.id
const adminEmail = eventDoc.data()?.adminEmail || ADMIN_EMAIL
console.log('Event:', eventId, '| Recipient:', adminEmail)

// Fetch all audit logs for this event
const logsSnap = await db.collection('auditLogs').where('eventId', '==', eventId).get()

// Filter: since end of last digest day (or last 30 days on first run)
const since = lastDigestDate
  ? new Date(lastDigestDate + 'T23:59:59Z')
  : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

const logs = logsSnap.docs
  .map(d => ({ ...d.data(), id: d.id }))
  .filter(l => {
    const ts = l.timestamp?.toDate?.() ?? null
    return ts && ts > since
  })
  .sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate())

console.log('Logs to send:', logs.length)

if (logs.length === 0) {
  await metaRef.set({ lastDigestDate: today }, { merge: true })
  console.log('No new logs.')
  process.exit(0)
}

// Build HTML – grouped by date
const CEST = 2 // UTC+2 for summer
const actionLabel = a => ({ create: '✅ Neu', update: '✏️ Geändert', delete: '🗑️ Gelöscht' }[a] ?? a)

const MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const DAYS = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag']
function fmtDate(d) {
  return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
function fmtTime(d) {
  const h = d.getUTCHours() + CEST
  return `${String(h % 24).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`
}

const byDay = new Map()
for (const log of logs) {
  const d = log.timestamp.toDate()
  const key = new Date(d.getTime() + CEST * 3600000).toISOString().slice(0, 10)
  if (!byDay.has(key)) byDay.set(key, [])
  byDay.get(key).push(log)
}

const sections = [...byDay.entries()].sort(([a],[b]) => a.localeCompare(b)).map(([day, dayLogs]) => {
  const dayDate = new Date(day + 'T12:00:00Z')
  const header = byDay.size > 1
    ? `<h3 style="color:#78716c;font-size:14px;margin:24px 0 8px;">${fmtDate(dayDate)}</h3>`
    : ''
  const rows = dayLogs.map(l =>
    `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;">${actionLabel(l.action)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;font-weight:600;">${l.familyName}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;color:#78716c;">${l.summary ?? ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;color:#a8a29e;font-size:12px;">${fmtTime(l.timestamp.toDate())}</td>
    </tr>`
  ).join('')
  return `${header}<table style="width:100%;border-collapse:collapse;margin:0 0 8px;"><thead><tr style="background:#fafaf9;"><th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Aktion</th><th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Familie</th><th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Details</th><th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Uhrzeit</th></tr></thead><tbody>${rows}</tbody></table>`
}).join('')

const fromDay = [...byDay.keys()].sort()[0]
const fromDate = new Date(fromDay + 'T12:00:00Z')
const toDate = new Date(today + 'T12:00:00Z')
const period = fromDay === today
  ? `Tagesrückblick – ${fmtDate(toDate)}`
  : `Rückblick ${fmtDate(fromDate)} – ${fmtDate(toDate)}`
const subject = fromDay === today
  ? `Sorings Sommerfest – Tagesrückblick ${today}`
  : `Sorings Sommerfest – Rückblick ${fromDay} bis ${today}`

const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#44403c;">
<h2 style="color:#F97316;margin-bottom:4px;">Sorings Sommerfest</h2>
<p style="color:#a8a29e;margin-top:0;">${period}</p>
<p>${logs.length} Änderung${logs.length === 1 ? '' : 'en'}${byDay.size > 1 ? ` in ${byDay.size} Tagen` : ''}:</p>
${sections}
<p style="color:#a8a29e;font-size:12px;margin-top:32px;border-top:1px solid #e7e5e4;padding-top:16px;">Diese Mail wurde automatisch generiert (SoSo-App).</p>
</div>`

// Send via EmailJS HTTP API
const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PUBLIC_KEY,
    template_params: { to_email: adminEmail, subject, message_html: html },
  }),
})
console.log('EmailJS:', res.status, await res.text())
if (!res.ok) {
  console.error('EmailJS failed – check if "Block headless browsers" is disabled in EmailJS account settings.')
  process.exit(1)
}

await metaRef.set({ lastDigestDate: today }, { merge: true })
console.log('Digest sent successfully.')
