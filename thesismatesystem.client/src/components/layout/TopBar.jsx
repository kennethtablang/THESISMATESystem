import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Bell, Search, Sun, Moon, Menu, LogOut, UserCircle, ChevronDown,
  LayoutDashboard, Users, FileText, Calendar, BarChart3,
  Upload, Cpu, Activity, BookOpen, Building2,
  GraduationCap, CalendarRange, ClipboardList, Star, PenLine, X, ArrowRight,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { groupService, authService } from '../../services/api'

const ROLE_COLORS = {
  Student:    '#38bdf8',
  Faculty:    '#34d399',
  Admin:      '#fb923c',
  SuperAdmin: '#f87171',
}

// ── Nav shortcuts per role ─────────────────────────────────────────────────────
const NAV_BY_ROLE = {
  SuperAdmin: [
    { label: 'Dashboard',         icon: LayoutDashboard, to: '/dashboard'          },
    { label: 'User Management',   icon: Users,           to: '/users'              },
    { label: 'Manage Groups',     icon: Users,           to: '/groups'             },
    { label: 'Classrooms',        icon: Building2,       to: '/classrooms'         },
    { label: 'Advisers',          icon: GraduationCap,   to: '/advisers'           },
    { label: 'System Tracker',    icon: Cpu,             to: '/system-features'    },
    { label: 'Defense Scheduler', icon: CalendarRange,   to: '/defense-scheduler'  },
    { label: 'Rubric Manager',    icon: ClipboardList,   to: '/rubric-manager'     },
    { label: 'Monitoring',        icon: Activity,        to: '/monitoring'         },
    { label: 'Reports',           icon: BarChart3,       to: '/reports'            },
    { label: 'Notifications',     icon: Bell,            to: '/notifications'      },
    { label: 'My Profile',        icon: UserCircle,      to: '/profile'            },
  ],
  Admin: [
    { label: 'Dashboard',         icon: LayoutDashboard, to: '/dashboard'          },
    { label: 'User Management',   icon: Users,           to: '/users'              },
    { label: 'Manage Groups',     icon: Users,           to: '/groups'             },
    { label: 'Classrooms',        icon: Building2,       to: '/classrooms'         },
    { label: 'Chapters',          icon: FileText,        to: '/chapters'           },
    { label: 'Defense Scheduler', icon: CalendarRange,   to: '/defense-scheduler'  },
    { label: 'Rubric Manager',    icon: ClipboardList,   to: '/rubric-manager'     },
    { label: 'Monitoring',        icon: Activity,        to: '/monitoring'         },
    { label: 'Reports',           icon: BarChart3,       to: '/reports'            },
    { label: 'Notifications',     icon: Bell,            to: '/notifications'      },
    { label: 'My Profile',        icon: UserCircle,      to: '/profile'            },
  ],
  Faculty: [
    { label: 'Dashboard',             icon: LayoutDashboard, to: '/dashboard'          },
    { label: 'My Groups',             icon: Users,           to: '/groups'             },
    { label: 'Manuscripts',           icon: BookOpen,        to: '/documents'          },
    { label: 'Defense Schedules',     icon: Calendar,        to: '/defenses'           },
    { label: 'Defense Scheduler',     icon: CalendarRange,   to: '/defense-scheduler'  },
    { label: 'Rubric Manager',        icon: ClipboardList,   to: '/rubric-manager'     },
    { label: 'Rate Defenses',         icon: Star,            to: '/ratings'            },
    { label: 'Monitoring',            icon: Activity,        to: '/monitoring'         },
    { label: 'Notifications',         icon: Bell,            to: '/notifications'      },
    { label: 'My Profile',            icon: UserCircle,      to: '/profile'            },
  ],
  Student: [
    { label: 'Dashboard',             icon: LayoutDashboard, to: '/dashboard'   },
    { label: 'My Group',              icon: Users,           to: '/groups'      },
    { label: 'Manuscript',            icon: PenLine,         to: '/manuscript'  },
    { label: 'Upload Documents',      icon: Upload,          to: '/documents'   },
    { label: 'System Tracker',        icon: Cpu,             to: '/system-features' },
    { label: 'Defense Schedule',      icon: Calendar,        to: '/defenses'    },
    { label: 'Monitoring',            icon: Activity,        to: '/monitoring'  },
    { label: 'Notifications',         icon: Bell,            to: '/notifications' },
    { label: 'My Profile',            icon: UserCircle,      to: '/profile'     },
  ],
}

