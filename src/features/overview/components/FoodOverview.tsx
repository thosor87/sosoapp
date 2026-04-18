import { motion } from 'motion/react'
import { Card } from '@/components/ui/Card'
import { useRegistrationStore } from '@/features/registration/store'

interface FoodItem {
  familyName: string
  description: string
}

function FoodSection({
  title,
  emoji,
  items,
  emptyText,
  colorClass,
}: {
  title: string
  emoji: string
  items: FoodItem[]
  emptyText: string
  colorClass: string
}) {
  return (
    <Card className="overflow-hidden flex-1">
      <div className={`px-5 py-4 border-b border-warm-100 ${colorClass}`}>
        <h3 className="font-display font-bold text-warm-800">
          {emoji} {title} ({items.length})
        </h3>
      </div>
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-sm text-warm-400 text-center py-4 italic">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <motion.div
                key={`${item.familyName}-${i}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-lg bg-warm-50 p-3"
              >
                <span className="text-lg">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-warm-700">{item.description}</p>
                  <p className="text-xs text-warm-400">{item.familyName}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

export function FoodOverview() {
  const registrations = useRegistrationStore((s) => s.registrations)

  const cakes: FoodItem[] = registrations
    .filter((r) => r.food.bringsCake)
    .map((r) => ({ familyName: r.familyName, description: r.food.cakeDescription }))

  const salads: FoodItem[] = registrations
    .filter((r) => r.food.bringsSalad)
    .map((r) => ({ familyName: r.familyName, description: r.food.saladDescription }))

  const others: FoodItem[] = registrations
    .filter((r) => r.food.bringsOther && r.food.otherDescription)
    .map((r) => ({ familyName: r.familyName, description: r.food.otherDescription! }))

  const hasOthers = others.length > 0 || registrations.some((r) => r.food.bringsOther !== undefined)

  return (
    <div className={`grid grid-cols-1 gap-4 ${hasOthers ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
      <FoodSection
        title="Kuchen"
        emoji={'\uD83C\uDF82'}
        items={cakes}
        emptyText="Noch keine Kuchen angemeldet"
        colorClass="bg-amber-50/50"
      />
      <FoodSection
        title="Salate"
        emoji={'\uD83E\uDD57'}
        items={salads}
        emptyText="Noch keine Salate angemeldet"
        colorClass="bg-emerald-50/50"
      />
      {hasOthers && (
        <FoodSection
          title="Sonstiges"
          emoji="🍞"
          items={others}
          emptyText="Noch nichts Sonstiges angemeldet"
          colorClass="bg-violet-50/50"
        />
      )}
    </div>
  )
}
