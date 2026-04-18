import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useRegistrationStore } from '@/features/registration/store'
import { useAuthStore } from '@/features/auth/store'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('gsi-script')) { resolve(); return }
    const script = document.createElement('script')
    script.id = 'gsi-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function uploadToDrive(accessToken: string, content: string, filename: string): Promise<string> {
  const metadata = { name: filename, mimeType: 'application/json' }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: 'application/json' }))

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })

  if (!response.ok) throw new Error(`Drive upload failed: ${response.statusText}`)
  const data = await response.json()
  return data.id as string
}

export function GoogleDriveBackup() {
  const registrations = useRegistrationStore((s) => s.registrations)
  const eventConfig = useAuthStore((s) => s.eventConfig)
  const [isUploading, setIsUploading] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-display font-bold text-warm-800">Google Drive Backup</h2>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-800">Nicht konfiguriert</p>
          <p className="text-sm text-amber-700">
            Füge <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_CLIENT_ID</code> in die <code className="bg-amber-100 px-1 rounded">.env</code>-Datei ein, um Google Drive Backups zu aktivieren.
          </p>
          <p className="text-xs text-amber-600 mt-2">
            1. Google Cloud Console → APIs &amp; Services → Credentials → OAuth 2.0 Client ID (Web application)<br />
            2. Authorisierte JavaScript-Ursprünge: deine App-Domain eintragen<br />
            3. Client-ID kopieren und als VITE_GOOGLE_CLIENT_ID setzen
          </p>
        </div>
      </div>
    )
  }

  const handleBackup = async () => {
    setIsUploading(true)
    setError(null)
    try {
      await loadGsiScript()

      const accessToken = await new Promise<string>((resolve, reject) => {
        // @ts-expect-error google global loaded dynamically
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: DRIVE_SCOPE,
          callback: (response: { access_token?: string; error?: string }) => {
            if (response.error || !response.access_token) {
              reject(new Error(response.error ?? 'OAuth fehlgeschlagen'))
            } else {
              resolve(response.access_token)
            }
          },
        })
        client.requestAccessToken()
      })

      const backup = {
        exportedAt: new Date().toISOString(),
        eventTitle: eventConfig?.title ?? 'SoSo App',
        registrations: registrations.map((r) => ({
          ...r,
          createdAt: r.createdAt?.toDate?.()?.toISOString(),
          updatedAt: r.updatedAt?.toDate?.()?.toISOString(),
        })),
      }

      const filename = `sosoapp-backup-${new Date().toISOString().slice(0, 10)}.json`
      await uploadToDrive(accessToken, JSON.stringify(backup, null, 2), filename)
      setLastBackup(new Date().toLocaleString('de-DE'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Backup fehlgeschlagen')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-bold text-warm-800">Google Drive Backup</h2>

      <div className="rounded-xl border border-warm-100 bg-white p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.5 20Q4.22 20 2.61 18.43 1 16.85 1 14.58q0-1.95 1.17-3.48 1.18-1.53 3.08-1.95.51-2.26 2.29-3.70Q9.33 4 11.5 4q2.55 0 4.28 1.73Q17.5 7.45 17.5 10v.5H18q1.45 0 2.47.99Q21.5 12.48 21.5 14q0 1.45-1.02 2.48Q19.44 17.5 18 17.5H13v-5.65l1.6 1.55L16 12l-4-4-4 4 1.4 1.4L11 11.85V17.5H6.5Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-warm-800">Aktuelle Anmeldungen sichern</p>
            <p className="text-sm text-warm-500">
              {registrations.length} Anmeldung{registrations.length !== 1 ? 'en' : ''} werden als JSON-Datei in deinem Google Drive gespeichert.
            </p>
          </div>
        </div>

        {lastBackup && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
            ✓ Letztes Backup: {lastBackup}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            ✗ {error}
          </div>
        )}

        <Button onClick={handleBackup} disabled={isUploading} className="w-full">
          {isUploading ? 'Wird gesichert...' : 'Jetzt bei Google Drive sichern'}
        </Button>
      </div>
    </div>
  )
}
