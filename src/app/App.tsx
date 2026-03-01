import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ToastContainer } from '@/components/feedback/Toast'
import { LoadingScreen } from '@/components/feedback/LoadingScreen'
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary'
import { MagicLinkGate } from '@/features/auth/components/MagicLinkGate'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const OverviewPage = lazy(() =>
  import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage }))
)
const AdminPage = lazy(() =>
  import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage }))
)

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <MagicLinkGate>
          <Header />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/uebersicht"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <OverviewPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<LoadingScreen />}>
                    <AdminPage />
                  </Suspense>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AnimatePresence>
          <Footer />
          <ToastContainer />
        </MagicLinkGate>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
