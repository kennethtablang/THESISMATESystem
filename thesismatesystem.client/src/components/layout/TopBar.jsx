import { useNavigate, useOutletContext } from 'react-router-dom'
import { Bell, Search, Sun, Moon, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function TopBar({ title, subtitle }) {
  const { user } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const ctx = useOutletContext()

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'TM'

  return (
    <header
      className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-4"
      style={{
        background: 'var(--bg-topbar)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-light)',
        minHeight: '64px',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
          onClick={() => ctx?.toggleSidebar?.()}
        >
          <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
        </button>

        <div>
          {title && (
            <h1 className="font-display font-semibold text-lg sm:text-xl leading-tight" style={{ color: 'var(--text-heading)', letterSpacing: '-0.4px' }}>
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs mt-0.5 hidden sm:block" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}
        >
          <Search size={15} />
          <span className="hidden md:block" style={{ minWidth: '120px', color: 'var(--text-muted)' }}>Search...</span>
        </button>

        <button
          onClick={toggle}
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark
            ? <Sun size={16} style={{ color: '#c9a84c' }} />
            : <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
          }
        </button>

        <button
          onClick={() => navigate('/notifications')}
          className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
        >
          <Bell size={16} style={{ color: 'var(--text-secondary)' }} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
            style={{ background: '#c9a84c', border: '1.5px solid var(--bg-page)' }}
          />
        </button>

        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #0a1628 0%, #162238 100%)', color: '#c9a84c' }}
          >
            {initials}
          </div>
          <span className="text-sm font-medium hidden md:block" style={{ color: 'var(--text-primary)' }}>
            {user?.fullName?.split(' ')[0] ?? 'User'}
          </span>
        </button>
      </div>
    </header>
  )
}
