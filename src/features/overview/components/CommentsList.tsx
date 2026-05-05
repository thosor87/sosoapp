import { Card } from '@/components/ui/Card'
import { useRegistrationStore } from '@/features/registration/store'
import { ReplyBlock } from './ReplyBlock'

export function CommentsList() {
  const registrations = useRegistrationStore((s) => s.registrations)
  const withComments = registrations.filter((r) => r.comments?.trim() || r.commentsReply)

  if (withComments.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4 border-b border-warm-100 bg-orange-50/50">
        <h3 className="font-display font-bold text-warm-800">
          {'💬'} Anmerkungen ({withComments.length})
        </h3>
      </div>
      <div className="p-4 space-y-3">
        {withComments.map((reg) => (
          <div key={reg.id} className="rounded-lg bg-warm-50 p-3">
            <p className="text-sm font-medium text-warm-700">{reg.familyName}</p>
            {reg.comments?.trim() && (
              <p className="mt-1 text-sm text-warm-600 whitespace-pre-wrap">{reg.comments}</p>
            )}
            {reg.commentsReply && <ReplyBlock reply={reg.commentsReply} />}
          </div>
        ))}
      </div>
    </Card>
  )
}
