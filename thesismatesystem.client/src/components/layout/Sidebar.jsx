import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import clsx from 'clsx'
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  Bell,
  BarChart3,
  GraduationCap,
  LogOut,
  UserCircle,
  ClipboardList,
  Star,
  ChevronRight,
  Upload,
  Cpu,
  CalendarClock,
  ShieldCheck,
  BookOpen,
} from 'lucide-react'

const navByRole = {
  SuperAdmin: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'User Management', icon: ShieldCheck, to: '/users' },
    { label: 'Manage Groups', icon: Users, to: '/groups' },
    { label: 'All Documents', icon: FileText, to: '/documents' },
    { label: 'Defense Schedules', icon: Calendar, to: '/defenses' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
  ],
  Admin: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'User Management', icon: ShieldCheck, to: '/users' },
    { label: 'Manage Groups', icon: Users, to: '/groups' },
    { label: 'Consultations', icon: MessageSquare, to: '/consultations' },
    { label: 'Defense Schedules', icon: Calendar, to: '/defenses' },
    { label: 'Reports', icon: BarChart3, to: '/reports' },
  ],
  Adviser: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'My Groups', icon: Users, to: '/groups' },
    { label: 'Manuscripts', icon: BookOpen, to: '/documents' },
    { label: 'System Tracker', icon: Cpu, to: '/system-features' },
    { label: 'Consultations', icon: MessageSquare, to: '/consultations' },
    { label: 'Defense Schedule', icon: Calendar, to: '/defenses' },
  ],
  FacultyIC: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Consultation Manager', icon: CalendarClock, to: '/consultation-manager' },
    { label: 'Presentations', icon: Calendar, to: '/defenses' },
    { label: 'Calendar', icon: CalendarClock, to: '/calendar' },
  ],
  Student: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'My Group', icon: Users, to: '/groups' },
    { label: 'Upload Documents', icon: Upload, to: '/documents' },
    { label: 'System Tracker', icon: Cpu, to: '/system-features' },
    { label: 'Consultation Calendar', icon: CalendarClock, to: '/calendar' },
    { label: 'Defense Schedule', icon: Calendar, to: '/defenses' },
  ],
  Panel: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Defense Schedule', icon: Calendar, to: '/defenses' },
    { label: 'Rate Defenses', icon: Star, to: '/ratings' },
  ],
}

const roleColors = {
  SuperAdmin: 'text-red-400',
  Admin: 'text-orange-400',
  Adviser: 'text-emerald-400',
  FacultyIC: 'text-blue-400',
  Student: 'text-sky-400',
  Panel: 'text-violet-400',
}

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role ?? 'Student'
  const navItems = navByRole[role] ?? navByRole.Student

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'TM'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  function handleNav() {
    onClose?.()
  }

  return (
    <aside className="h-full flex flex-col" style={{ background: '#0a1628', boxShadow: '4px 0 24px rgba(0,0,0,0.18)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #d4b565 100%)' }}>
          <GraduationCap size={18} style={{ color: '#0a1628' }} />
        </div>
        <div>
          <p className="text-white font-display font-semibold text-base leading-none tracking-wide">ThesisMate</p>
          <p className="text-xs mt-0.5" style={{ color: '#c9a84c', fontSize: '10px', letterSpacing: '0.06em' }}>PSU LINGAYEN</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <p className="px-3 mb-2 text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>
          Navigation
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}
                onClick={handleNav}
              >
                <item.icon size={17} strokeWidth={1.75} />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="my-4 mx-1" style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

        <p className="px-3 mb-2 text-xs font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>
          Account
        </p>
        <ul className="space-y-0.5">
          <li>
            <NavLink to="/notifications" className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}>
              <Bell size={17} strokeWidth={1.75} />
              <span>Notifications</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/profile" className={({ isActive }) => clsx('sidebar-item', isActive && 'active')}>
              <UserCircle size={17} strokeWidth={1.75} />
              <span>My Profile</span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* User profile */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all"
          style={{ background: 'rgba(255,255,255,0.04)' }}
          onClick={() => navigate('/profile')}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #1e3350 0%, #27416a 100%)', color: '#c9a84c', border: '1.5px solid rgba(201,168,76,0.3)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate leading-tight">{user?.fullName ?? 'User'}</p>
            <p className={clsx('text-xs leading-tight truncate', roleColors[role] ?? 'text-slate-400')}>{role}</p>
          </div>
          <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
        </div>
        <button
          onClick={handleLogout}
          className="mt-1.5 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
          style={{ color: '#64748b' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}
        >
          <LogOut size={15} strokeWidth={1.75} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}
