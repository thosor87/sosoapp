import emailjs from '@emailjs/browser'
import { getAuditLogsSince } from '@/lib/firebase/auditLog'
import type { AuditLog } from '@/lib/firebase/types'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function actionLabel(action: string): string {
  if (action === 'create') return '✅ Neu'
  if (action === 'update') return '✏️ Geändert'
  if (action === 'delete') return '🗑️ Gelöscht'
  return action
}

function buildDigestHtml(logs: AuditLog[], fromDate: string, toDate: string): string {
  // Group logs by date (YYYY-MM-DD)
  const byDay = new Map<string, AuditLog[]>()
  for (const log of logs) {
    const d = log.timestamp?.toDate?.() ?? new Date()
    const key = d.toISOString().slice(0, 10)
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(log)
  }

  const periodLabel =
    fromDate === toDate
      ? `Tagesrückblick – ${dateLabel(new Date(toDate + 'T12:00:00'))}`
      : `Rückblick ${dateLabel(new Date(fromDate + 'T12:00:00'))} – ${dateLabel(new Date(toDate + 'T12:00:00'))}`

  const sections = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, dayLogs]) => {
      const rows = dayLogs
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

      const header =
        byDay.size > 1
          ? `<h3 style="color:#78716c;font-size:14px;margin:24px 0 8px;">${dateLabel(new Date(day + 'T12:00:00'))}</h3>`
          : ''

      return `${header}
        <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
          <thead>
            <tr style="background:#fafaf9;">
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Aktion</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Familie</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Details</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#78716c;font-weight:600;">Uhrzeit</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>`
    })
    .join('')

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#44403c;">
  <h2 style="color:#F97316;margin-bottom:4px;">Sorings Sommerfest</h2>
  <p style="color:#a8a29e;margin-top:0;">${periodLabel}</p>
  <p>${logs.length} Änderung${logs.length === 1 ? '' : 'en'}${byDay.size > 1 ? ` in ${byDay.size} Tagen` : ''}:</p>
  ${sections}
  <p style="color:#a8a29e;font-size:12px;margin-top:32px;border-top:1px solid #e7e5e4;padding-top:16px;">
    Diese Mail wurde automatisch generiert (SoSo-App).
  </p>
</div>`
}

export async function checkAndSendDailyDigest(eventId: string, adminEmail?: string): Promise<void> {
  const recipient = adminEmail?.trim() || import.meta.env.VITE_ADMIN_EMAIL
  if (!recipient || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) return

  const today = todayKey()
  const storageKey = `soso-digest-date-${eventId}`

  try {
    const lastDigestDate = localStorage.getItem(storageKey) ?? ''
    if (lastDigestDate === today) return // already sent today

    // Fetch all logs since end of last digest day (or last 30 days if no previous digest)
    const since = lastDigestDate
      ? new Date(lastDigestDate + 'T23:59:59')
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const logs = await getAuditLogsSince(eventId, since)
    if (logs.length === 0) {
      localStorage.setItem(storageKey, today)
      return
    }

    const fromDate = logs[0].timestamp?.toDate?.()?.toISOString().slice(0, 10) ?? today
    const html = buildDigestHtml(logs, fromDate, today)

    const subject =
      fromDate === today
        ? `Sorings Sommerfest – Tagesrückblick ${today}`
        : `Sorings Sommerfest – Rückblick ${fromDate} bis ${today}`

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      { to_email: recipient, subject, message_html: html },
      EMAILJS_PUBLIC_KEY
    )

    localStorage.setItem(storageKey, today)
  } catch (err) {
    console.error('Daily digest failed:', err)
  }
}
