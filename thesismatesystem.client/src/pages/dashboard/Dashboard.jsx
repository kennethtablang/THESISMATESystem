import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusLabel, statusVariant } from '../../components/ui/Badge'
import {
  Users, FileText, Calendar, AlertCircle, ArrowRight, Plus,
  BarChart3, GraduationCap, MessageSquare, Upload, Cpu,
  CalendarClock, ShieldCheck, CheckCircle2, Star, BookOpen,
  TrendingUp, Clock, ChevronRight,
} from 'lucide-react'
import {
  groupService, chapterService, consultationService,
  defenseService, consultationScheduleService, authService,
  monitoringService,
} from '../../services/api'

// ─── Shared UI ───────────────────────────────────────────────────────────────

function WelcomeBanner({ badge, badgeColor, name, sub, gradient, extra }) {
  const today = new Date()
  const day   = today.getDate()
  const month = today.toLocaleDateString('en-PH', { month: 'short' })
  const weekday = today.toLocaleDateString('en-PH', { weekday: 'long' })

  return (
    <div
      className="rounded-2xl mb-6 overflow-hidden relative"
      style={{ background: gradient }}
    >
      {/* Gold accent top bar */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #c9a84c 0%, rgba(201,168,76,0.15) 100%)' }} />

      {/* Dot grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Glow orb */}
      <div
        className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 65%)' }}
      />

      {/* Content */}
      <div className="relative z-10 px-6 pt-6 pb-7 sm:px-8 sm:pt-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* Role badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg mb-4"
              style={{
                background: `rgba(${badgeColor}, 0.15)`,
                border: `1px solid rgba(${badgeColor}, 0.25)`,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${badgeColor})` }} />
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: `rgb(${badgeColor})` }}
              >
                {badge}
              </span>
            </div>

            <h2
              className="font-display font-bold text-white truncate"
              style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.5px', lineHeight: 1.2 }}
            >
              {name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {sub}
            </p>
          </div>

          {/* Calendar widget */}
          <div
            className="hidden sm:flex flex-col items-center shrink-0 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 72 }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {month}
            </p>
            <p
              className="font-display font-bold text-white"
              style={{ fontSize: '2.2rem', letterSpacing: '-2px', lineHeight: 1.05 }}
            >
              {day}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
              {weekday.slice(0, 3)}
            </p>
          </div>
        </div>

        {extra && <div className="mt-5">{extra}</div>}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button
      type="button"
      className="stat-card w-full text-left group relative overflow-hidden"
      onClick={onClick}
    >
      {/* Left accent stripe */}
      <div
        className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl"
        style={{ background: color.icon }}
      />

      <div className="pl-2">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: color.bg }}
          >
            <Icon size={18} style={{ color: color.icon }} strokeWidth={1.75} />
          </div>
          <ChevronRight
            size={15}
            className="opacity-0 group-hover:opacity-60 transition-opacity mt-0.5 shrink-0"
            style={{ color: 'var(--text-muted)' }}
          />
        </div>

        <p
          className="font-display font-bold leading-none mb-2"
          style={{ color: 'var(--text-heading)', fontSize: '2rem', letterSpacing: '-1.5px' }}
        >
          {value}
        </p>
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {sub && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
    </button>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-[3px] h-5 rounded-full" style={{ background: '#c9a84c' }} />
        <h3 className="font-semibold" style={{ color: 'var(--text-heading)', fontSize: '15px' }}>
          {title}
        </h3>
      </div>
      {action}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
      }}
    >
      {children}
    </div>
  )
}

function CardHeader({ title, action }) {
  return (
    <div
      className="flex items-center justify-between px-6 py-4 border-b"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
        {title}
      </p>
      {action}
    </div>
  )
}

function QuickActions({ items }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 grid grid-cols-1 gap-2">
      {items.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => navigate(a.to)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left group transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'
            e.currentTarget.style.background = 'rgba(201,168,76,0.06)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-light)'
            e.currentTarget.style.background = 'var(--bg-subtle)'
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.18)' }}
          >
            <a.icon size={15} style={{ color: '#c9a84c' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {a.label}
            </p>
            {a.desc && (
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {a.desc}
              </p>
            )}
          </div>
          <ArrowRight
            size={14}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: '#c9a84c' }}
          />
        </button>
      ))}
    </div>
  )
}

function EmptyCard({ icon: Icon, message, hint }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
      >
        <Icon size={20} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      {hint && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function DashboardLoader() {
  return (
    <div className="p-6 sm:p-8">
      {/* Banner skeleton */}
      <div className="h-32 rounded-2xl mb-6 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
        ))}
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
        <div className="h-64 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
      </div>
    </div>
  )
}

function ProgressBanner({ approved, total, needsRevision }) {
  const progress = total > 0 ? Math.round((approved / total) * 100) : 0
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Chapter Progress
        </span>
        <span className="text-sm font-bold" style={{ color: '#c9a84c' }}>
          {progress}%
        </span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #c9a84c, #d4b565)' }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {approved} of {total} chapters approved
        </span>
        {needsRevision > 0 && (
          <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>
            {needsRevision} needs revision
          </span>
        )}
      </div>
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
      .then((g) => {
        setGroup(g)
        return Promise.all([
          chapterService.listByGroup(g.id).catch(() => []),
          consultationService.byGroup(g.id).catch(() => []),
          defenseService.byGroup(g.id).catch(() => []),
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

  const approved     = chapters.filter((c) => c.status === 'Approved').length
  const needsRevision = chapters.filter((c) => c.status === 'UnderRevision').length
  const nextDefense  = defenses.find((d) => d.status !== 'Cancelled')
  const nextDefenseDate = nextDefense
    ? new Date(nextDefense.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : '—'

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #060e1f 0%, #0a1628 50%, #0f1e38 100%)"
        badge="Student"
        badgeColor="201,168,76"
        name={user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'Student'}
        sub={
          group
            ? `${group.groupName ?? group.name} — Keep progressing on your capstone.`
            : 'You are not yet assigned to a capstone group.'
        }
        extra={
          chapters.length > 0 && (
            <ProgressBanner approved={approved} total={chapters.length} needsRevision={needsRevision} />
          )
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FileText}
          label="Chapters Submitted"
          value={chapters.length}
          sub={approved > 0 ? `${approved} approved` : 'None approved yet'}
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/documents')}
        />
        <StatCard
          icon={AlertCircle}
          label="Needs Revision"
          value={needsRevision}
          sub={needsRevision > 0 ? 'Requires attention' : 'All clear'}
          color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }}
          onClick={() => navigate('/documents')}
        />
        <StatCard
          icon={MessageSquare}
          label="Consultations"
          value={consultations.length}
          sub="logged this semester"
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/consultations')}
        />
        <StatCard
          icon={Calendar}
          label="Next Defense"
          value={nextDefenseDate}
          sub={nextDefense ? 'Scheduled' : 'Not yet set'}
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defenses')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader
            title="Chapter Submissions"
            action={
              <button className="btn-ghost text-xs" onClick={() => navigate('/documents')}>
                View all
              </button>
            }
          />
          <Card>
            {chapters.length === 0 ? (
              <EmptyCard icon={FileText} message="No chapters submitted yet" hint="Upload your first chapter to get started" />
            ) : (
              <div>
                {chapters.map((c, idx) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                    style={{
                      borderBottom: idx < chapters.length - 1 ? '1px solid var(--border-light)' : 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Chapter number badge */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                      style={{
                        background:
                          c.status === 'Approved'
                            ? 'rgba(34,197,94,0.12)'
                            : c.status === 'UnderRevision'
                            ? 'rgba(245,158,11,0.12)'
                            : 'var(--bg-subtle)',
                        color:
                          c.status === 'Approved'
                            ? '#16a34a'
                            : c.status === 'UnderRevision'
                            ? '#f59e0b'
                            : 'var(--text-muted)',
                        border:
                          c.status === 'Approved'
                            ? '1px solid rgba(34,197,94,0.2)'
                            : c.status === 'UnderRevision'
                            ? '1px solid rgba(245,158,11,0.2)'
                            : '1px solid var(--border-main)',
                      }}
                    >
                      {c.chapterNumber ?? '—'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {c.title ?? c.chapterTitle ?? `Chapter ${c.chapterNumber}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {c.submittedAt
                          ? new Date(c.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>

                    <Badge variant={statusVariant(c.status)} size="sm">
                      {statusLabel(c.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <SectionHeader title="Quick Actions" />
          <Card>
            <QuickActions
              items={[
                { icon: Upload,        label: 'Upload a document',   desc: 'Submit chapter or file', to: '/documents' },
                { icon: Cpu,           label: 'System tracker',      desc: 'Monitor feature progress', to: '/system-features' },
                { icon: CalendarClock, label: 'Consultation calendar', desc: 'View your schedule',   to: '/calendar' },
                { icon: Calendar,      label: 'Defense schedule',    desc: 'Your upcoming defenses', to: '/defenses' },
              ]}
            />
          </Card>
        </div>
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
        gs.map((g) =>
          chapterService
            .listByGroup(g.id)
            .then((ch) => ch.map((c) => ({ ...c, groupName: g.groupName ?? g.name })))
            .catch(() => [])
        )
      )
      const pending = chaptersByGroup.flat().filter(
        (c) => c.status === 'PendingReview' || c.status === 'UnderRevision'
      )
      setPendingChapters(pending)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const upcomingDefenses = defenses.filter((d) => d.status !== 'Cancelled' && d.status !== 'Completed')

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #042e1f 0%, #064e3b 50%, #065f46 100%)"
        badge="Adviser"
        badgeColor="52,211,153"
        name={user?.fullName ?? 'Adviser'}
        sub={
          pendingChapters.length > 0
            ? `${pendingChapters.length} chapter${pendingChapters.length !== 1 ? 's' : ''} awaiting your review.`
            : 'No pending chapter reviews at this time.'
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Active Advisees"
          value={groups.length}
          sub={groups.length === 1 ? '1 group' : `${groups.length} groups`}
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/groups')}
        />
        <StatCard
          icon={FileText}
          label="Pending Reviews"
          value={pendingChapters.length}
          sub="awaiting response"
          color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }}
          onClick={() => navigate('/documents')}
        />
        <StatCard
          icon={MessageSquare}
          label="Consultations"
          value={consultations.length}
          sub="total logged"
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/consultations')}
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Defenses"
          value={upcomingDefenses.length}
          sub="scheduled"
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defenses')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div>
            <SectionHeader
              title="Pending Reviews"
              action={
                <button className="btn-ghost text-xs" onClick={() => navigate('/documents')}>
                  View manuscripts
                </button>
              }
            />
            <Card>
              {pendingChapters.length === 0 ? (
                <EmptyCard icon={CheckCircle2} message="No pending reviews" hint="All submitted chapters have been reviewed" />
              ) : (
                <div>
                  {pendingChapters.slice(0, 6).map((c, i) => (
                    <div
                      key={c.id ?? i}
                      className="flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                      style={{ borderBottom: i < Math.min(pendingChapters.length, 6) - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                      >
                        {c.chapterNumber ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {c.title ?? c.chapterTitle ?? `Chapter ${c.chapterNumber}`}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {c.groupName}
                        </p>
                      </div>
                      <Badge variant={statusVariant(c.status)} size="sm">
                        {statusLabel(c.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        <div>
          <SectionHeader
            title="My Advisees"
            action={
              <button className="btn-ghost text-xs" onClick={() => navigate('/groups')}>
                View all
              </button>
            }
          />
          <Card>
            {groups.length === 0 ? (
              <EmptyCard icon={Users} message="No groups assigned yet" />
            ) : (
              <div>
                {groups.map((g, idx) => {
                  const prog = g.milestoneProgress?.completionPercentage ?? 0
                  return (
                    <div
                      key={g.id}
                      className="px-5 py-4 transition-colors duration-100"
                      style={{ borderBottom: idx < groups.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {g.groupName ?? g.name}
                        </p>
                        <span className="text-xs font-bold" style={{ color: prog >= 70 ? '#16a34a' : prog >= 40 ? '#c9a84c' : 'var(--text-muted)' }}>
                          {prog}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                        <div
                          className="h-1.5 rounded-full transition-all duration-500"
                          style={{
                            width: `${prog}%`,
                            background: prog >= 70 ? '#16a34a' : prog >= 40 ? '#c9a84c' : 'var(--border-main)',
                          }}
                        />
                      </div>
                      <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        {g.memberCount ?? g.members?.length ?? 0} members
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [defenses, setDefenses] = useState([])
  const [userCount, setUserCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      defenseService.list().catch(() => []),
      authService.allUsers().catch(() => null),
    ]).then(([gs, de, us]) => {
      setGroups(gs)
      setDefenses(de)
      if (us) setUserCount(us.filter(u => u.isActive).length)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const activeDefenses = defenses.filter((d) => d.status !== 'Cancelled' && d.status !== 'Completed')

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #1a1035 0%, #1e1b4b 50%, #2d2a6e 100%)"
        badge="Administrator"
        badgeColor="165,180,252"
        name={user?.fullName ?? 'Admin'}
        sub={`${groups.length} capstone group${groups.length !== 1 ? 's' : ''} · ${activeDefenses.length} defense${activeDefenses.length !== 1 ? 's' : ''} scheduled`}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}         label="Total Groups"       value={groups.length}        sub="registered"         color={{ bg: 'rgba(59,130,246,0.12)',  icon: '#3b82f6' }} onClick={() => navigate('/groups')} />
        <StatCard icon={GraduationCap} label="Active Defenses"   value={activeDefenses.length} sub="upcoming"          color={{ bg: 'rgba(34,197,94,0.12)',   icon: '#16a34a' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={ShieldCheck}   label="Active Users"      value={userCount ?? '—'}     sub="manage accounts"    color={{ bg: 'rgba(245,158,11,0.12)',  icon: '#f59e0b' }} onClick={() => navigate('/users')} />
        <StatCard icon={BarChart3}     label="Reports"           value="Export"               sub="system reports"     color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }} onClick={() => navigate('/reports')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader
            title="Defense Schedules"
            action={
              <button className="btn-primary text-xs px-3 py-1.5 gap-1" onClick={() => navigate('/defenses')}>
                <Plus size={13} /> Schedule
              </button>
            }
          />
          <Card>
            {defenses.length === 0 ? (
              <EmptyCard icon={Calendar} message="No defenses scheduled" hint="Create a defense schedule to get started" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Date &amp; Time</th>
                    <th className="hidden md:table-cell">Venue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {defenses.slice(0, 8).map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.groupName ?? '—'}</td>
                      <td>
                        {d.scheduledDateTime
                          ? new Date(d.scheduledDateTime).toLocaleDateString('en-PH', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="hidden md:table-cell">{d.venue ?? '—'}</td>
                      <td>
                        <Badge variant={statusVariant(d.status)} size="sm">
                          {statusLabel(d.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div>
          <SectionHeader title="Quick Actions" />
          <Card>
            <QuickActions
              items={[
                { icon: Plus,     label: 'Create new group',  desc: 'Add a capstone group',   to: '/groups' },
                { icon: Calendar, label: 'Schedule defense',  desc: 'Set date, time, venue',   to: '/defenses' },
                { icon: Users,    label: 'Manage users',      desc: 'Roles & accounts',        to: '/users' },
                { icon: BarChart3, label: 'Generate report',  desc: 'Export system data',      to: '/reports' },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── FacultyIC Dashboard ──────────────────────────────────────────────────────

function FacultyICDashboard({ user }) {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState([])
  const [defenses, setDefenses] = useState([])
  const [monitoring, setMonitoring] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      consultationScheduleService.all().catch(() => []),
      defenseService.list().catch(() => []),
      monitoringService.summary().catch(() => null),
    ]).then(([sc, de, mon]) => {
      setSchedules(sc)
      setDefenses(de)
      setMonitoring(mon)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const activeDefenses = defenses.filter((d) => d.status !== 'Cancelled' && d.status !== 'Completed')
  const monGroups = monitoring?.groups ?? []

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #032736 0%, #0c3a4f 50%, #0e4a63 100%)"
        badge="Faculty in Charge"
        badgeColor="34,211,238"
        name={user?.fullName ?? 'FacultyIC'}
        sub="Manage consultation schedules and group presentations."
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={CalendarClock}
          label="Consultation Slots"
          value={schedules.length}
          sub="created"
          color={{ bg: 'rgba(6,182,212,0.12)', icon: '#0891b2' }}
          onClick={() => navigate('/consultation-manager')}
        />
        <StatCard
          icon={Calendar}
          label="Scheduled Defenses"
          value={activeDefenses.length}
          sub="upcoming"
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/defenses')}
        />
        <StatCard
          icon={Users}
          label="Groups"
          value={monitoring?.totalGroups ?? monGroups.length}
          sub="capstone groups"
          color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }}
          onClick={() => navigate('/consultation-manager')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Pre-Finals Consultation Progress */}
        <div className="xl:col-span-2">
          <SectionHeader
            title="Pre-Finals Consultation Progress"
            action={
              <button className="btn-ghost text-xs" onClick={() => navigate('/consultation-manager')}>
                Manage slots
              </button>
            }
          />
          <Card>
            {monGroups.length === 0 ? (
              <EmptyCard
                icon={TrendingUp}
                message="No group data available"
                hint="Group consultation progress will appear here once groups are active."
              />
            ) : (
              <div>
                {/* Column headers */}
                <div
                  className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)' }}
                >
                  <span className="col-span-6">Research Title</span>
                  <span className="col-span-2 text-center">Total</span>
                  <span className="col-span-2 text-center">Last 30d</span>
                  <span className="col-span-2 text-right">Score</span>
                </div>

                {monGroups.map((g, idx) => {
                  const displayName = g.projectTitle || g.groupName
                  const score = g.consultationScore ?? 0
                  const scoreColor =
                    score >= 75 ? '#16a34a' :
                    score >= 50 ? '#c9a84c' : '#ef4444'
                  const scoreBg =
                    score >= 75 ? 'rgba(34,197,94,0.10)' :
                    score >= 50 ? 'rgba(201,168,76,0.10)' : 'rgba(239,68,68,0.08)'

                  return (
                    <div
                      key={g.groupId}
                      className="transition-colors duration-100"
                      style={{ borderBottom: idx < monGroups.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="grid grid-cols-12 gap-2 px-5 pt-3 pb-1 items-center">
                        <div className="col-span-6 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {displayName}
                          </p>
                          {g.projectTitle && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                              {g.groupName}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                            {g.totalConsultations ?? 0}
                          </span>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                            {g.consultationsLast30Days ?? 0}
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: scoreBg, color: scoreColor }}
                          >
                            {score}%
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="px-5 pb-3">
                        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                          <div
                            className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${score}%`, background: scoreColor }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <SectionHeader title="Quick Actions" />
          <Card>
            <QuickActions
              items={[
                { icon: Plus,          label: 'Create consultation slot', desc: 'Open a new schedule slot', to: '/consultation-manager' },
                { icon: Calendar,      label: 'Manage presentations',     desc: 'Defense schedules',        to: '/defenses' },
                { icon: CalendarClock, label: 'View calendar',            desc: 'All scheduled events',    to: '/calendar' },
                { icon: BookOpen,      label: 'Classroom',                desc: 'Manage your classroom',   to: '/classroom' },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Panel Dashboard ──────────────────────────────────────────────────────────

function PanelDashboard({ user }) {
  const navigate = useNavigate()
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    defenseService.mySchedules().catch(() => []).then(setDefenses).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const completed = defenses.filter((d) => d.status === 'Completed').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #5b21b6 100%)"
        badge="Panelist"
        badgeColor="167,139,250"
        name={user?.fullName ?? 'Panelist'}
        sub="Ratings open when activated by the Faculty in Charge."
      />

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Calendar}
          label="Assigned Defenses"
          value={defenses.length}
          sub="total"
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defenses')}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={completed}
          sub="defenses reviewed"
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
        />
        <StatCard
          icon={Star}
          label="Pending Rating"
          value={defenses.length - completed}
          sub="awaiting evaluation"
          color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }}
        />
      </div>

      <SectionHeader title="Assigned Defenses" />
      <Card>
        {defenses.length === 0 ? (
          <EmptyCard
            icon={Calendar}
            message="No defenses assigned yet"
            hint="Assignments will appear here once scheduled by the Faculty in Charge"
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Group</th>
                <th className="hidden sm:table-cell">Title</th>
                <th>Date</th>
                <th>Rating</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {defenses.map((d) => (
                <tr key={d.id}>
                  <td className="font-semibold">{d.groupName ?? '—'}</td>
                  <td className="hidden sm:table-cell" style={{ maxWidth: '200px' }}>
                    <p className="truncate text-sm">{d.projectTitle ?? d.thesisTitle ?? '—'}</p>
                  </td>
                  <td>
                    {d.scheduledDateTime
                      ? new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
                      : '—'}
                  </td>
                  <td>
                    {d.isRatingOpen
                      ? <Badge variant="approved" size="sm">Open</Badge>
                      : <Badge variant="secondary" size="sm">Locked</Badge>}
                  </td>
                  <td>
                    {d.isRatingOpen
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

const ROLE_META = {
  SuperAdmin: { color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
  Admin:      { color: '#ea580c', bg: 'rgba(249,115,22,0.12)' },
  Adviser:    { color: '#16a34a', bg: 'rgba(34,197,94,0.12)' },
  FacultyIC:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  Student:    { color: '#0284c7', bg: 'rgba(14,165,233,0.12)' },
  Panel:      { color: '#7c3aed', bg: 'rgba(139,92,246,0.12)' },
}

function RoleBreakdownBar({ users }) {
  const total = users.length
  if (total === 0) return null
  const byRole = Object.entries(
    users.reduce((acc, u) => { acc[u.role] = (acc[u.role] ?? 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-3">
      {byRole.map(([role, count]) => {
        const meta = ROLE_META[role] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
        const pct = Math.round((count / total) * 100)
        return (
          <div key={role}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                <span
                  className="text-xs font-semibold tabular-nums"
                  style={{ color: meta.color, minWidth: 18, textAlign: 'right' }}
                >
                  {count}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: meta.color, opacity: 0.85 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SuperAdminDashboard({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      authService.allUsers().catch(() => []),
      defenseService.list().catch(() => []),
    ]).then(([gs, us, de]) => {
      setGroups(gs)
      setUsers(us)
      setDefenses(de)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const activeUsers  = users.filter(u => u.isActive).length
  const activeGroups = groups.filter(g => g.status === 'Active' || !g.status).length
  const upcomingDefs = defenses.filter(d => d.status !== 'Cancelled' && d.status !== 'Completed').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #111111 0%, #1c1c1c 50%, #252525 100%)"
        badge="Super Administrator"
        badgeColor="148,163,184"
        name={user?.fullName ?? 'SuperAdmin'}
        sub={`${users.length} users · ${groups.length} groups · full system access`}
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users}         label="Total Users"       value={users.length}   sub={`${activeUsers} active`}           color={{ bg: 'rgba(59,130,246,0.12)',  icon: '#3b82f6' }} onClick={() => navigate('/users')} />
        <StatCard icon={GraduationCap} label="Capstone Groups"   value={groups.length}  sub={`${activeGroups} active`}          color={{ bg: 'rgba(34,197,94,0.12)',   icon: '#16a34a' }} onClick={() => navigate('/groups')} />
        <StatCard icon={Calendar}      label="Upcoming Defenses" value={upcomingDefs}   sub="scheduled"                        color={{ bg: 'rgba(124,58,237,0.12)',  icon: '#7c3aed' }} onClick={() => navigate('/defenses')} />
        <StatCard icon={BarChart3}     label="Reports"           value="Export"         sub="system-wide data"                 color={{ bg: 'rgba(245,158,11,0.12)',  icon: '#f59e0b' }} onClick={() => navigate('/reports')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader
            title="Defense Schedules"
            action={<button className="btn-ghost text-xs" onClick={() => navigate('/defenses')}>View all</button>}
          />
          <Card>
            {defenses.length === 0 ? (
              <EmptyCard icon={Calendar} message="No defenses scheduled" />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Date &amp; Time</th>
                    <th className="hidden md:table-cell">Venue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {defenses.slice(0, 6).map((d) => (
                    <tr key={d.id}>
                      <td className="font-semibold">{d.groupName ?? '—'}</td>
                      <td>
                        {d.scheduledDateTime
                          ? new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="hidden md:table-cell">{d.venue ?? '—'}</td>
                      <td>
                        <Badge variant={statusVariant(d.status)} size="sm">{statusLabel(d.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader title="User Distribution" />
            <Card>
              <div className="px-5 py-4">
                <RoleBreakdownBar users={users} />
              </div>
            </Card>
          </div>
          <div>
            <SectionHeader title="Quick Actions" />
            <Card>
              <QuickActions
                items={[
                  { icon: Users,         label: 'Manage users',      desc: 'Roles, accounts, access',   to: '/users' },
                  { icon: GraduationCap, label: 'Manage groups',     desc: 'Capstone group registry',   to: '/groups' },
                  { icon: Calendar,      label: 'Defense schedules', desc: 'All scheduled defenses',    to: '/defenses' },
                  { icon: BarChart3,     label: 'Generate report',   desc: 'Export system-wide data',   to: '/reports' },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
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
    Student:    StudentDashboard,
    Adviser:    AdviserDashboard,
    Admin:      AdminDashboard,
    SuperAdmin: SuperAdminDashboard,
    FacultyIC:  FacultyICDashboard,
    Panel:      PanelDashboard,
  }

  const RoleDashboard = dashboards[user?.role] ?? StudentDashboard

  return (
    <div>
      <TopBar
        title={`${greeting()}, ${user?.fullName?.split(' ')[0] ?? 'there'}`}
        subtitle={new Date().toLocaleDateString('en-PH', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        })}
      />
      <RoleDashboard user={user} />
    </div>
  )
}
