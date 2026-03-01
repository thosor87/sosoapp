export function Footer() {
  return (
    <footer className="bg-warm-800 text-warm-300 py-8 px-6 text-center mb-16 md:mb-0">
      <div className="mx-auto max-w-5xl space-y-3">
        <div className="flex items-center justify-center gap-2 text-white">
          <span className="text-xl">{'\u2600\uFE0F'}</span>
          <span className="font-display font-bold text-lg">SoSo</span>
        </div>

        <p className="text-sm">
          Self-Made with{' '}
          <span className="text-red-400">{'\u2764\uFE0F'}</span>
          {' '}and AI by{' '}
          <a
            href="https://www.lilapixel.de"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center align-middle hover:opacity-80 transition-opacity"
          >
            <img
              src="https://drat580elycl3.cloudfront.net/images/LP_Logo.png"
              alt="LILAPIXEL Grafikdesign"
              className="h-8 w-auto ml-1.5 hover:-translate-y-0.5 transition-transform"
            />
          </a>
        </p>

        <p className="text-xs text-warm-400">
          Daten werden sicher in der Cloud gespeichert (Firebase)
        </p>

        <p className="text-xs">
          <a
            href="https://www.lilapixel.de/impressum.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-warm-400 hover:text-warm-200 transition-colors underline underline-offset-2"
          >
            Impressum
          </a>
        </p>
      </div>
    </footer>
  )
}
