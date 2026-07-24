import { QuizLayout } from '@/features/quiz/components/QuizLayout'
import { VoiceStation } from '@/features/quiz/components/VoiceStation'
import type { AudioStation } from '@/features/quiz/audioStore'

export function VoicePage({ station }: { station: AudioStation }) {
  return (
    <QuizLayout>
      <VoiceStation station={station} />
    </QuizLayout>
  )
}
