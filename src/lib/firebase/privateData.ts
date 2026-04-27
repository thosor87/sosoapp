import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

const contactRef = (regId: string) =>
  doc(db, 'registrations', regId, 'private', 'contact')

export async function getPrivateEmail(regId: string): Promise<string> {
  const snap = await getDoc(contactRef(regId))
  return snap.data()?.email ?? ''
}

export async function setPrivateEmail(regId: string, email: string): Promise<void> {
  await setDoc(contactRef(regId), { email })
}

export async function deletePrivateContact(regId: string): Promise<void> {
  await deleteDoc(contactRef(regId)).catch(() => {})
}
