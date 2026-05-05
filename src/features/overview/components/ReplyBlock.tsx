import type { AdminReply } from '@/lib/firebase/types'

interface ReplyBlockProps {
  reply: AdminReply
}

export function ReplyBlock({ reply }: ReplyBlockProps) {
  return (
    <div className="mt-2 ml-4 rounded-md border-l-4 border-orange-400 bg-orange-50 px-3 py-2 text-sm">
      <div className="text-xs font-semibold text-orange-700">Antwort von Familie Soring</div>
      <div className="mt-1 whitespace-pre-wrap text-stone-800">{reply.text}</div>
    </div>
  )
}
