import { NavLink } from 'react-router-dom'
import { ChefHat, CalendarDays } from 'lucide-react'
import InstallBanner from './InstallBanner'

const tabs = [
  { to: '/', icon: ChefHat, label: '点菜' },
  { to: '/history', icon: CalendarDays, label: '历史' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-svh max-w-md mx-auto relative" style={{ background: 'var(--color-bg)' }}>
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <InstallBanner />

      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md flex"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(253,232,216,0.8)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        {tabs.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-all duration-150 ${
                isActive ? 'text-orange-600' : 'text-stone-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`p-1.5 rounded-xl transition-all duration-150 ${isActive ? 'bg-orange-100' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
