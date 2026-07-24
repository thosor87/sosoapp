import { QuizLayout } from '@/features/quiz/components/QuizLayout'
import { QuizGame } from '@/features/quiz/components/QuizGame'

export function QuizPage({ team = 1 }: { team?: 1 | 2 }) {
  return (
    <QuizLayout>
      <QuizGame team={team} />
    </QuizLayout>
  )
}
