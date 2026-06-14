import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusLabel, statusVariant } from '../../components/ui/Badge'
import {
  Users, FileText, Calendar, Clock, CheckCircle2, AlertCircle,
  TrendingUp, BookOpen, ArrowRight, Plus, Star, BarChart3,
  GraduationCap, MessageSquare, Upload, Cpu, CalendarClock, ShieldCheck
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <div
      className="stat-card cursor-pointer group"
      onClick={onClick}
      style={{ transition: 'all 0.2s ease' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12), 0 12px 32px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = ''
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color.bg }}>
          <Icon size={18} style={{ color: color.icon }} strokeWidth={1.75} />
        </div>
        <ArrowRight size={15} className="opacity-0 group-hover:opacity-100 transition-opacity mt-1" style={{ color: 'var(--text-muted)' }} />
      </div>
      <p className="text-3xl font-display font-semibold mb-1" style={{ color: 'var(--text-heading)', letterSpacing: '-1px' }}>
        {value}
      </p>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {children}
    </div>
  )
}

function CardHeader({ title, action }) {
  return (
    <div
      className="flex items-center justify-between px-5 pt-5 pb-4 border-b"
      style={{ borderColor: 'var(--border-main)' }}
    >
      <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{title}</p>
      {action}
    </div>
  )
}

