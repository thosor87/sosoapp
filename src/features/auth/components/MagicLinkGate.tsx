import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { motion } from 'motion/react'
import { useAuthStore } from '../store'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface MagicLinkGateProps {
  children: ReactNode
}

export function MagicLinkGate({ children }: MagicLinkGateProps) {
  const [searchParams] = useSearchParams()
  const { isValidated, isLoading, validateToken } = useAuthStore()
  const [manualToken, setManualToken] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    const storedToken = localStorage.getItem('soso-token')
    const token = tokenFromUrl || storedToken

    if (token) {
      validateToken(token)
    } else {
      useAuthStore.getState().setLoading(false)
    }
  }, [searchParams, validateToken])

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    setError('')
    const valid = await validateToken(manualToken.trim())
    if (!valid) {
      setError('Ung\u00FCltiger Zugangscode')
    }
  }

  if (isLoading) return <LoadingScreen />

  if (!isValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFBF5] p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="text-6xl block mb-6"
          >
            {'\u2600\uFE0F'}
          </motion.span>
          <h1 className="font-display text-2xl font-bold text-warm-800 mb-2">
            Sorings Sommerfest
          </h1>
          <p className="text-warm-500 mb-8">
            Bitte gib deinen Zugangscode ein oder nutze den Einladungslink.
          </p>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Input
              placeholder="Zugangscode eingeben..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              error={error}
            />
            <Button type="submit" className="w-full" size="lg">
              Zugang erhalten
            </Button>
          </form>
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}
