import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logo from '../../assets/ThesisMate-logo.png'
import {
  LayoutDashboard, Users, FileText, MessageSquare, Calendar,
  Bell, BarChart3, UserCircle, Star, Upload, Cpu, CalendarClock,
  ShieldCheck, BookOpen, School, Megaphone, PenLine, LogOut, Activity,
  ChevronLeft, ChevronRight, GraduationCap, Building2, CalendarRange,
} from 'lucide-react'

// ── Role config ───────────────────────────────────────────────────────
const roleConfig = {
  SuperAdmin: { color: '#f87171', label: 'Super Admin' },
  Admin:      { color: '#fb923c', label: 'Admin' },
  Faculty:    { color: '#34d399', label: 'Faculty' },
  Student:    { color: '#38bdf8', label: 'Student' },
}

// ── Nav definitions ───────────────────────────────────────────────────
const navByRole = {
  SuperAdmin: [
    { label: 'Dashboard',        icon: LayoutDashboard, to: '/dashboard' },
    { label: 'User Management',  icon: ShieldCheck,     to: '/users' },
    { label: 'Classrooms',       icon: Building2,       to: '/classrooms' },
    { label: 'Advisers',         icon: GraduationCap,   to: '/advisers' },
    { label: 'Manage Groups',    icon: Users,           to: '/groups' },
    { label: 'All Documents',    icon: FileText,        to: '/documents' },
    { label: 'Monitoring',       icon: Activity,        to: '/monitoring' },
    { label: 'Defense Schedules',  icon: Calendar,      to: '/defenses' },
    { label: 'Defense Scheduler',  icon: CalendarRange, to: '/defense-scheduler' },
    { label: 'Reports',            icon: BarChart3,     to: '/reports' },
  ],
  Admin: [
    { label: 'Dashboard',        icon: LayoutDashboard, to: '/dashboard' },
    { label: 'User Management',  icon: ShieldCheck,     to: '/users' },
    { label: 'Classrooms',       icon: Building2,       to: '/classrooms' },
    { label: 'Advisers',         icon: GraduationCap,   to: '/advisers' },
    { label: 'Manage Groups',    icon: Users,           to: '/groups' },
    { label: 'Chapters',         icon: FileText,        to: '/chapters' },
    { label: 'Monitoring',       icon: Activity,        to: '/monitoring' },
    { label: 'Consultations',    icon: MessageSquare,   to: '/consultations' },
    { label: 'Defense Schedules',  icon: Calendar,      to: '/defenses' },
    { label: 'Defense Scheduler',  icon: CalendarRange, to: '/defense-scheduler' },
    { label: 'Reports',            icon: BarChart3,     to: '/reports' },
  ],
  Faculty: [
    { label: 'Dashboard',             icon: LayoutDashboard, to: '/dashboard' },
    { label: 'My Groups',             icon: Users,           to: '/groups' },
    { label: 'Manuscripts',           icon: BookOpen,        to: '/documents' },
    { label: 'Manuscript Review',     icon: PenLine,         to: '/manuscript' },
    { label: 'Chapters',              icon: FileText,        to: '/chapters' },
    { label: 'System Tracker',        icon: Cpu,             to: '/system-features' },
    { label: 'Monitoring',            icon: Activity,        to: '/monitoring' },
    { label: 'Consultations',         icon: MessageSquare,   to: '/consultations' },
    { label: 'Classroom',             icon: School,          to: '/classroom' },
    { label: 'Consultation Manager',  icon: CalendarClock,   to: '/consultation-manager' },
    { label: 'Defense Schedules',  icon: Calendar,      to: '/defenses' },
    { label: 'Defense Scheduler',  icon: CalendarRange, to: '/defense-scheduler' },
    { label: 'Rate Defenses',      icon: Star,          to: '/ratings' },
    { label: 'Reports',               icon: BarChart3,       to: '/reports' },
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
}

const accountItems = [
  { label: 'Notifications', icon: Bell,        to: '/notifications' },
  { label: 'My Profile',    icon: UserCircle,  to: '/profile' },
]

export default function Sidebar({ onClose, collapsed, onToggleCollapse }) {
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

      {/* Grid dot pattern */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, rgba(201,168,76,0.08) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        zIndex: 0,
      }} />

      {/* ── Brand block ──────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center pt-6 pb-5" style={{ paddingInline: collapsed ? '6px' : '16px' }}>
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
              width: 44, height: 44,
              borderRadius: 12,
              background: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.35), 0 0 0 1px rgba(201,168,76,0.2)',
              display: 'block',
              flexShrink: 0,
            }}
          />
        </div>

        {!collapsed && (
          <>
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
          </>
        )}
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

      {/* ── Collapse toggle row — desktop only ──────────── */}
      <div
        className="hidden lg:flex relative z-10"
        style={{
          justifyContent: collapsed ? 'center' : 'flex-end',
          padding: '6px 10px',
        }}
      >
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22, height: 22,
            borderRadius: 7,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.15)'; e.currentTarget.style.color = '#c9a84c' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)' }}
        >
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav
        className="relative z-10 flex-1 overflow-y-auto py-4"
        style={{ paddingInline: collapsed ? '8px' : '12px', scrollbarWidth: 'none' }}
      >
        {/* Main nav items */}
        <ul className="space-y-0.5">
          {navItems.map(item => (
            <li key={item.to}>
              <NavItem item={item} onNav={handleNav} collapsed={collapsed} />
            </li>
          ))}
        </ul>

        {/* Dot separator */}
        <div className="flex items-center justify-center gap-1.5 my-4" aria-hidden>
          {collapsed ? (
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'block' }} />
          ) : (
            [0, 1, 2].map(i => (
              <span key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'block' }} />
            ))
          )}
        </div>

        {/* Account nav items */}
        <ul className="space-y-0.5">
          {accountItems.map(item => (
            <li key={item.to}>
              <NavItem item={item} onNav={handleNav} collapsed={collapsed} />
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
        {collapsed ? (
          /* Collapsed: avatar only, centered */
          <div
            className="flex justify-center items-center cursor-pointer"
            onClick={() => { navigate('/profile'); onClose?.() }}
            title={user?.fullName ?? 'My Profile'}
          >
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
              <span style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 9, height: 9, borderRadius: '50%',
                background: '#22c55e', border: '2px solid #071018',
              }} />
            </div>
          </div>
        ) : (
          /* Expanded: full user card */
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
        )}
      </div>
    </aside>
  )
}

// ── Individual nav item ────────────────────────────────────────────────
function NavItem({ item, onNav, collapsed }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNav}
      title={collapsed ? item.label : undefined}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      {({ isActive }) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 11,
            padding: collapsed ? '7px 0' : '7px 10px',
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

          {/* Label — hidden when collapsed */}
          {!collapsed && (
            <span style={{
              fontSize: 13,
              fontWeight: isActive ? 600 : 450,
              color: isActive ? '#f0ece4' : 'rgba(255,255,255,0.45)',
              lineHeight: 1,
              transition: 'color 0.15s, font-weight 0.15s',
              letterSpacing: '-0.1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}>
              {item.label}
            </span>
          )}

          {/* Active dot — expanded only */}
          {isActive && !collapsed && (
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
