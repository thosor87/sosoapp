import { Link } from 'react-router'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <span className="text-6xl block mb-4">{'\u{1F3D6}\uFE0F'}</span>
        <h1 className="text-2xl font-display font-bold text-warm-800 mb-2">
          Seite nicht gefunden
        </h1>
        <p className="text-warm-500 mb-6">
          Diese Seite existiert leider nicht.
        </p>
        <Link to="/">
          <Button>Zur{'\u00FC'}ck zur Startseite</Button>
        </Link>
      </motion.div>
    </div>
  )
}
