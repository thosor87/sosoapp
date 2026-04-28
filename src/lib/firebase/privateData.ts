import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { sha256hex } from '@/lib/utils/sha256'

const contactRef = (regId: string) =>
  doc(db, 'registrations', regId, 'private', 'contact')

/** Stores only a SHA-256 hash of the email — plaintext is never persisted. */
export async function setPrivateEmailHash(regId: string, email: string): Promise<void> {
  const emailHash = await sha256hex(email.trim().toLowerCase())
  await setDoc(contactRef(regId), { emailHash })
}

/**
 * Checks whether the given email matches the stored hash.
 * Falls back to plaintext comparison for legacy docs that were created
 * before hashing was introduced (will self-migrate on next update).
 */
export async function verifyPrivateEmail(regId: string, email: string): Promise<boolean> {
  const snap = await getDoc(contactRef(regId))
  const data = snap.data()
  if (!data) return false

  const normalized = email.trim().toLowerCase()

  if (data.emailHash) {
    const hash = await sha256hex(normalized)
    return data.emailHash === hash
  }

  // Legacy: plaintext stored from previous version
  if (data.email) {
    return data.email.trim().toLowerCase() === normalized
  }

  return false
}
