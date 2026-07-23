import { useEffect, type ReactNode } from 'react'

/** Schlankes, eigenständiges Layout für das Hochzeitsquiz. */
export function QuizLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    const previous = document.title
    document.title = 'Ja?Wort – Hochzeitsquiz'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFBF5]">
      <main className="flex-1">{children}</main>
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
