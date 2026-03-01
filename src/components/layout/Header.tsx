import { Link, useLocation } from 'react-router'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils/cn'
const navItems = [
  { path: '/', label: 'Start', icon: '\u{1F3E0}' },
  { path: '/uebersicht', label: '\u00DCbersicht', icon: '\u{1F4CA}' },
  { path: '/admin', label: 'Orga', icon: '\u2699\uFE0F' },
]

export function Header() {
  const location = useLocation()

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-40 border-b border-warm-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl flex items-center justify-between px-6 h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">{'\u2600\uFE0F'}</span>
            <span className="font-display font-bold text-warm-800 text-lg">SoSo</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive ? 'text-primary-600' : 'text-warm-500 hover:text-warm-700'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-primary-50 rounded-lg"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-warm-100 bg-white/90 backdrop-blur-md safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors min-w-[64px]',
                  isActive ? 'text-primary-600' : 'text-warm-400'
                )}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
