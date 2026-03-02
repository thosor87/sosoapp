import { addDoc, collection } from 'firebase/firestore'
import { db } from './config'

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

export async function sendConfirmationEmail(
  registration: RegistrationSummary,
  accessToken: string
) {
  if (!registration.email?.trim()) return

  const editLink = `${window.location.origin}/?token=${accessToken}&edit=${registration.id}`

  // Essen-Zusammenfassung
  const foodParts: string[] = []
  if (registration.food.bringsCake) {
    foodParts.push(`Kuchen: ${registration.food.cakeDescription}`)
  }
  if (registration.food.bringsSalad) {
    foodParts.push(`Salat: ${registration.food.saladDescription}`)
  }
  const foodSummary =
    foodParts.length > 0
      ? foodParts.join('<br>')
      : 'Nichts &ndash; ist auch v&ouml;llig in Ordnung!'

  // Zelten-Zusammenfassung
  let campingSummary = 'Kein Zelten'
  if (registration.camping.wantsCamping) {
    campingSummary = `Ja &ndash; ${registration.camping.tentCount} Zelt${registration.camping.tentCount === 1 ? '' : 'e'}, ${registration.camping.personCount} Person${registration.camping.personCount === 1 ? '' : 'en'}`
    if (registration.camping.notes) {
      campingSummary += `<br><small>${registration.camping.notes}</small>`
    }
  }

  const htmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #44403c;">
  <h2 style="color: #F97316; margin-bottom: 4px;">Sorings Sommerfest</h2>
  <p style="color: #a8a29e; margin-top: 0;">Anmeldebest&auml;tigung</p>

  <p>Hallo ${registration.contactName},</p>
  <p>deine Anmeldung wurde erfolgreich gespeichert! Hier eine Zusammenfassung:</p>

  <div style="background: #FFFBF5; border-radius: 12px; padding: 16px; margin: 20px 0;">
    <p style="margin: 4px 0;"><strong>Haushalt:</strong> ${registration.familyName}</p>
    <p style="margin: 4px 0;"><strong>Erwachsene:</strong> ${registration.adultsCount}</p>
    <p style="margin: 4px 0;"><strong>Kinder:</strong> ${registration.childrenCount}</p>
    <p style="margin: 4px 0;"><strong>Mitgebracht:</strong><br>${foodSummary}</p>
    <p style="margin: 4px 0;"><strong>Zelten:</strong><br>${campingSummary}</p>
    ${registration.comments ? `<p style="margin: 4px 0;"><strong>Anmerkungen:</strong><br>${registration.comments}</p>` : ''}
  </div>

  <p>M&ouml;chtest du etwas &auml;ndern? Klicke hier:</p>
  <p style="text-align: center; margin: 24px 0;">
    <a href="${editLink}" style="display: inline-block; background: #F97316; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Anmeldung bearbeiten</a>
  </p>

  <p style="color: #a8a29e; font-size: 12px; margin-top: 32px; border-top: 1px solid #e7e5e4; padding-top: 16px;">
    Du kannst diesen Link auch sp&auml;ter nutzen, um deine Anmeldung zu &auml;ndern oder zur&uuml;ckzuziehen.<br>
    Direktlink: <a href="${editLink}" style="color: #F97316;">${editLink}</a>
  </p>
</div>
  `.trim()

  await addDoc(collection(db, 'mail'), {
    to: [registration.email.trim()],
    message: {
      subject: 'Sorings Sommerfest \u2013 Deine Anmeldung',
      html: htmlBody,
    },
  })
}
