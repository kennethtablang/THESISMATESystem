import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../assets/ThesisMate-logo.png'
import {
  LayoutDashboard, Users, FileText, MessageSquare, Calendar,
  Bell, BarChart3, UserCircle, Star, Upload, Cpu, CalendarClock,
  ShieldCheck, BookOpen, School, Megaphone, PenLine, LogOut, Activity,
} from 'lucide-react'

// ── Role config ───────────────────────────────────────────────────────
const roleConfig = {
  SuperAdmin: { color: '#f87171', label: 'Super Admin' },
  Admin:      { color: '#fb923c', label: 'Admin' },
  Adviser:    { color: '#34d399', label: 'Adviser' },
  FacultyIC:  { color: '#60a5fa', label: 'Faculty IC' },
  Student:    { color: '#38bdf8', label: 'Student' },
  Panel:      { color: '#a78bfa', label: 'Panelist' },
}

// ── Nav definitions ───────────────────────────────────────────────────
const navByRole = {
  SuperAdmin: [
    { label: 'Dashboard',        icon: LayoutDashboard, to: '/dashboard' },
    { label: 'User Management',  icon: ShieldCheck,     to: '/users' },
    { label: 'Manage Groups',    icon: Users,           to: '/groups' },
    { label: 'All Documents',    icon: FileText,        to: '/documents' },
    { label: 'Monitoring',       icon: Activity,        to: '/monitoring' },
    { label: 'Defense Schedules',icon: Calendar,        to: '/defenses' },
    { label: 'Reports',          icon: BarChart3,       to: '/reports' },
  ],
  Admin: [
    { label: 'Dashboard',        icon: LayoutDashboard, to: '/dashboard' },
    { label: 'User Management',  icon: ShieldCheck,     to: '/users' },
    { label: 'Manage Groups',    icon: Users,           to: '/groups' },
    { label: 'Chapters',         icon: FileText,        to: '/chapters' },
    { label: 'Monitoring',       icon: Activity,        to: '/monitoring' },
    { label: 'Consultations',    icon: MessageSquare,   to: '/consultations' },
    { label: 'Defense Schedules',icon: Calendar,        to: '/defenses' },
    { label: 'Reports',          icon: BarChart3,       to: '/reports' },
  ],
  Adviser: [
    { label: 'Dashboard',        icon: LayoutDashboard, to: '/dashboard' },
    { label: 'My Groups',        icon: Users,           to: '/groups' },
    { label: 'Manuscripts',      icon: BookOpen,        to: '/documents' },
    { label: 'Manuscript Review', icon: PenLine,         to: '/manuscript' },
    { label: 'System Tracker',   icon: Cpu,             to: '/system-features' },
    { label: 'Monitoring',       icon: Activity,        to: '/monitoring' },
    { label: 'Consultations',    icon: MessageSquare,   to: '/consultations' },
    { label: 'Defense Schedule', icon: Calendar,        to: '/defenses' },
  ],
  FacultyIC: [
    { label: 'Dashboard',          icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Classroom',          icon: School,          to: '/classroom' },
    { label: 'Manuscript Monitor', icon: PenLine,         to: '/manuscript' },
    { label: 'Monitoring',         icon: Activity,        to: '/monitoring' },
    { label: 'Consultation Manager',icon: CalendarClock,  to: '/consultation-manager' },
    { label: 'Defense Schedules',  icon: Calendar,        to: '/defenses' },
    { label: 'Reports',            icon: BarChart3,       to: '/reports' },
  ],
  Student: [
    { label: 'Dashboard',            icon: LayoutDashboard, to: '/dashboard' },
    { label: 'My Class',             icon: Megaphone,       to: '/my-class' },
    { label: 'My Group',             icon: Users,           to: '/groups' },
    { label: 'Manuscript',           icon: PenLine,         to: '/manuscript' },
    { label: 'Upload Documents',     icon: Upload,          to: '/documents' },
    { label: 'System Tracker',       icon: Cpu,             to: '/system-features' },
    { label: 'Monitoring',           icon: Activity,        to: '/monitoring' },
    { label: 'Consultation Calendar',icon: CalendarClock,   to: '/calendar' },
    { label: 'Defense Schedule',     icon: Calendar,        to: '/defenses' },
  ],
  Panel: [
    { label: 'Dashboard',          icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Manuscript Monitor', icon: PenLine,         to: '/manuscript' },
    { label: 'Defense Schedule',   icon: Calendar,        to: '/defenses' },
    { label: 'Rate Defenses',      icon: Star,            to: '/ratings' },
  ],
}

const accountItems = [
  { label: 'Notifications', icon: Bell,        to: '/notifications' },
  { label: 'My Profile',    icon: UserCircle,  to: '/profile' },
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role ?? 'Student'
  const navItems = navByRole[role] ?? navByRole.Student
  const { color: roleColor, label: roleLabel } = roleConfig[role] ?? roleConfig.Student

  const initials = user?.fullName
    ? user.fullName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'TM'

  function handleNav() { onClose?.() }

  return (
    <aside
      className="h-full flex flex-col select-none"
      style={{
        background: 'linear-gradient(180deg, #0d1f38 0%, #071018 100%)',
        boxShadow: '4px 0 32px rgba(0,0,0,0.28)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background depth glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 20% 18%, rgba(28,52,88,0.55) 0%, transparent 58%)',
        zIndex: 0,
      }} />

      {/* ── Brand block ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center pt-6 pb-5 px-4">
        {/* Logo with soft glow halo */}
        <div className="relative mb-3">
          <div aria-hidden style={{
            position: 'absolute', inset: -8,
            borderRadius: 20,
            background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <img
            src={logo}
            alt="ThesisMate"
            style={{
              width: 48, height: 48,
              borderRadius: 14,
              background: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.2)',
              display: 'block',
            }}
          />
        </div>

        <p style={{
          color: '#f0ece4',
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '-0.3px',
          lineHeight: 1,
          marginBottom: 4,
        }}>
          ThesisMate
        </p>

        {/* PSU tag with decorative lines */}
        <div className="flex items-center gap-2 w-full justify-center">
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3))' }} />
          <span style={{ color: '#c9a84c', fontSize: 9, letterSpacing: '0.12em', fontWeight: 600, textTransform: 'uppercase' }}>
            PSU Lingayen
          </span>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,168,76,0.3), transparent)' }} />
        </div>
      </div>

      {/* Gold shimmer divider */}
      <div aria-hidden style={{
        height: 1,
        marginInline: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.45) 40%, rgba(201,168,76,0.45) 60%, transparent 100%)',
        flexShrink: 0,
        zIndex: 10,
        position: 'relative',
      }} />

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="relative z-10 flex-1 overflow-y-auto py-4 px-3" style={{ scrollbarWidth: 'none' }}>

        {/* Main nav items */}
        <ul className="space-y-0.5">
          {navItems.map(item => (
            <li key={item.to}>
              <NavItem item={item} onNav={handleNav} />
            </li>
          ))}
        </ul>

        {/* Dot separator */}
        <div className="flex items-center justify-center gap-1.5 my-4" aria-hidden>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'block' }} />
          ))}
        </div>

        {/* Account nav items */}
        <ul className="space-y-0.5">
          {accountItems.map(item => (
            <li key={item.to}>
              <NavItem item={item} onNav={handleNav} />
            </li>
          ))}
        </ul>
      </nav>

      {/* Gold shimmer divider */}
      <div aria-hidden style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.3) 40%, rgba(201,168,76,0.3) 60%, transparent 100%)',
        flexShrink: 0,
        zIndex: 10,
        position: 'relative',
      }} />

      {/* ── User card ──────────────────────────────────── */}
      <div className="relative z-10 p-3">
        <div
          className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => { navigate('/profile'); onClose?.() }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          {/* Avatar with role-colored ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1e3350 0%, #27416a 100%)',
              border: `2px solid ${roleColor}`,
              boxShadow: `0 0 0 3px rgba(0,0,0,0.3), 0 0 12px ${roleColor}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: roleColor,
            }}>
              {initials}
            </div>
            {/* Online dot */}
            <span style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 9, height: 9, borderRadius: '50%',
              background: '#22c55e', border: '2px solid #071018',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: '#f0ece4', fontSize: 13, fontWeight: 600, lineHeight: 1.2, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.fullName ?? 'User'}
            </p>
            {/* Role pill */}
            <span style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
              padding: '1px 7px', borderRadius: 99,
              background: `${roleColor}18`,
              color: roleColor,
              border: `1px solid ${roleColor}35`,
            }}>
              {roleLabel}
            </span>
          </div>

          {/* Log out on hover */}
          <button
            title="Log out"
            onClick={e => { e.stopPropagation(); logout?.() }}
            style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.3)',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }}
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}

