import emailjs from '@emailjs/browser'

const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

interface RegistrationSummary {
  id: string
  contactName: string
  email: string
  familyName: string
  adultsCount: number
  childrenCount: number
  food: {
    bringsCake: boolean
    cakeDescription: string
    bringsSalad: boolean
    saladDescription: string
  }
  camping: {
    wantsCamping: boolean
    tentCount: number
    personCount: number
    notes: string
  }
  comments: string
}

function buildSummaryHtml(reg: RegistrationSummary): string {
  const foodParts: string[] = []
  if (reg.food.bringsCake) {
    foodParts.push(`Kuchen: ${reg.food.cakeDescription}`)
  }
  if (reg.food.bringsSalad) {
    foodParts.push(`Salat: ${reg.food.saladDescription}`)
  }
  const foodSummary =
    foodParts.length > 0
      ? foodParts.join('<br>')
      : 'Nichts &ndash; ist auch v&ouml;llig in Ordnung!'

  let campingSummary = 'Kein Zelten'
  if (reg.camping.wantsCamping) {
    campingSummary = `Ja &ndash; ${reg.camping.tentCount} Zelt${reg.camping.tentCount === 1 ? '' : 'e'}, ${reg.camping.personCount} Person${reg.camping.personCount === 1 ? '' : 'en'}`
    if (reg.camping.notes) {
      campingSummary += `<br><small>${reg.camping.notes}</small>`
    }
  }

  return `
  <div style="background: #FFFBF5; border-radius: 12px; padding: 16px; margin: 20px 0;">
    <p style="margin: 4px 0;"><strong>Haushalt:</strong> ${reg.familyName}</p>
    <p style="margin: 4px 0;"><strong>Erwachsene:</strong> ${reg.adultsCount}</p>
    <p style="margin: 4px 0;"><strong>Kinder:</strong> ${reg.childrenCount}</p>
    <p style="margin: 4px 0;"><strong>Mitgebracht:</strong><br>${foodSummary}</p>
    <p style="margin: 4px 0;"><strong>Zelten:</strong><br>${campingSummary}</p>
    ${reg.comments ? `<p style="margin: 4px 0;"><strong>Anmerkungen:</strong><br>${reg.comments}</p>` : ''}
  </div>`
}

function wrapHtml(content: string): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #44403c;">
  <h2 style="color: #F97316; margin-bottom: 4px;">Sorings Sommerfest</h2>
${content}
</div>`
}

async function sendMail(to: string, subject: string, html: string) {
  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      to_email: to,
      subject,
      message_html: html,
    },
    EMAILJS_PUBLIC_KEY
  )
}

/** Nach erfolgreicher Anmeldung */
export async function sendConfirmationEmail(
  registration: RegistrationSummary,
  accessToken: string
) {
  if (!registration.email?.trim()) return

  const editLink = `${window.location.origin}/?token=${accessToken}&edit=${registration.id}`

  const html = wrapHtml(`
  <p style="color: #a8a29e; margin-top: 0;">Anmeldebest&auml;tigung</p>
  <p>Hallo ${registration.contactName},</p>
  <p>deine Anmeldung wurde erfolgreich gespeichert! Hier eine Zusammenfassung:</p>
  ${buildSummaryHtml(registration)}
  <p>M&ouml;chtest du etwas &auml;ndern? Klicke hier:</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="${editLink}" style="display: inline-block; background: #F97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Anmeldung bearbeiten</a>
  </p>
  <p style="color: #a8a29e; font-size: 12px; margin-top: 32px; border-top: 1px solid #e7e5e4; padding-top: 16px;">
    Du kannst diesen Link auch sp&auml;ter nutzen, um deine Anmeldung zu &auml;ndern oder zur&uuml;ckzuziehen.<br>
    Direktlink: <a href="${editLink}" style="color: #F97316;">${editLink}</a>
  </p>`)

  await sendMail(
    registration.email.trim(),
    'Sorings Sommerfest \u2013 Deine Anmeldung',
    html
  )
}

/** Nach Änderung einer bestehenden Anmeldung */
export async function sendUpdateEmail(
  registration: RegistrationSummary,
  accessToken: string
) {
  if (!registration.email?.trim()) return

  const editLink = `${window.location.origin}/?token=${accessToken}&edit=${registration.id}`

  const html = wrapHtml(`
  <p style="color: #a8a29e; margin-top: 0;">Anmeldung ge&auml;ndert</p>
  <p>Hallo ${registration.contactName},</p>
  <p>deine Anmeldung wurde aktualisiert. Hier der aktuelle Stand:</p>
  ${buildSummaryHtml(registration)}
  <p>Stimmt etwas nicht? Hier kannst du es &auml;ndern:</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="${editLink}" style="display: inline-block; background: #F97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Anmeldung bearbeiten</a>
  </p>`)

  await sendMail(
    registration.email.trim(),
    'Sorings Sommerfest \u2013 Anmeldung ge\u00e4ndert',
    html
  )
}

/** Sendet nur den Bearbeitungslink auf Anfrage */
export async function sendEditLinkEmail(
  registration: Pick<RegistrationSummary, 'id' | 'contactName' | 'email' | 'familyName'>,
  accessToken: string
) {
  if (!registration.email?.trim()) return

  const editLink = `${window.location.origin}/?token=${accessToken}&edit=${registration.id}`

  const html = wrapHtml(`
  <p style="color: #a8a29e; margin-top: 0;">Dein Bearbeitungslink</p>
  <p>Hallo ${registration.contactName},</p>
  <p>du hast einen Bearbeitungslink f&uuml;r deine Anmeldung angefragt. Hier kannst du sie bearbeiten oder zur&uuml;ckziehen:</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="${editLink}" style="display: inline-block; background: #F97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Anmeldung bearbeiten</a>
  </p>
  <p style="color: #a8a29e; font-size: 12px; margin-top: 32px; border-top: 1px solid #e7e5e4; padding-top: 16px;">
    Direktlink: <a href="${editLink}" style="color: #F97316;">${editLink}</a>
  </p>`)

  await sendMail(
    registration.email.trim(),
    'Sorings Sommerfest \u2013 Dein Bearbeitungslink',
    html
  )
}

/** Nach Löschung / Abmeldung */
export async function sendDeletionEmail(
  registration: RegistrationSummary
) {
  if (!registration.email?.trim()) return

  const html = wrapHtml(`
  <p style="color: #a8a29e; margin-top: 0;">Anmeldung zur&uuml;ckgezogen</p>
  <p>Hallo ${registration.contactName},</p>
  <p>deine Anmeldung f&uuml;r <strong>${registration.familyName}</strong> wurde zur&uuml;ckgezogen.</p>
  <p>Folgende Daten waren hinterlegt:</p>
  ${buildSummaryHtml(registration)}
  <p style="color: #a8a29e; font-size: 12px; margin-top: 32px; border-top: 1px solid #e7e5e4; padding-top: 16px;">
    Falls das ein Versehen war, kannst du dich jederzeit erneut anmelden.
  </p>`)

  await sendMail(
    registration.email.trim(),
    'Sorings Sommerfest \u2013 Anmeldung zur\u00fcckgezogen',
    html
  )
}
