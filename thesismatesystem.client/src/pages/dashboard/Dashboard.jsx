import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusLabel, statusVariant } from '../../components/ui/Badge'
import {
  Users, FileText, Calendar, AlertCircle, ArrowRight, Plus,
  BarChart3, GraduationCap, MessageSquare, Upload, Cpu,
  CalendarClock, ShieldCheck, CheckCircle2, Star, BookOpen,
} from 'lucide-react'
import {
  groupService, chapterService, consultationService,
  defenseService, consultationScheduleService,
} from '../../services/api'

// ─── Shared UI ───────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <div
      className="stat-card cursor-pointer group"
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12), 0 12px 32px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={e => {
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
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
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

function QuickActions({ items }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 space-y-2">
      {items.map(a => (
        <button
          key={a.label}
          onClick={() => navigate(a.to)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
            <a.icon size={14} style={{ color: '#c9a84c' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
          <ArrowRight size={13} className="ml-auto" style={{ color: 'var(--text-muted)' }} />
        </button>
      ))}
    </div>
  )
}

function DashboardLoader() {
  return (
    <div className="p-4 sm:p-8 flex items-center justify-center h-48">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

function EmptyCard({ icon: Icon, message, hint }) {
  return (
    <div className="px-5 py-10 text-center">
      <Icon size={32} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

// ─── Student Dashboard ────────────────────────────────────────────────────────

function StudentDashboard({ user }) {
  const navigate = useNavigate()
  const [group, setGroup] = useState(null)
  const [chapters, setChapters] = useState([])
  const [consultations, setConsultations] = useState([])
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupService.myGroup()
      .then(g => {
        setGroup(g)
        return Promise.all([
          chapterService.listByGroup(g.id).catch(() => []),
          consultationService.byGroup(g.id).catch(() => []),
          defenseService.mySchedules().catch(() => []),
        ])
      })
      .then(([ch, co, de]) => {
        setChapters(ch)
        setConsultations(co)
        setDefenses(de)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const approved = chapters.filter(c => c.status === 'Approved').length
  const needsRevision = chapters.filter(c => c.status === 'NeedsRevision').length
  const progress = chapters.length > 0 ? Math.round(approved / chapters.length * 100) : 0
  const nextDefense = defenses.find(d => d.status !== 'Cancelled')
  const nextDefenseDate = nextDefense
    ? new Date(nextDefense.scheduledDate ?? nextDefense.dateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : '—'

  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #0a1628 0%, #1e3350 100%)"
        border="#27416a"
        glow="#c9a84c"
        role="Welcome back,"
        name={user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'Student'}
        sub={group
          ? `${group.groupName ?? group.name} — Keep progressing on your capstone.`
          : 'You are not yet assigned to a group.'
        }
        extra={chapters.length > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-1.5 rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #c9a84c, #d4b565)' }} />
            </div>
            <span className="text-xs font-medium" style={{ color: '#c9a84c' }}>
              {approved}/{chapters.length} chapters approved
            </span>
          </div>
        )}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={FileText} label="Chapters Submitted" value={chapters.length} sub={approved > 0 ? `${approved} approved` : 'None yet'} color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }} onClick={() => navigate('/chapters')} />
        <StatCard icon={AlertCircle} label="Needs Revision" value={needsRevision} sub={needsRevision > 0 ? 'Requires attention' : 'None pending'} color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }} onClick={() => navigate('/chapters')} />
        <StatCard icon={MessageSquare} label="Consultations" value={consultations.length} sub="logged this semester" color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }} onClick={() => navigate('/consultations')} />
        <StatCard icon={Calendar} label="Next Defense" value={nextDefenseDate} sub={nextDefense ? 'Scheduled' : 'Not yet set'} color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }} onClick={() => navigate('/defenses')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Chapter Submissions"
            action={<button className="btn-ghost text-xs" onClick={() => navigate('/chapters')}>View all</button>}
          />
          {chapters.length === 0 ? (
            <EmptyCard icon={FileText} message="No chapters submitted yet" hint="Upload your first chapter to get started" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {chapters.map(c => (
                <div key={c.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{
                        background: c.status === 'Approved' ? 'rgba(34,197,94,0.12)' : c.status === 'NeedsRevision' ? 'rgba(245,158,11,0.12)' : 'var(--bg-subtle)',
                        color: c.status === 'Approved' ? '#16a34a' : c.status === 'NeedsRevision' ? '#f59e0b' : 'var(--text-muted)',
                      }}
                    >
                      {c.chapterNumber ?? '—'}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {c.title ?? c.chapterTitle ?? `Chapter ${c.chapterNumber}`}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(c.status)} size="sm">{statusLabel(c.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Quick Actions" />
          <QuickActions items={[
            { icon: Upload, label: 'Upload a document', to: '/documents' },
            { icon: Cpu, label: 'View system tracker', to: '/system-features' },
            { icon: CalendarClock, label: 'Consultation calendar', to: '/calendar' },
            { icon: Calendar, label: 'Defense schedule', to: '/defenses' },
          ]} />
        </Card>
      </div>
    </div>
  )
}

// ─── Adviser Dashboard ────────────────────────────────────────────────────────

function AdviserDashboard({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [pendingChapters, setPendingChapters] = useState([])
  const [consultations, setConsultations] = useState([])
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      consultationService.list().catch(() => []),
      defenseService.list().catch(() => []),
    ]).then(async ([gs, co, de]) => {
      setGroups(gs)
      setConsultations(co)
      setDefenses(de)
      const chaptersByGroup = await Promise.all(
        gs.map(g =>
          chapterService.listByGroup(g.id)
            .then(ch => ch.map(c => ({ ...c, groupName: g.groupName ?? g.name })))
            .catch(() => [])
        )
      )
      const pending = chaptersByGroup.flat().filter(c => c.status === 'Pending' || c.status === 'NeedsRevision')
      setPendingChapters(pending)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const upcomingDefenses = defenses.filter(d => d.status !== 'Cancelled' && d.status !== 'Completed')

  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #064e3b 0%, #065f46 100%)"
        border="#047857"
        glow="#34d399"
        role="Good day,"
        name={user?.fullName ?? 'Adviser'}
        sub={pendingChapters.length > 0
          ? `${pendingChapters.length} chapter${pendingChapters.length !== 1 ? 's' : ''} awaiting your review.`
          : 'No pending chapter reviews at this time.'}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Active Advisees" value={groups.length} sub={groups.length === 1 ? 'group' : 'groups'} color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }} onClick={() => navigate('/groups')} />
        <StatCard icon={FileText} label="Pending Reviews" value={pendingChapters.length} sub="awaiting response" color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }} onClick={() => navigate('/documents')} />
        <StatCard icon={MessageSquare} label="Consultations" value={consultations.length} sub="total logged" color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }} onClick={() => navigate('/consultations')} />
        <StatCard icon={Calendar} label="Upcoming Defenses" value={upcomingDefenses.length} sub="scheduled" color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }} onClick={() => navigate('/defenses')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Pending Reviews"
            action={<button className="btn-ghost text-xs" onClick={() => navigate('/documents')}>View manuscripts</button>}
          />
          {pendingChapters.length === 0 ? (
            <EmptyCard icon={CheckCircle2} message="No pending reviews" hint="All submitted chapters have been reviewed" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {pendingChapters.slice(0, 5).map((c, i) => (
                <div key={c.id ?? i} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                      {c.chapterNumber ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {c.title ?? c.chapterTitle ?? `Chapter ${c.chapterNumber}`}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.groupName}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(c.status)} size="sm">{statusLabel(c.status)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="My Advisees"
            action={<button className="btn-ghost text-xs" onClick={() => navigate('/groups')}>View all</button>}
          />
          {groups.length === 0 ? (
            <EmptyCard icon={Users} message="No groups assigned yet" />
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
              {groups.map(g => {
                const prog = g.milestoneProgress?.completionPercentage ?? 0
                return (
                  <div key={g.id} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{g.groupName ?? g.name}</p>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {g.memberCount ?? g.members?.length ?? 0} members
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                        <div className="h-1.5 rounded-full" style={{
                          width: `${prog}%`,
                          background: prog >= 70 ? '#16a34a' : prog >= 40 ? '#c9a84c' : 'var(--border-main)',
                        }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{prog}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      defenseService.list().catch(() => []),
    ]).then(([gs, de]) => {
      setGroups(gs)
      setDefenses(de)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const activeDefenses = defenses.filter(d => d.status !== 'Cancelled' && d.status !== 'Completed')

  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)"
        border="#4338ca"
        glow="#818cf8"
        role="System overview,"
        name={user?.fullName ?? 'Admin'}
        sub={`${groups.length} capstone group${groups.length !== 1 ? 's' : ''} · ${activeDefenses.length} defense${activeDefenses.length !== 1 ? 's' : ''} scheduled`}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Groups" value={groups.length} sub="registered" color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }} onClick={() => navigate('/groups')} />
        <StatCard icon={GraduationCap} label="Scheduled Defenses" value={activeDefenses.length} sub="upcoming" color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={ShieldCheck} label="User Management" value="Users" sub="manage accounts" color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }} onClick={() => navigate('/users')} />
        <StatCard icon={BarChart3} label="Reports" value="View" sub="system reports" color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }} onClick={() => navigate('/reports')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card>
            <CardHeader
              title="Defense Schedules"
              action={
                <button className="btn-primary text-xs px-3 py-1.5" onClick={() => navigate('/defenses')}>
                  <Plus size={13} /> Schedule
                </button>
              }
            />
            {defenses.length === 0 ? (
              <EmptyCard icon={Calendar} message="No defenses scheduled" hint="Create a defense schedule to get started" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Date &amp; Time</th>
                    <th>Venue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {defenses.slice(0, 8).map(d => (
                    <tr key={d.id}>
                      <td className="font-medium">{d.groupName ?? '—'}</td>
                      <td>
                        {d.scheduledDate ?? d.dateTime
                          ? new Date(d.scheduledDate ?? d.dateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td>{d.venue ?? '—'}</td>
                      <td><Badge variant={statusVariant(d.status)} size="sm">{statusLabel(d.status)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader title="Quick Actions" />
          <QuickActions items={[
            { icon: Plus, label: 'Create new group', to: '/groups' },
            { icon: Calendar, label: 'Schedule defense', to: '/defenses' },
            { icon: Users, label: 'Manage users', to: '/users' },
            { icon: BarChart3, label: 'Generate report', to: '/reports' },
          ]} />
        </Card>
      </div>
    </div>
  )
}

// ─── FacultyIC Dashboard ──────────────────────────────────────────────────────

function FacultyICDashboard({ user }) {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState([])
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      consultationScheduleService.all().catch(() => []),
      defenseService.list().catch(() => []),
    ]).then(([sc, de]) => {
      setSchedules(sc)
      setDefenses(de)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const activeDefenses = defenses.filter(d => d.status !== 'Cancelled' && d.status !== 'Completed')

  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #083344 0%, #0e4a5f 100%)"
        border="#0e7490"
        glow="#22d3ee"
        role="Faculty in Charge,"
        name={user?.fullName ?? 'FacultyIC'}
        sub="Manage consultation schedules and group presentations."
      />
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard icon={CalendarClock} label="Consultation Slots" value={schedules.length} sub="created" color={{ bg: 'rgba(6,182,212,0.12)', icon: '#0891b2' }} onClick={() => navigate('/consultation-manager')} />
        <StatCard icon={Calendar} label="Scheduled Defenses" value={activeDefenses.length} sub="upcoming" color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={Users} label="Groups" value={defenses.length} sub="with defense records" color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }} onClick={() => navigate('/consultation-manager')} />
      </div>
      <Card>
        <CardHeader title="Quick Actions" />
        <QuickActions items={[
          { icon: Plus, label: 'Create consultation slot', to: '/consultation-manager' },
          { icon: Calendar, label: 'Manage presentations', to: '/defenses' },
          { icon: CalendarClock, label: 'View calendar', to: '/calendar' },
        ]} />
      </Card>
    </div>
  )
}

// ─── Panel Dashboard ──────────────────────────────────────────────────────────

function PanelDashboard({ user }) {
  const navigate = useNavigate()
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    defenseService.list().catch(() => []).then(setDefenses).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const completed = defenses.filter(d => d.status === 'Completed').length

  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)"
        border="#7c3aed"
        glow="#a78bfa"
        role="Welcome,"
        name={user?.fullName ?? 'Panelist'}
        sub="Ratings open when activated by the Faculty in Charge."
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Calendar} label="Assigned Defenses" value={defenses.length} sub="total" color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={CheckCircle2} label="Completed" value={completed} sub="defenses reviewed" color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }} />
        <StatCard icon={Star} label="Pending Rating" value={defenses.length - completed} sub="awaiting evaluation" color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }} />
      </div>

      <Card>
        <CardHeader title="Assigned Defenses" />
        {defenses.length === 0 ? (
          <EmptyCard icon={Calendar} message="No defenses assigned yet" hint="Assignments will appear here once scheduled by the Faculty in Charge" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th className="hidden sm:table-cell">Thesis Title</th>
                <th>Date</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {defenses.map(d => (
                <tr key={d.id}>
                  <td className="font-semibold">{d.groupName ?? '—'}</td>
                  <td className="hidden sm:table-cell" style={{ maxWidth: '200px' }}>
                    <p className="truncate text-sm">{d.projectTitle ?? d.thesisTitle ?? '—'}</p>
                  </td>
                  <td>
                    {d.scheduledDate ?? d.dateTime
                      ? new Date(d.scheduledDate ?? d.dateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  <td>
                    {d.ratingOpen
                      ? <Badge variant="approved" size="sm">Open</Badge>
                      : <Badge variant="secondary" size="sm">Locked</Badge>}
                  </td>
                  <td>
                    {d.ratingOpen
                      ? <button className="btn-primary text-xs px-3 py-1.5" onClick={() => navigate('/defenses')}>Rate</button>
                      : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Locked</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

// ─── SuperAdmin Dashboard ─────────────────────────────────────────────────────

function SuperAdminDashboard({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    groupService.list().catch(() => []).then(setGroups).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  return (
    <div className="p-4 sm:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #18181b 0%, #27272a 100%)"
        border="#3f3f46"
        glow="#a1a1aa"
        role="Super Administrator,"
        name={user?.fullName ?? 'SuperAdmin'}
        sub="Full system access — manage all users, roles, and data."
      />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value="—" sub="manage via users page" color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }} onClick={() => navigate('/users')} />
        <StatCard icon={GraduationCap} label="Total Groups" value={groups.length} sub="all statuses" color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }} onClick={() => navigate('/groups')} />
        <StatCard icon={ShieldCheck} label="User Management" value="Admin" sub="manage accounts" color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }} onClick={() => navigate('/users')} />
        <StatCard icon={BarChart3} label="Reports" value="View" sub="system-wide" color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }} onClick={() => navigate('/reports')} />
      </div>
      <Card>
        <CardHeader title="Quick Actions" />
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { icon: Users, label: 'Manage users', to: '/users' },
            { icon: GraduationCap, label: 'Manage groups', to: '/groups' },
            { icon: Calendar, label: 'Defense schedules', to: '/defenses' },
            { icon: BarChart3, label: 'Generate report', to: '/reports' },
          ].map(a => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-main)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
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

// ─── Root ─────────────────────────────────────────────────────────────────────

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
