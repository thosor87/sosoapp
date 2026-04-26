import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AuditAction, AuditLog } from '@/lib/firebase/types'

export async function writeAuditLog(params: {
  eventId: string
  action: AuditAction
  entityId: string
  familyName: string
  summary: string
  performedBy: 'user' | 'admin'
}) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      eventId: params.eventId,
      action: params.action,
      entityType: 'registration',
      entityId: params.entityId,
      familyName: params.familyName,
      summary: params.summary,
      performedBy: params.performedBy,
      timestamp: serverTimestamp(),
    })
  } catch (err) {
    // Audit log failures are non-critical
    console.error('Audit log write failed:', err)
  }
}

export async function getAuditLogs(eventId: string): Promise<AuditLog[]> {
  const q = query(
    collection(db, 'auditLogs'),
    where('eventId', '==', eventId)
  )
  const snapshot = await getDocs(q)
  const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
  // Sort client-side to avoid composite index requirement
  logs.sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0))
  return logs
}

export async function getAuditLogsForDate(eventId: string, date: Date): Promise<AuditLog[]> {
  const all = await getAuditLogs(eventId)
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  const startTs = Timestamp.fromDate(startOfDay).seconds
  const endTs = Timestamp.fromDate(endOfDay).seconds

  return all
    .filter((l) => {
      const s = l.timestamp?.seconds ?? 0
      return s >= startTs && s <= endTs
    })
    .sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0))
}

export async function getAuditLogsSince(eventId: string, since: Date): Promise<AuditLog[]> {
  const all = await getAuditLogs(eventId)
  const sinceTs = Timestamp.fromDate(since).seconds
  return all
    .filter((l) => (l.timestamp?.seconds ?? 0) > sinceTs)
    .sort((a, b) => (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0))
}

type RegistrationSnapshot = {
  familyName: string
  contactName: string
  email: string
  adultsCount: number
  childrenCount: number
  food: { bringsCake: boolean; cakeDescription: string; bringsSalad: boolean; saladDescription: string; bringsOther?: boolean; otherDescription?: string }
  camping: { wantsCamping: boolean; tentCount: number; personCount: number; notes: string }
  comments: string
}

export function buildRegistrationSummary(data: Pick<RegistrationSnapshot, 'familyName' | 'adultsCount' | 'childrenCount' | 'food' | 'camping'>): string {
  const parts: string[] = [
    `${data.adultsCount} Erw., ${data.childrenCount} Kinder`,
  ]
  if (data.food.bringsCake) parts.push('Kuchen')
  if (data.food.bringsSalad) parts.push('Salat')
  if (data.food.bringsOther && data.food.otherDescription) parts.push(data.food.otherDescription)
  if (data.camping.wantsCamping) parts.push('zeltet')
  return parts.join(' · ')
}

export function buildUpdateSummary(before: RegistrationSnapshot, after: Partial<RegistrationSnapshot>): string {
  const changes: string[] = []

  if (after.familyName !== undefined && after.familyName !== before.familyName)
    changes.push(`Name: ${before.familyName} → ${after.familyName}`)
  if (after.contactName !== undefined && after.contactName !== before.contactName)
    changes.push(`Kontakt: ${before.contactName} → ${after.contactName}`)
  if (after.email !== undefined && after.email !== before.email)
    changes.push('E-Mail geändert')
  if (after.adultsCount !== undefined && after.adultsCount !== before.adultsCount)
    changes.push(`Erwachsene: ${before.adultsCount} → ${after.adultsCount}`)
  if (after.childrenCount !== undefined && after.childrenCount !== before.childrenCount)
    changes.push(`Kinder: ${before.childrenCount} → ${after.childrenCount}`)

  const fb = before.food
  const fa = after.food
  if (fa) {
    if (fa.bringsCake !== undefined && fa.bringsCake !== fb.bringsCake)
      changes.push(fa.bringsCake ? 'Kuchen: hinzugefügt' : 'Kuchen: entfernt')
    else if (fa.bringsCake && fa.cakeDescription !== undefined && fa.cakeDescription !== fb.cakeDescription)
      changes.push(`Kuchen: ${fb.cakeDescription || '–'} → ${fa.cakeDescription}`)
    if (fa.bringsSalad !== undefined && fa.bringsSalad !== fb.bringsSalad)
      changes.push(fa.bringsSalad ? 'Salat: hinzugefügt' : 'Salat: entfernt')
    else if (fa.bringsSalad && fa.saladDescription !== undefined && fa.saladDescription !== fb.saladDescription)
      changes.push(`Salat: ${fb.saladDescription || '–'} → ${fa.saladDescription}`)
    if (fa.bringsOther !== undefined && fa.bringsOther !== fb.bringsOther)
      changes.push(fa.bringsOther ? `Sonstiges: hinzugefügt (${fa.otherDescription ?? ''})` : 'Sonstiges: entfernt')
    else if (fa.bringsOther && fa.otherDescription !== undefined && fa.otherDescription !== fb.otherDescription)
      changes.push(`Sonstiges: ${fb.otherDescription || '–'} → ${fa.otherDescription}`)
  }

  const cb = before.camping
  const ca = after.camping
  if (ca) {
    if (ca.wantsCamping !== undefined && ca.wantsCamping !== cb.wantsCamping)
      changes.push(ca.wantsCamping ? 'Zelten: angemeldet' : 'Zelten: abgemeldet')
    if (ca.wantsCamping && ca.tentCount !== undefined && ca.tentCount !== cb.tentCount)
      changes.push(`Zelte: ${cb.tentCount} → ${ca.tentCount}`)
    if (ca.wantsCamping && ca.personCount !== undefined && ca.personCount !== cb.personCount)
      changes.push(`Personen (Zelt): ${cb.personCount} → ${ca.personCount}`)
  }

  if (after.comments !== undefined && after.comments !== before.comments)
    changes.push('Kommentar geändert')

  return changes.length > 0 ? changes.join(' · ') : 'Keine Änderungen'
}
