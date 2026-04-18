import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { deleteDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useRegistrationStore } from '@/features/registration/store'
import { useToastStore } from '@/components/feedback/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { RegistrationForm } from '@/features/registration/components/RegistrationForm'
import type { Registration } from '@/lib/firebase/types'

const LAST_VISIT_KEY = 'soso-admin-last-registrations-visit'

export function RegistrationManager() {
  const registrations = useRegistrationStore((s) => s.registrations)
  const addToast = useToastStore((s) => s.addToast)

  const [search, setSearch] = useState('')
  const [editReg, setEditReg] = useState<Registration | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // "New" indicator: registrations created after last visit
  const lastVisitRef = useRef<number>(
    parseInt(localStorage.getItem(LAST_VISIT_KEY) ?? '0', 10)
  )
  useEffect(() => {
    // Update timestamp after a short delay so current-session "new" items still show
    const timer = setTimeout(() => {
      localStorage.setItem(LAST_VISIT_KEY, Date.now().toString())
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  const isNew = (reg: Registration) => {
    const ts = reg.createdAt?.seconds
    return ts ? ts * 1000 > lastVisitRef.current : false
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return registrations
    const q = search.toLowerCase()
    return registrations.filter(
      (r) =>
        r.familyName.toLowerCase().includes(q) ||
        r.contactName.toLowerCase().includes(q)
    )
  }, [registrations, search])

  const stats = useMemo(() => {
    const totalAdults = registrations.reduce((s, r) => s + r.adultsCount, 0)
    const totalChildren = registrations.reduce((s, r) => s + r.childrenCount, 0)
    const totalCake = registrations.filter((r) => r.food.bringsCake).length
    const totalSalad = registrations.filter((r) => r.food.bringsSalad).length
    const totalOther = registrations.filter((r) => r.food.bringsOther).length
    const totalCamping = registrations.filter((r) => r.camping.wantsCamping).length
    return {
      families: registrations.length,
      adults: totalAdults,
      children: totalChildren,
      total: totalAdults + totalChildren,
      cake: totalCake,
      salad: totalSalad,
      other: totalOther,
      camping: totalCamping,
    }
  }, [registrations])

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, 'registrations', id))
      addToast('Anmeldung gelöscht', 'success')
      setDeleteConfirmId(null)
    } catch (error) {
      console.error('Error deleting registration:', error)
      addToast('Fehler beim Löschen', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCSVExport = () => {
    const headers = [
      'Haushalt/Familie',
      'Ansprechpartner',
      'E-Mail',
      'Erwachsene',
      'Kinder',
      'Gesamt',
      'Kuchen',
      'Kuchen-Beschreibung',
      'Salat',
      'Salat-Beschreibung',
      'Sonstiges',
      'Sonstiges-Beschreibung',
      'Zelten',
      'Zelte',
      'Zelten-Notizen',
      'Anmerkungen',
      'Angemeldet am',
      'Zuletzt geändert',
    ]

    const formatDate = (ts: import('firebase/firestore').Timestamp | undefined) =>
      ts?.toDate?.()
        ? ts.toDate().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : ''

    const rows = registrations.map((r) => [
      r.familyName,
      r.contactName,
      r.email,
      r.adultsCount,
      r.childrenCount,
      r.adultsCount + r.childrenCount,
      r.food.bringsCake ? 'Ja' : 'Nein',
      r.food.cakeDescription,
      r.food.bringsSalad ? 'Ja' : 'Nein',
      r.food.saladDescription,
      r.food.bringsOther ? 'Ja' : 'Nein',
      r.food.otherDescription ?? '',
      r.camping.wantsCamping ? 'Ja' : 'Nein',
      r.camping.tentCount,
      r.camping.notes,
      r.comments,
      formatDate(r.createdAt),
      formatDate(r.updatedAt),
    ])

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';')
      ),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `anmeldungen_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    addToast('CSV exportiert', 'success')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-display font-bold text-warm-800">
          Anmeldungen ({registrations.length})
        </h2>
        <Button size="sm" variant="outline" onClick={handleCSVExport}>
          CSV Export
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Suche nach Name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-warm-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-100 bg-warm-50">
              <th className="px-4 py-3 text-left font-medium text-warm-600">Haushalt/Familie</th>
              <th className="px-4 py-3 text-left font-medium text-warm-600 hidden sm:table-cell">Ansprechpartner</th>
              <th className="px-4 py-3 text-center font-medium text-warm-600 hidden md:table-cell">Erw.</th>
              <th className="px-4 py-3 text-center font-medium text-warm-600 hidden md:table-cell">Kinder</th>
              <th className="px-4 py-3 text-center font-medium text-warm-600">Gesamt</th>
              <th className="px-4 py-3 text-center font-medium text-warm-600 hidden lg:table-cell">Kuchen</th>
              <th className="px-4 py-3 text-center font-medium text-warm-600 hidden lg:table-cell">Salat</th>
              <th className="px-4 py-3 text-center font-medium text-warm-600 hidden lg:table-cell">Sonst.</th>
              <th className="px-4 py-3 text-center font-medium text-warm-600 hidden lg:table-cell">Zelten</th>
              <th className="px-4 py-3 text-right font-medium text-warm-600">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-warm-400">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Anmeldungen vorhanden.'}
                </td>
              </tr>
            ) : (
              filtered.map((reg) => (
                <motion.tr
                  key={reg.id}
                  layout
                  className="border-b border-warm-50 hover:bg-warm-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-warm-800">
                    <div className="flex items-center gap-2">
                      {reg.familyName}
                      {isNew(reg) && (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 shrink-0">
                          Neu
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-warm-600 hidden sm:table-cell">{reg.contactName}</td>
                  <td className="px-4 py-3 text-center text-warm-600 hidden md:table-cell">{reg.adultsCount}</td>
                  <td className="px-4 py-3 text-center text-warm-600 hidden md:table-cell">{reg.childrenCount}</td>
                  <td className="px-4 py-3 text-center font-medium text-warm-800">{reg.adultsCount + reg.childrenCount}</td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {reg.food.bringsCake ? <span title={reg.food.cakeDescription}>{'\uD83C\uDF70'}</span> : <span className="text-warm-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {reg.food.bringsSalad ? <span title={reg.food.saladDescription}>{'\uD83E\uDD57'}</span> : <span className="text-warm-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {reg.food.bringsOther ? <span title={reg.food.otherDescription}>🍞</span> : <span className="text-warm-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {reg.camping.wantsCamping ? <span title={`${reg.camping.tentCount} Zelt(e)`}>{'\u26FA'}</span> : <span className="text-warm-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setEditReg(reg)}
                        className="p-1.5 rounded-lg text-warm-400 hover:text-primary-600 hover:bg-primary-50 cursor-pointer transition-colors"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {deleteConfirmId === reg.id ? (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleDelete(reg.id)} disabled={isDeleting} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 cursor-pointer transition-colors text-xs font-medium">Ja</button>
                          <button type="button" onClick={() => setDeleteConfirmId(null)} className="p-1.5 rounded-lg text-warm-400 hover:bg-warm-100 cursor-pointer transition-colors text-xs font-medium">Nein</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(reg.id)}
                          className="p-1.5 rounded-lg text-warm-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                          title="Löschen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats row */}
      <div className="rounded-xl border border-warm-100 bg-warm-50 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 text-center">
          <div>
            <p className="text-xs text-warm-500">Familien</p>
            <p className="text-lg font-bold text-warm-800">{stats.families}</p>
          </div>
          <div>
            <p className="text-xs text-warm-500">Erwachsene</p>
            <p className="text-lg font-bold text-warm-800">{stats.adults}</p>
          </div>
          <div>
            <p className="text-xs text-warm-500">Kinder</p>
            <p className="text-lg font-bold text-warm-800">{stats.children}</p>
          </div>
          <div>
            <p className="text-xs text-warm-500">Gesamt</p>
            <p className="text-lg font-bold text-primary-600">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-warm-500">Kuchen</p>
            <p className="text-lg font-bold text-warm-800">{stats.cake}</p>
          </div>
          <div>
            <p className="text-xs text-warm-500">Salat</p>
            <p className="text-lg font-bold text-warm-800">{stats.salad}</p>
          </div>
          <div>
            <p className="text-xs text-warm-500">Sonstiges</p>
            <p className="text-lg font-bold text-warm-800">{stats.other}</p>
          </div>
          <div>
            <p className="text-xs text-warm-500">Zelten</p>
            <p className="text-lg font-bold text-warm-800">{stats.camping}</p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editReg}
        onClose={() => setEditReg(null)}
        title="Anmeldung bearbeiten"
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {editReg && (
          <RegistrationForm
            editRegistration={editReg}
            onClose={() => setEditReg(null)}
          />
        )}
      </Modal>
    </div>
  )
}
