import { useState } from 'react'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { useAuthStore } from '@/features/auth/store'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { AdminDashboard } from '@/features/admin/components/AdminDashboard'

export function AdminPage() {
  const { isAdmin, loginAdmin } = useAuthStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await loginAdmin(password)
    if (!success) {
      setError('Falsches Passwort')
      setPassword('')
    }
  }

  if (!isAdmin) {
    return (
      <PageContainer className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          <span className="text-4xl block mb-4">{'\u{1F512}'}</span>
          <h1 className="text-xl font-display font-bold text-warm-800 mb-2">Orga-Bereich</h1>
          <p className="text-warm-500 text-sm mb-6">
            Bitte gib das Admin-Passwort ein.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Passwort..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              error={error}
            />
            <Button type="submit" className="w-full">
              Anmelden
            </Button>
          </form>
        </motion.div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-display font-bold text-warm-800 mb-6"
      >
        Orga-Bereich
      </motion.h1>
      <AdminDashboard />
    </PageContainer>
  )
}