// ── Individual nav item ────────────────────────────────────────────────
function NavItem({ item, onNav }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNav}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      {({ isActive }) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: '7px 10px',
            borderRadius: 12,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
        >
          {/* Icon container */}
          <div style={{
            width: 32, height: 32,
            borderRadius: 9,
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s ease',
            background: isActive
              ? 'linear-gradient(135deg, #c9a84c 0%, #a0732a 100%)'
              : 'rgba(255,255,255,0.07)',
            boxShadow: isActive
              ? '0 3px 10px rgba(201,168,76,0.4), 0 0 0 1px rgba(201,168,76,0.25)'
              : 'none',
          }}>
            <item.icon
              size={15}
              strokeWidth={isActive ? 2.2 : 1.8}
              style={{
                color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                transition: 'color 0.15s',
              }}
            />
          </div>

          {/* Label */}
          <span style={{
            fontSize: 13,
            fontWeight: isActive ? 600 : 450,
            color: isActive ? '#f0ece4' : 'rgba(255,255,255,0.45)',
            lineHeight: 1,
            transition: 'color 0.15s, font-weight 0.15s',
            letterSpacing: '-0.1px',
          }}>
            {item.label}
          </span>

          {/* Active right glow accent */}
          {isActive && (
            <div style={{
              marginLeft: 'auto',
              width: 5, height: 5, borderRadius: '50%',
              background: '#c9a84c',
              boxShadow: '0 0 8px 2px rgba(201,168,76,0.55)',
              flexShrink: 0,
            }} />
          )}
        </div>
      )}
    </NavLink>
  )
}
