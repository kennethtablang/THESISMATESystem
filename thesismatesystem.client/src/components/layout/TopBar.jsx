import { useState, useRef, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Bell, Search, Sun, Moon, Menu, LogOut, UserCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'

const ROLE_COLORS = {
  Student:    '#38bdf8',
  Faculty:    '#34d399',
  Admin:      '#fb923c',
  SuperAdmin: '#f87171',
}

export default function TopBar({ title, subtitle }) {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const ctx = useOutletContext()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dropdownRef = useRef(null)

  const roleColor = ROLE_COLORS[user?.role] ?? '#c9a84c'

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
  const firstName = user?.fullName?.split(' ')[0] ?? 'User'

  return (
    <>
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8"
        style={{
          background: 'var(--bg-topbar)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border-light)',
          boxShadow: '0 1px 0 rgba(201,168,76,0.12), 0 4px 20px rgba(0,0,0,0.04)',
          minHeight: '68px',
        }}
      >
        {/* Left — hamburger + title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
            onClick={() => ctx?.toggleSidebar?.()}
          >
            <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>

          {title && (
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Gold left accent bar */}
              <div
                className="shrink-0 hidden sm:block"
                style={{
                  width: 3,
                  height: 28,
                  borderRadius: 99,
                  background: 'linear-gradient(180deg, #c9a84c 0%, rgba(201,168,76,0.2) 100%)',
                }}
              />
              <div className="min-w-0">
                <h1
                  className="font-display font-semibold leading-tight truncate"
                  style={{
                    color: 'var(--text-heading)',
                    letterSpacing: '-0.4px',
                    fontSize: 'clamp(1rem, 2vw, 1.15rem)',
                  }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-xs mt-0.5 hidden sm:block truncate" style={{ color: 'var(--text-muted)' }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Search */}
          <button
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-150"
            style={{
              background: 'var(--bg-subtle)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border-main)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'
              e.currentTarget.style.background = 'var(--bg-card)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-main)'
              e.currentTarget.style.background = 'var(--bg-subtle)'
            }}
          >
            <Search size={14} />
            <span className="hidden md:block" style={{ minWidth: '110px', fontSize: 13 }}>
              Search...
            </span>
            <kbd
              className="hidden lg:block"
              style={{
                fontSize: 10,
                color: 'var(--text-muted)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-main)',
                borderRadius: 5,
                padding: '1px 5px',
                lineHeight: 1.6,
                fontFamily: 'monospace',
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
            title={isDark ? 'Light mode' : 'Dark mode'}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
          >
            {isDark
              ? <Sun size={16} style={{ color: '#c9a84c' }} />
              : <Moon size={16} style={{ color: 'var(--text-secondary)' }} />
            }
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
            title="Notifications"
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
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
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-150"
              style={{
                background: dropdownOpen ? 'var(--bg-card)' : 'var(--bg-subtle)',
                border: `1px solid ${dropdownOpen ? 'rgba(201,168,76,0.3)' : 'var(--border-main)'}`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
              onMouseLeave={e => {
                if (!dropdownOpen) {
                  e.currentTarget.style.borderColor = 'var(--border-main)'
                  e.currentTarget.style.background = 'var(--bg-subtle)'
                }
              }}
            >
              {/* Avatar with role-colored ring */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #0a1628 0%, #162238 100%)',
                    color: roleColor,
                    border: `1.5px solid ${roleColor}50`,
                    boxShadow: `0 0 8px ${roleColor}25`,
                  }}
                >
                  {initials}
                </div>
                {/* Online dot */}
                <span style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#22c55e',
                  border: '1.5px solid var(--bg-page)',
                }} />
              </div>

              <div className="hidden md:block text-left leading-tight">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {firstName}
                </p>
                <p className="text-xs" style={{ color: roleColor, lineHeight: 1.2, fontSize: 10 }}>
                  {user?.role ?? 'Student'}
                </p>
              </div>

              <ChevronDown
                size={13}
                className={`hidden sm:block transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--text-muted)' }}
              />
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-xl overflow-hidden z-50 animate-slide-up"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-main)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {/* User header */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #0a1628, #162238)',
                        color: roleColor,
                        border: `1.5px solid ${roleColor}50`,
                      }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
                        {user?.fullName ?? 'User'}
                      </p>
                      <span
                        className="text-xs font-medium"
                        style={{
                          color: roleColor,
                          background: `${roleColor}15`,
                          border: `1px solid ${roleColor}30`,
                          padding: '0 6px',
                          borderRadius: 99,
                          display: 'inline-block',
                          lineHeight: 1.7,
                          fontSize: 10,
                        }}
                      >
                        {user?.role ?? 'Student'}
                      </span>
                    </div>
                  </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
            style={{ background: '#1e2a3a', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
              >
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
                Yes, sign out
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
