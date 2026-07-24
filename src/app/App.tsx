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

// Hochzeitsquiz „Ja?Wort" – eigenständig, ohne Magic-Link-Zugang der Party-App
const QuizPage = lazy(() =>
  import('@/pages/QuizPage').then((m) => ({ default: m.QuizPage }))
)
const QuizAdminPage = lazy(() =>
  import('@/pages/QuizAdminPage').then((m) => ({ default: m.QuizAdminPage }))
)

/** Die bestehende Sommerfest-App hinter dem Magic-Link-Gate. */
function PartyApp() {
  return (
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
    </MagicLinkGate>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Hochzeitsquiz – öffentlich, per QR-Code erreichbar */}
          {/* /quiz = Team 1, /quiz2 = Team 2 (nur der Maps-Link unterscheidet sich) */}
          <Route
            path="/quiz"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <QuizPage team={1} />
              </Suspense>
            }
          />
          <Route
            path="/quiz2"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <QuizPage team={2} />
              </Suspense>
            }
          />
          <Route
            path="/quiz/admin"
            element={
              <Suspense fallback={<LoadingScreen />}>
                <QuizAdminPage />
              </Suspense>
            }
          />
          {/* Alles andere: bestehende Sommerfest-App */}
          <Route path="/*" element={<PartyApp />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  )
}
