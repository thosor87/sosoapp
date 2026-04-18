import { useState, useEffect } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { getAuditLogs } from '@/lib/firebase/auditLog'
import type { AuditLog } from '@/lib/firebase/types'

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: 'Neu', color: 'bg-emerald-100 text-emerald-700' },
  update: { label: 'Geändert', color: 'bg-blue-100 text-blue-700' },
  delete: { label: 'Gelöscht', color: 'bg-red-100 text-red-700' },
}

function groupByDate(logs: AuditLog[]) {
  const groups: Record<string, AuditLog[]> = {}
  for (const log of logs) {
    const ts = log.timestamp?.toDate?.()
    const key = ts
      ? ts.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      : 'Unbekannt'
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  }
  return groups
}

export function AuditLogViewer() {
  const eventId = useAuthStore((s) => s.eventId)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'today'>('today')

  useEffect(() => {
    if (!eventId) return
    setIsLoading(true)
    getAuditLogs(eventId)
      .then(setLogs)
      .catch((err) => console.error('Failed to load audit logs:', err))
      .finally(() => setIsLoading(false))
  }, [eventId])

  const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const filtered = filter === 'today'
    ? logs.filter((l) => {
        const ts = l.timestamp?.toDate?.()
        if (!ts) return false
        const key = ts.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
        return key === today
      })
    : logs

  const groups = groupByDate(filtered)
  const groupKeys = Object.keys(groups)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-display font-bold text-warm-800">Änderungsprotokoll</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('today')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${filter === 'today' ? 'bg-primary-500 text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'}`}
          >
            Heute
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${filter === 'all' ? 'bg-primary-500 text-white' : 'bg-warm-100 text-warm-600 hover:bg-warm-200'}`}
          >
            Alle
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-warm-400">Wird geladen...</div>
      ) : groupKeys.length === 0 ? (
        <div className="py-12 text-center text-warm-400">
          {filter === 'today' ? 'Heute noch keine Änderungen.' : 'Noch keine Einträge vorhanden.'}
        </div>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((dateKey) => (
            <div key={dateKey}>
              <h3 className="text-xs font-semibold text-warm-400 uppercase tracking-wider mb-2 px-1">{dateKey}</h3>
              <div className="rounded-xl border border-warm-100 bg-white overflow-hidden divide-y divide-warm-50">
                {groups[dateKey].map((log) => {
                  const action = ACTION_LABELS[log.action] ?? { label: log.action, color: 'bg-warm-100 text-warm-600' }
                  const ts = log.timestamp?.toDate?.()
                  const time = ts ? ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : ''
                  return (
                    <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                      <span className={`shrink-0 mt-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${action.color}`}>
                        {action.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-warm-800 truncate">{log.familyName}</p>
                        <p className="text-xs text-warm-500 truncate">{log.summary}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-warm-400">{time}</p>
                        <p className="text-xs text-warm-300">{log.performedBy === 'admin' ? 'Admin' : 'Gast'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
