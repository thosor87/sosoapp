import { motion } from 'motion/react'
import { Card } from '@/components/ui/Card'
import { useRegistrationStore } from '@/features/registration/store'

export function CampingList() {
  const registrations = useRegistrationStore((s) => s.registrations)

  const campers = registrations.filter((r) => r.camping.wantsCamping)
  const totalTents = campers.reduce((sum, r) => sum + r.camping.tentCount, 0)
  const totalPersons = campers.reduce(
    (sum, r) => sum + (r.camping.personCount || r.adultsCount + r.childrenCount),
    0
  )

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-warm-100 bg-blue-50/50">
        <h3 className="font-display font-bold text-warm-800">
          {'\u26FA'} Zelter ({campers.length} Familien)
        </h3>
      </div>
      <div className="p-4">
        {campers.length === 0 ? (
          <p className="text-sm text-warm-400 text-center py-4 italic">
            Noch niemand zum Zelten angemeldet
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {campers.map((reg, i) => {
                const persons = reg.camping.personCount || reg.adultsCount + reg.childrenCount
                return (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 rounded-lg bg-warm-50 p-3"
                  >
                    <span className="text-lg">{'\u26FA'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-warm-700">
                          {reg.familyName}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            {reg.camping.tentCount}{' '}
                            {reg.camping.tentCount === 1 ? 'Zelt' : 'Zelte'}
                          </span>
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {persons} {persons === 1 ? 'Person' : 'Pers.'}
                          </span>
                        </div>
                      </div>
                      {reg.camping.notes && (
                        <p className="text-sm text-warm-500 mt-0.5">
                          {reg.camping.notes}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-warm-100 flex items-center justify-between text-sm font-medium text-warm-600">
              <span>Gesamt</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                  {totalTents} {totalTents === 1 ? 'Zelt' : 'Zelte'}
                </span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {totalPersons} {totalPersons === 1 ? 'Person' : 'Personen'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
