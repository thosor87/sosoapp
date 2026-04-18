import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
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
    where('eventId', '==', eventId),
    orderBy('timestamp', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}

export async function getAuditLogsForDate(eventId: string, date: Date): Promise<AuditLog[]> {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const q = query(
    collection(db, 'auditLogs'),
    where('eventId', '==', eventId),
    where('timestamp', '>=', Timestamp.fromDate(start)),
    where('timestamp', '<=', Timestamp.fromDate(end)),
    orderBy('timestamp', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}

export function buildRegistrationSummary(data: {
  familyName: string
  adultsCount: number
  childrenCount: number
  food: { bringsCake: boolean; bringsSalad: boolean; bringsOther?: boolean; otherDescription?: string }
  camping: { wantsCamping: boolean }
}): string {
  const parts: string[] = [
    `${data.adultsCount} Erw., ${data.childrenCount} Kinder`,
  ]
  if (data.food.bringsCake) parts.push('Kuchen')
  if (data.food.bringsSalad) parts.push('Salat')
  if (data.food.bringsOther && data.food.otherDescription) parts.push(data.food.otherDescription)
  if (data.camping.wantsCamping) parts.push('zeltet')
  return parts.join(' · ')
}
