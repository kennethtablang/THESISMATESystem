import { useState, useRef, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Bell, Search, Sun, Moon, Menu, LogOut, UserCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

export default function TopBar({ title, subtitle }) {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const ctx = useOutletContext()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'TM'

  return (
    <>
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

        {/* Account dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
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
            <ChevronDown size={13} className={`hidden sm:block transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--text-muted)' }} />
          </button>

          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50 animate-slide-up"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', boxShadow: '0 8px 32px rgba(0,0,0,0.24)' }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{user?.fullName ?? 'User'}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email ?? ''}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => { setDropdownOpen(false); navigate('/profile') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <UserCircle size={15} style={{ color: 'var(--text-secondary)' }} />
                  My Profile
                </button>
                <div className="mx-3 my-1" style={{ height: '1px', background: 'var(--border-light)' }} />
                <button
                  onClick={() => { setDropdownOpen(false); setShowLogoutModal(true) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150"
                  style={{ color: '#f87171' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Logout confirmation modal */}
    {showLogoutModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up" style={{ background: '#1e2a3a', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <LogOut size={18} style={{ color: '#f87171' }} />
            </div>
            <div>
              <p className="font-semibold text-white">Sign out</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>ThesisMate</p>
            </div>
          </div>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.65)', lineHeight: '1.6' }}>
            Are you sure you want to log out?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
            >
              Yes
            </button>
            <button
              onClick={() => setShowLogoutModal(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
