import { useState } from 'react'
import { motion } from 'motion/react'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useRegistrationStore } from '@/features/registration/store'
import { useAuthStore } from '@/features/auth/store'
import { sendEditLinkEmail } from '@/lib/firebase/sendConfirmationEmail'

export function RegistrationList() {
  const registrations = useRegistrationStore((s) => s.registrations)
  const isLoading = useRegistrationStore((s) => s.isLoading)
  const accessToken = useAuthStore((s) => s.accessToken)
  const [search, setSearch] = useState('')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sentIds, setSentIds] = useState<Set<string>>(new Set())

  const filtered = registrations.filter(
    (r) =>
      r.familyName.toLowerCase().includes(search.toLowerCase()) ||
      r.contactName.toLowerCase().includes(search.toLowerCase())
  )

  async function handleRequestEditLink(regId: string) {
    const reg = registrations.find((r) => r.id === regId)
    if (!reg || !accessToken) return

    setSendingId(regId)
    try {
      await sendEditLinkEmail(reg, accessToken)
      setSentIds((prev) => new Set(prev).add(regId))
      // Reset sent indicator after 3s
      setTimeout(() => {
        setSentIds((prev) => {
          const next = new Set(prev)
          next.delete(regId)
          return next
        })
      }, 3000)
    } catch (err) {
      console.error('Edit link email failed:', err)
    } finally {
      setSendingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center gap-3 text-warm-400">
          <div className="w-5 h-5 border-2 border-warm-300 border-t-primary-500 rounded-full animate-spin" />
          <span>Lade Anmeldungen...</span>
        </div>
      </Card>
    )
  }

  function EditLinkButton({ regId }: { regId: string }) {
    const isSending = sendingId === regId
    const isSent = sentIds.has(regId)

    return (
      <button
        type="button"
        onClick={() => handleRequestEditLink(regId)}
        disabled={isSending || isSent}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-warm-400 hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer disabled:cursor-default disabled:opacity-60"
        title={isSent ? 'Link gesendet!' : 'Bearbeitungslink per E-Mail senden'}
      >
        {isSending ? (
          <div className="w-4 h-4 border-2 border-warm-300 border-t-primary-500 rounded-full animate-spin" />
        ) : isSent ? (
          <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 md:p-6 border-b border-warm-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-display font-bold text-warm-800">
            Anmeldungen ({registrations.length})
          </h2>
          <div className="w-full sm:w-64">
            <Input
              placeholder="Haushalt suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-warm-400">
          {search
            ? 'Keine Ergebnisse gefunden.'
            : 'Noch keine Anmeldungen vorhanden.'}
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-warm-100 bg-warm-50/50">
                  <th className="text-left text-xs font-medium text-warm-500 uppercase tracking-wider px-6 py-3">
                    Haushalt
                  </th>
                  <th className="text-left text-xs font-medium text-warm-500 uppercase tracking-wider px-6 py-3">
                    Ansprechpartner
                  </th>
                  <th className="text-center text-xs font-medium text-warm-500 uppercase tracking-wider px-4 py-3">
                    Personen
                  </th>
                  <th className="text-left text-xs font-medium text-warm-500 uppercase tracking-wider px-4 py-3">
                    Beiträge
                  </th>
                  <th className="text-right text-xs font-medium text-warm-500 uppercase tracking-wider px-6 py-3">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg, i) => (
                  <motion.tr
                    key={reg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-warm-50 hover:bg-warm-50/50 transition-colors"
                  >
                    <td className="px-6 py-3.5 font-medium text-warm-800">
                      {reg.familyName}
                    </td>
                    <td className="px-6 py-3.5 text-warm-600">
                      {reg.contactName}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-warm-700">
                        {reg.adultsCount}E
                      </span>
                      {reg.childrenCount > 0 && (
                        <span className="text-warm-500">
                          {' '}
                          + {reg.childrenCount}K
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {reg.food.bringsCake && (
                          <Badge variant="warning">
                            {'\uD83C\uDF70'} Kuchen
                          </Badge>
                        )}
                        {reg.food.bringsSalad && (
                          <Badge variant="success">
                            {'\uD83E\uDD57'} Salat
                          </Badge>
                        )}
                        {reg.camping.wantsCamping && (
                          <Badge variant="info">
                            {'\u26FA'} Zelten
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <EditLinkButton regId={reg.id} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-warm-50">
            {filtered.map((reg, i) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-warm-800">
                      {reg.familyName}
                    </p>
                    <p className="text-sm text-warm-500">
                      {reg.contactName}
                    </p>
                  </div>
                  <EditLinkButton regId={reg.id} />
                </div>
                <div className="flex items-center gap-2 text-sm text-warm-600 mb-2">
                  <span>
                    {reg.adultsCount} Erwachsene
                    {reg.childrenCount > 0 &&
                      `, ${reg.childrenCount} Kinder`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {reg.food.bringsCake && (
                    <Badge variant="warning">
                      {'\uD83C\uDF70'} Kuchen
                    </Badge>
                  )}
                  {reg.food.bringsSalad && (
                    <Badge variant="success">
                      {'\uD83E\uDD57'} Salat
                    </Badge>
                  )}
                  {reg.camping.wantsCamping && (
                    <Badge variant="info">
                      {'\u26FA'} Zelten
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
