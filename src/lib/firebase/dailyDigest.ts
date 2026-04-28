import emailjs from '@emailjs/browser'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { getAuditLogsForDate } from '@/lib/firebase/auditLog'
import type { AuditLog } from '@/lib/firebase/types'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function buildDigestHtml(logs: AuditLog[], date: Date): string {
  const dateStr = date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const actionLabel = (action: string) => {
    if (action === 'create') return '✅ Neu'
    if (action === 'update') return '✏️ Geändert'
    if (action === 'delete') return '🗑️ Zurückgezogen'
    if (action === 'restore') return '↩️ Wiederhergestellt'
    return action
  }

  const rows = logs
    .map(
      (log) =>
        `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;">${actionLabel(log.action)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;font-weight:600;">${log.familyName}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;color:#78716c;">${log.summary}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f4;color:#a8a29e;font-size:12px;">${
            log.timestamp?.toDate?.()?.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) ?? ''
          }</td>
        </tr>`
    )
    .join('')

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#44403c;">
  <h2 style="color:#F97316;margin-bottom:4px;">Sorings Sommerfest</h2>
  <p style="color:#a8a29e;margin-top:0;">Tagesrückblick – ${dateStr}</p>
  <p>${logs.length} Änderung${logs.length === 1 ? '' : 'en'} heute:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <thead>
      <tr style="background:#fafaf9;">
        <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Aktion</th>
        <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Familie</th>
        <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Details</th>
        <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Uhrzeit</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#a8a29e;font-size:12px;margin-top:32px;border-top:1px solid #e7e5e4;padding-top:16px;">
    Diese Mail wurde automatisch generiert (SoSo-App).
  </p>
</div>`
}

export async function checkAndSendDailyDigest(eventId: string, adminEmail?: string): Promise<void> {
  const recipient = adminEmail?.trim() || import.meta.env.VITE_ADMIN_EMAIL
  if (!recipient || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) return

  const today = todayKey()
  const metaRef = doc(db, 'adminMeta', eventId)

  try {
    const metaSnap = await getDoc(metaRef)
    const lastDigestDate: string = metaSnap.data()?.lastDigestDate ?? ''

    if (lastDigestDate === today) return // already sent today

    const todayLogs = await getAuditLogsForDate(eventId, new Date())
    if (todayLogs.length === 0) return // nothing to report

    const html = buildDigestHtml(todayLogs, new Date())

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        to_email: recipient,
        subject: `Sorings Sommerfest – Tagesrückblick ${today}`,
        message_html: html,
      },
      EMAILJS_PUBLIC_KEY
    )

    await setDoc(metaRef, { lastDigestDate: today }, { merge: true })
  } catch (err) {
    console.error('Daily digest failed:', err)
  }
}
