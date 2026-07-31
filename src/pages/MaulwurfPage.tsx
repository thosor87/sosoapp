import { NumberCards } from '@/features/maulwurf/components/NumberCards'

export function MaulwurfPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFFBF5]">
      <main className="flex-1">
        <NumberCards />
      </main>
      <footer className="py-6 text-center">
        <p className="text-xs text-warm-400">
          Self-Made with <span className="text-red-400">{'❤️'}</span> and AI by{' '}
          <a
            href="https://digital.lilapixel.de"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-warm-600 transition-colors"
          >
            LILAPIXEL Digital
          </a>
        </p>
      </footer>
    </div>
  )
}