// ── Search Modal ───────────────────────────────────────────────────────────────
function SearchModal({ onClose, role }) {
  const navigate = useNavigate()
  const inputRef  = useRef(null)
  const listRef   = useRef(null)

  const [query,    setQuery]    = useState('')
  const [groups,   setGroups]   = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selIdx,   setSelIdx]   = useState(0)

  const isAdmin = role === 'Admin' || role === 'SuperAdmin'
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.Student

  // Fetch data once on mount
  useEffect(() => {
    const fetches = [groupService.list().catch(() => [])]
    if (isAdmin) fetches.push(authService.allUsers().catch(() => []))
    Promise.all(fetches).then(([gs, us]) => {
      setGroups(Array.isArray(gs) ? gs : [])
      setUsers(Array.isArray(us) ? us : [])
    }).finally(() => setLoading(false))
    inputRef.current?.focus()
  }, [])

  // Build results
  const q = query.trim().toLowerCase()

  const matchedNav = q
    ? navItems.filter(n => n.label.toLowerCase().includes(q))
    : navItems.slice(0, 6)

  const matchedGroups = groups.filter(g =>
    !q ||
    g.groupName?.toLowerCase().includes(q) ||
    g.projectTitle?.toLowerCase().includes(q)
  ).slice(0, 5)

  const matchedUsers = isAdmin
    ? users.filter(u =>
        q && (
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
        )
      ).slice(0, 4)
    : []

  // Flat list for keyboard nav
  const flat = [
    ...matchedNav.map(n => ({ kind: 'nav',   data: n })),
    ...matchedGroups.map(g => ({ kind: 'group', data: g })),
    ...matchedUsers.map(u => ({ kind: 'user',  data: u })),
  ]

  useEffect(() => { setSelIdx(0) }, [q])

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selIdx])

  function go(item) {
    if (item.kind === 'nav')   navigate(item.data.to)
    if (item.kind === 'group') navigate(`/groups/${item.data.id}`)
    if (item.kind === 'user')  navigate('/users')
    onClose()
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx(i => Math.min(i + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && flat[selIdx]) go(flat[selIdx])
    if (e.key === 'Escape') onClose()
  }

  const ROLE_BADGE = { Student: '#38bdf8', Faculty: '#34d399', Admin: '#fb923c', SuperAdmin: '#f87171' }

  let idxCounter = -1

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-xl rounded-2xl overflow-hidden animate-slide-up"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-main)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.15)',
        }}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search pages, groups, users…"
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)', caretColor: '#c9a84c' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
              <X size={14} />
            </button>
          )}
          <kbd style={{
            fontSize: 10, color: 'var(--text-muted)',
            background: 'var(--bg-subtle)', border: '1px solid var(--border-main)',
            borderRadius: 5, padding: '2px 6px', fontFamily: 'monospace', flexShrink: 0,
          }}>
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} style={{ maxHeight: '60vh', overflowY: 'auto', scrollbarWidth: 'none' }}>
          {loading && (
            <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Loading…
            </div>
          )}

          {!loading && flat.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No results for "{query}"</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try a different keyword</p>
            </div>
          )}

          {!loading && matchedNav.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {q ? 'Pages' : 'Quick Navigation'}
              </p>
              {matchedNav.map(n => {
                idxCounter++
                const i = idxCounter
                const active = selIdx === i
                return (
                  <button
                    key={n.to}
                    data-idx={i}
                    onMouseEnter={() => setSelIdx(i)}
                    onClick={() => go({ kind: 'nav', data: n })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75"
                    style={{ background: active ? 'var(--bg-subtle)' : 'transparent' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: active ? 'rgba(201,168,76,0.15)' : 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                      <n.icon size={13} style={{ color: active ? '#c9a84c' : 'var(--text-muted)' }} />
                    </div>
                    <span className="text-sm font-medium flex-1" style={{ color: active ? 'var(--text-heading)' : 'var(--text-primary)' }}>
                      {n.label}
                    </span>
                    {active && <ArrowRight size={13} style={{ color: '#c9a84c', flexShrink: 0 }} />}
                  </button>
                )
              })}
            </div>
          )}

          {!loading && matchedGroups.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Groups
              </p>
              {matchedGroups.map(g => {
                idxCounter++
                const i = idxCounter
                const active = selIdx === i
                return (
                  <button
                    key={g.id}
                    data-idx={i}
                    onMouseEnter={() => setSelIdx(i)}
                    onClick={() => go({ kind: 'group', data: g })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75"
                    style={{ background: active ? 'var(--bg-subtle)' : 'transparent' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: active ? 'rgba(59,130,246,0.15)' : 'var(--bg-subtle)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
                      {g.groupName?.[0]?.toUpperCase() ?? 'G'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: active ? 'var(--text-heading)' : 'var(--text-primary)' }}>
                        {g.groupName}
                      </p>
                      {g.projectTitle && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{g.projectTitle}</p>
                      )}
                    </div>
                    <span className="text-xs shrink-0 px-1.5 py-0.5 rounded-md"
                      style={{
                        background: g.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                        color: g.status === 'Active' ? '#16a34a' : '#6b7280',
                      }}>
                      {g.status}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {!loading && matchedUsers.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Users
              </p>
              {matchedUsers.map(u => {
                idxCounter++
                const i = idxCounter
                const active = selIdx === i
                const rc = ROLE_BADGE[u.role] ?? '#c9a84c'
                const initials = u.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'
                return (
                  <button
                    key={u.id}
                    data-idx={i}
                    onMouseEnter={() => setSelIdx(i)}
                    onClick={() => go({ kind: 'user', data: u })}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-75"
                    style={{ background: active ? 'var(--bg-subtle)' : 'transparent' }}
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: `${rc}15`, color: rc, border: `1px solid ${rc}30` }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: active ? 'var(--text-heading)' : 'var(--text-primary)' }}>
                        {u.fullName ?? u.email}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                    </div>
                    <span className="text-xs shrink-0 px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: `${rc}15`, color: rc, border: `1px solid ${rc}25` }}>
                      {u.role}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <div className="h-2" />
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t" style={{ borderColor: 'var(--border-light)', background: 'var(--bg-subtle)' }}>
          {[
            { key: '↑↓', label: 'navigate' },
            { key: '↵',  label: 'open' },
            { key: 'Esc', label: 'close' },
          ].map(h => (
            <div key={h.key} className="flex items-center gap-1.5">
              <kbd style={{
                fontSize: 10, color: 'var(--text-muted)',
                background: 'var(--bg-card)', border: '1px solid var(--border-main)',
                borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace',
              }}>
                {h.key}
              </kbd>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{h.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── TopBar ─────────────────────────────────────────────────────────────────────
export default function TopBar({ title, subtitle, left }) {
  const { user, logout } = useAuth()
  const { isDark, toggle } = useTheme()
  const navigate = useNavigate()
  const ctx = useOutletContext()
  const [dropdownOpen,    setDropdownOpen]    = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [searchOpen,      setSearchOpen]      = useState(false)
  const dropdownRef = useRef(null)

  const roleColor = ROLE_COLORS[user?.role] ?? '#c9a84c'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials  = user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'TM'
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
        {/* Left — hamburger + optional back button + title */}
        <div className="flex items-center gap-3 min-w-0">
          {left && left}
          <button
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
            onClick={() => ctx?.toggleSidebar?.()}
          >
            <Menu size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>

          {title && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="shrink-0 hidden sm:block"
                style={{ width: 3, height: 28, borderRadius: 99, background: 'linear-gradient(180deg, #c9a84c 0%, rgba(201,168,76,0.2) 100%)' }}
              />
              <div className="min-w-0">
                <h1
                  className="font-display font-semibold leading-tight truncate"
                  style={{ color: 'var(--text-heading)', letterSpacing: '-0.4px', fontSize: 'clamp(1rem, 2vw, 1.15rem)' }}
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
            onClick={() => setSearchOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-150"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.background = 'var(--bg-card)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-main)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}
          >
            <Search size={14} />
            <span className="hidden md:block" style={{ minWidth: '110px', fontSize: 13 }}>Search…</span>
            <kbd style={{
              display: 'none',
              fontSize: 10, color: 'var(--text-muted)',
              background: 'var(--bg-subtle)', border: '1px solid var(--border-main)',
              borderRadius: 5, padding: '1px 5px', lineHeight: 1.6, fontFamily: 'monospace',
            }}
              className="hidden lg:block"
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
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.background = 'var(--bg-card)' }}
              onMouseLeave={e => { if (!dropdownOpen) { e.currentTarget.style.borderColor = 'var(--border-main)'; e.currentTarget.style.background = 'var(--bg-subtle)' } }}
            >
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
                <span style={{
                  position: 'absolute', bottom: -1, right: -1,
                  width: 8, height: 8, borderRadius: '50%',
                  background: '#22c55e', border: '1.5px solid var(--bg-page)',
                }} />
              </div>

              <div className="hidden md:block text-left leading-tight">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)', lineHeight: 1.2 }}>{firstName}</p>
                <p className="text-xs" style={{ color: roleColor, lineHeight: 1.2, fontSize: 10 }}>{user?.role ?? 'Student'}</p>
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
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #0a1628, #162238)', color: roleColor, border: `1.5px solid ${roleColor}50` }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{user?.fullName ?? 'User'}</p>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: roleColor,
                        background: `${roleColor}15`, border: `1px solid ${roleColor}30`,
                        padding: '0 6px', borderRadius: 99, display: 'inline-block', lineHeight: 1.7,
                      }}>
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

      {/* Search modal */}
      {searchOpen && (
        <SearchModal role={user?.role} onClose={() => setSearchOpen(false)} />
      )}

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
