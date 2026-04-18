import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuthStore } from '@/features/auth/store'
import { useToastStore } from '@/components/feedback/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Toggle } from '@/components/ui/Toggle'

export function EventSettings() {
  const eventConfig = useAuthStore((s) => s.eventConfig)
  const eventId = useAuthStore((s) => s.eventId)
  const addToast = useToastStore((s) => s.addToast)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [location, setLocation] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [cakeLimit, setCakeLimit] = useState(15)
  const [saladLimit, setSaladLimit] = useState(15)
  const [otherLimit, setOtherLimit] = useState(15)
  const [newPassword, setNewPassword] = useState('')
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    if (!eventConfig) return
    setTitle(eventConfig.title || '')
    setLocation(eventConfig.location || '')
    setAccessToken(eventConfig.accessToken || '')
    setAdminEmail(eventConfig.adminEmail || '')
    setCakeLimit(eventConfig.cakeLimit ?? 15)
    setSaladLimit(eventConfig.saladLimit ?? 15)
    setOtherLimit(eventConfig.otherLimit ?? 15)
    setIsRegistrationOpen(eventConfig.isRegistrationOpen ?? true)

    // Convert Timestamp to date string for the date input
    if (eventConfig.date) {
      try {
        const d = eventConfig.date.toDate()
        const yyyy = d.getFullYear()
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        setDate(`${yyyy}-${mm}-${dd}`)
      } catch {
        setDate('')
      }
    }
  }, [eventConfig])

  const handleSave = async () => {
    if (!eventId) return
    setIsSaving(true)
    try {
      const docRef = doc(db, 'events', eventId)
      const updateData: Record<string, unknown> = {
        title,
        location,
        accessToken,
        adminEmail: adminEmail.trim(),
        cakeLimit: Math.max(1, Math.min(100, parseInt(String(cakeLimit), 10) || 15)),
        saladLimit: Math.max(1, Math.min(100, parseInt(String(saladLimit), 10) || 15)),
        otherLimit: Math.max(1, Math.min(100, parseInt(String(otherLimit), 10) || 15)),
        isRegistrationOpen,
        updatedAt: serverTimestamp(),
      }

      // Only update date if a valid date string is provided
      if (date) {
        updateData.date = Timestamp.fromDate(new Date(date + 'T00:00:00'))
      }

      await updateDoc(docRef, updateData)
      addToast('Einstellungen gespeichert', 'success')
    } catch (error) {
      console.error('Error saving settings:', error)
      addToast('Fehler beim Speichern', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSavePassword = async () => {
    if (!eventId || !newPassword.trim()) {
      addToast('Bitte neues Passwort eingeben', 'error')
      return
    }
    setIsSavingPassword(true)
    try {
      const docRef = doc(db, 'events', eventId)
      await updateDoc(docRef, {
        adminPasswordHash: newPassword,
        updatedAt: serverTimestamp(),
      })
      addToast('Admin-Passwort geändert', 'success')
      setNewPassword('')
    } catch (error) {
      console.error('Error saving password:', error)
      addToast('Fehler beim Speichern', 'error')
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleCopyToken = () => {
    navigator.clipboard.writeText(accessToken).then(() => {
      addToast('Zugangscode kopiert', 'success')
    }).catch(() => {
      addToast('Kopieren fehlgeschlagen', 'error')
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-display font-bold text-warm-800">
        Einstellungen
      </h2>

      <div className="rounded-2xl border border-warm-100 bg-white p-5 space-y-5">
        <Input
          label="Event-Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z.B. Sorings Sommerfest 2026"
        />

        <Input
          label="Datum"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <Input
          label="Ort"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="z.B. Im Garten bei Oma"
        />

        {/* Access Token with copy */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-warm-700">
            Zugangscode
          </label>
          <div className="flex gap-2">
            <Input
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="z.B. soso2026"
              className="flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyToken}
              className="shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </Button>
          </div>
        </div>

        <div>
          <Input
            label="Admin-E-Mail (Tagesrückblick)"
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="z.B. admin@beispiel.de"
          />
          <p className="text-xs text-warm-400 mt-1">
            Hierhin wird täglich eine Zusammenfassung der Änderungen geschickt.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-warm-700">Speisekontingent (max. Anmeldungen)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Input
                label="🎂 Kuchen"
                type="number"
                value={String(cakeLimit)}
                onChange={(e) => setCakeLimit(parseInt(e.target.value, 10) || 15)}
                placeholder="15"
              />
            </div>
            <div>
              <Input
                label="🥗 Salat"
                type="number"
                value={String(saladLimit)}
                onChange={(e) => setSaladLimit(parseInt(e.target.value, 10) || 15)}
                placeholder="15"
              />
            </div>
            <div>
              <Input
                label="🍞 Sonstiges"
                type="number"
                value={String(otherLimit)}
                onChange={(e) => setOtherLimit(parseInt(e.target.value, 10) || 15)}
                placeholder="15"
              />
            </div>
          </div>
          <p className="text-xs text-warm-400">Standard je Kategorie: 15. Bei 0 = kein Limit.</p>
        </div>

        <Toggle
          checked={isRegistrationOpen}
          onChange={setIsRegistrationOpen}
          label="Anmeldung offen"
        />

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Wird gespeichert...' : 'Einstellungen speichern'}
        </Button>
      </div>

      {/* Password change section */}
      <div className="rounded-2xl border border-warm-100 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold text-warm-700">
          Admin-Passwort ändern
        </h3>
        <div className="flex gap-2">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Neues Passwort..."
            className="flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleSavePassword}
            disabled={isSavingPassword || !newPassword.trim()}
          >
            {isSavingPassword ? 'Speichern...' : 'Ändern'}
          </Button>
        </div>
      </div>
    </div>
  )
}