function WelcomeBanner({ gradient, border, glow, name, role, sub, extra }) {
  return (
    <div
      className="rounded-2xl p-6 mb-6 relative overflow-hidden"
      style={{ background: gradient, border: `1px solid ${border}` }}
    >
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${glow} 0%, transparent 70%)` }} />
      <div className="relative z-10">
        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{role}</p>
        <h2 className="font-display text-2xl font-semibold text-white" style={{ letterSpacing: '-0.5px' }}>{name}</h2>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.45)' }}>{sub}</p>
        {extra}
      </div>
    </div>
  )
}

function StudentDashboard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #0a1628 0%, #1e3350 100%)"
        border="#27416a"
        glow="#c9a84c"
        role="Welcome back,"
        name={`${user?.fullName?.split(' ')[0] ?? 'Student'} 👋`}
        sub="Keep pushing — your thesis journey is well underway."
        extra={
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-1.5 rounded-full" style={{ width: '40%', background: 'linear-gradient(90deg, #c9a84c, #d4b565)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#c9a84c' }}>40% complete</span>
          </div>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FileText} label="Chapters Submitted" value="2" sub="of 5 required" color={{ bg: '#dbeafe', icon: '#2563eb' }} onClick={() => navigate('/chapters')} />
        <StatCard icon={AlertCircle} label="Pending Revisions" value="1" sub="Needs attention" color={{ bg: '#fef3c7', icon: '#d97706' }} onClick={() => navigate('/chapters')} />
        <StatCard icon={MessageSquare} label="Consultations" value="3" sub="This semester" color={{ bg: '#d1fae5', icon: '#16a34a' }} onClick={() => navigate('/consultations')} />
        <StatCard icon={Calendar} label="Defense Date" value="Jul 15" sub="2025 · 9:00 AM" color={{ bg: '#ede9fe', icon: '#7c3aed' }} onClick={() => navigate('/defenses')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Chapter Submissions" action={<button className="btn-ghost text-xs" onClick={() => navigate('/chapters')}>View all →</button>} />
          <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
            {[
              { chapter: 'Chapter 1', title: 'Introduction', status: 'Approved', date: 'May 10' },
              { chapter: 'Chapter 2', title: 'Review of Literature', status: 'Approved', date: 'May 22' },
              { chapter: 'Chapter 3', title: 'Methodology', status: 'NeedsRevision', date: 'Jun 5' },
              { chapter: 'Chapter 4', title: 'Results & Discussion', status: 'Pending', date: '—' },
              { chapter: 'Chapter 5', title: 'Conclusion', status: 'Pending', date: '—' },
            ].map((c) => (
              <div key={c.chapter} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: c.status === 'Approved' ? '#d1fae5' : c.status === 'NeedsRevision' ? '#fff7ed' : 'var(--bg-subtle)',
                      color: c.status === 'Approved' ? '#16a34a' : c.status === 'NeedsRevision' ? '#ea580c' : 'var(--text-muted)',
                    }}
                  >
                    {c.chapter.replace('Chapter ', 'C')}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.date}</p>
                  </div>
                </div>
                <Badge variant={statusVariant(c.status)} size="sm">{statusLabel(c.status)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Quick Actions" />
          <div className="p-4 space-y-2">
            {[
              { icon: Upload, label: 'Upload a document', to: '/documents' },
              { icon: Cpu, label: 'View system tracker', to: '/system-features' },
              { icon: CalendarClock, label: 'Consultation calendar', to: '/calendar' },
              { icon: Calendar, label: 'Defense schedule', to: '/defenses' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border-main)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)' }}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
                  <a.icon size={14} style={{ color: '#c9a84c' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
                <ArrowRight size={13} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function AdviserDashboard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #064e3b 0%, #065f46 100%)"
        border="#047857"
        glow="#34d399"
        role="Good day,"
        name={`${user?.fullName ?? 'Adviser'} 🎓`}
        sub="You have pending chapter reviews awaiting your response."
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Active Advisees" value="3" sub="groups" color={{ bg: '#d1fae5', icon: '#16a34a' }} onClick={() => navigate('/groups')} />
        <StatCard icon={FileText} label="Pending Reviews" value="2" sub="awaiting response" color={{ bg: '#fef3c7', icon: '#d97706' }} onClick={() => navigate('/chapters')} />
        <StatCard icon={MessageSquare} label="This Week" value="1" sub="consultation scheduled" color={{ bg: '#dbeafe', icon: '#2563eb' }} onClick={() => navigate('/consultations')} />
        <StatCard icon={Calendar} label="Upcoming Defenses" value="2" sub="this month" color={{ bg: '#ede9fe', icon: '#7c3aed' }} onClick={() => navigate('/defenses')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Pending Reviews" action={<button className="btn-ghost text-xs" onClick={() => navigate('/chapters')}>View all →</button>} />
          <div className="divide-y px-1" style={{ borderColor: 'var(--border-light)' }}>
            {[
              { group: 'Group Alpha', title: 'Chapter 3 — Methodology', student: 'dela Cruz, J.', date: 'Jun 8' },
              { group: 'Group Beta', title: 'Chapter 2 — Literature Review', student: 'Reyes, M.', date: 'Jun 6' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#fef3c7', color: '#92400e' }}>
                    {item.group.split(' ')[1][0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.group} · {item.student} · {item.date}</p>
                  </div>
                </div>
                <button className="btn-primary text-xs px-3 py-1.5">Review</button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="My Advisees" action={<button className="btn-ghost text-xs" onClick={() => navigate('/groups')}>View all →</button>} />
          <div className="divide-y px-1" style={{ borderColor: 'var(--border-light)' }}>
            {[
              { name: 'Group Alpha', members: 4, progress: 60 },
              { name: 'Group Beta', members: 3, progress: 40 },
              { name: 'Group Gamma', members: 4, progress: 20 },
            ].map((g, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{g.name}</p>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.members} members</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${g.progress}%`, background: g.progress >= 50 ? '#16a34a' : g.progress >= 30 ? '#d97706' : '#e8e1d0' }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{g.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function AdminDashboard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
        border="#4338ca"
        glow="#818cf8"
        role="System overview,"
        name={`${user?.fullName ?? 'Admin'} 🛡`}
        sub="AY 2024–2025 · Semester 2 · 3 defenses pending scheduling"
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Groups" value="15" sub="+3 this semester" color={{ bg: '#dbeafe', icon: '#2563eb' }} onClick={() => navigate('/groups')} />
        <StatCard icon={GraduationCap} label="Active Defenses" value="2" sub="this month" color={{ bg: '#d1fae5', icon: '#16a34a' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={AlertCircle} label="Pending Approvals" value="5" sub="chapters to review" color={{ bg: '#fef3c7', icon: '#d97706' }} onClick={() => navigate('/chapters')} />
        <StatCard icon={BarChart3} label="Reports" value="8" sub="this semester" color={{ bg: '#ede9fe', icon: '#7c3aed' }} onClick={() => navigate('/reports')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader
              title="Upcoming Defenses"
              action={<button className="btn-primary text-xs px-3 py-1.5" onClick={() => navigate('/defenses')}><Plus size={13} /> Schedule</button>}
            />
            <table className="data-table">
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Date & Time</th>
                  <th>Venue</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { group: 'Group Alpha', date: 'Jul 15, 9:00 AM', venue: 'Room 201', status: 'Scheduled' },
                  { group: 'Group Beta', date: 'Jul 16, 1:00 PM', venue: 'AVR Hall', status: 'Scheduled' },
                  { group: 'Group Gamma', date: 'TBD', venue: '—', status: 'Pending' },
                ].map((d, i) => (
                  <tr key={i}>
                    <td className="font-medium">{d.group}</td>
                    <td>{d.date}</td>
                    <td>{d.venue}</td>
                    <td><Badge variant={statusVariant(d.status)} size="sm">{d.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <Card>
          <CardHeader title="Quick Actions" />
          <div className="p-4 space-y-2">
            {[
              { icon: Plus, label: 'Create new group', to: '/groups' },
              { icon: Calendar, label: 'Schedule defense', to: '/defenses' },
              { icon: Users, label: 'Manage users', to: '/users' },
              { icon: BarChart3, label: 'Generate report', to: '/reports' },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(a.to)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-main)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
                  <a.icon size={14} style={{ color: '#c9a84c' }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
                <ArrowRight size={13} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function FacultyICDashboard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #083344 0%, #0e4a5f 100%)"
        border="#0e7490"
        glow="#22d3ee"
        role="Faculty in Charge,"
        name={`${user?.fullName ?? 'FacultyIC'} 📋`}
        sub="Manage consultation schedules and group presentations."
      />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard icon={CalendarClock} label="Consultation Slots" value="4" sub="this week" color={{ bg: '#cffafe', icon: '#0891b2' }} onClick={() => navigate('/consultation-manager')} />
        <StatCard icon={Calendar} label="Active Presentations" value="2" sub="groups presenting" color={{ bg: '#d1fae5', icon: '#16a34a' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={Users} label="Groups Managed" value="8" sub="total" color={{ bg: '#fef3c7', icon: '#d97706' }} onClick={() => navigate('/consultation-manager')} />
      </div>
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="p-4 space-y-2">
          {[
            { icon: Plus, label: 'Create consultation slot', to: '/consultation-manager' },
            { icon: Calendar, label: 'Manage presentations', to: '/defenses' },
            { icon: CalendarClock, label: 'View calendar', to: '/calendar' },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-main)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
                <a.icon size={14} style={{ color: '#c9a84c' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
              <ArrowRight size={13} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

function PanelDashboard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)"
        border="#7c3aed"
        glow="#a78bfa"
        role="Welcome,"
        name={`${user?.fullName ?? 'Panelist'} ⭐`}
        sub="You have defenses to evaluate. Ratings open when activated by FacultyIC."
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Calendar} label="Assigned Defenses" value="2" sub="this month" color={{ bg: '#ede9fe', icon: '#7c3aed' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={Star} label="Ratings Submitted" value="5" sub="total" color={{ bg: '#fef3c7', icon: '#d97706' }} onClick={() => navigate('/ratings')} />
        <StatCard icon={CheckCircle2} label="Completed Reviews" value="3" sub="this semester" color={{ bg: '#d1fae5', icon: '#16a34a' }} />
      </div>

      <Card>
        <CardHeader title="My Assigned Defenses" />
        <table className="data-table">
          <thead>
            <tr>
              <th>Group</th>
              <th>Thesis Title</th>
              <th>Date & Time</th>
              <th>Rating</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {[
              { group: 'Group Alpha', title: 'AI-Based Attendance System using Facial Recognition', date: 'Jul 15, 9:00 AM', open: true },
              { group: 'Group Beta', title: 'Mobile App for PSU Scheduling and Announcements', date: 'Jul 16, 1:00 PM', open: false },
            ].map((d, i) => (
              <tr key={i}>
                <td className="font-semibold">{d.group}</td>
                <td style={{ maxWidth: '200px' }}><p className="truncate text-sm">{d.title}</p></td>
                <td>{d.date}</td>
                <td>
                  {d.open
                    ? <Badge variant="approved" size="sm">Open</Badge>
                    : <Badge variant="secondary" size="sm">Locked</Badge>
                  }
                </td>
                <td>
                  {d.open
                    ? <button className="btn-primary text-xs px-3 py-1.5" onClick={() => navigate('/ratings')}>Rate</button>
                    : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Immutable</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function SuperAdminDashboard({ user }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #18181b 0%, #27272a 100%)"
        border="#3f3f46"
        glow="#a1a1aa"
        role="Super Administrator,"
        name={`${user?.fullName ?? 'SuperAdmin'} 🔐`}
        sub="Full system access — manage all users, roles, and data."
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value="—" sub="all roles" color={{ bg: '#dbeafe', icon: '#2563eb' }} onClick={() => navigate('/users')} />
        <StatCard icon={GraduationCap} label="Total Groups" value="—" sub="all statuses" color={{ bg: '#d1fae5', icon: '#16a34a' }} onClick={() => navigate('/groups')} />
        <StatCard icon={ShieldCheck} label="User Management" value="Admin" sub="manage accounts" color={{ bg: '#fef3c7', icon: '#d97706' }} onClick={() => navigate('/users')} />
        <StatCard icon={BarChart3} label="Reports" value="—" sub="system-wide" color={{ bg: '#ede9fe', icon: '#7c3aed' }} onClick={() => navigate('/reports')} />
      </div>
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { icon: Users, label: 'Manage users', to: '/users' },
            { icon: GraduationCap, label: 'Manage groups', to: '/groups' },
            { icon: Calendar, label: 'Defense schedules', to: '/defenses' },
            { icon: BarChart3, label: 'Generate report', to: '/reports' },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-main)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-light)'}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
                <a.icon size={14} style={{ color: '#c9a84c' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const dashboards = {
    Student: StudentDashboard,
    Adviser: AdviserDashboard,
    Admin: AdminDashboard,
    SuperAdmin: SuperAdminDashboard,
    FacultyIC: FacultyICDashboard,
    Panel: PanelDashboard,
  }

  const RoleDashboard = dashboards[user?.role] ?? StudentDashboard

  return (
    <div>
      <TopBar
        title={`${greeting()}, ${user?.fullName?.split(' ')[0] ?? 'there'}`}
        subtitle={new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />
      <RoleDashboard user={user} />
    </div>
  )
}
