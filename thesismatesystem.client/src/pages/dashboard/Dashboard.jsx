import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusLabel, statusVariant } from '../../components/ui/Badge'
import {
  Users, FileText, Calendar, AlertCircle, ArrowRight, Plus,
  BarChart3, GraduationCap, MessageSquare, Upload, Cpu,
  CalendarClock, ShieldCheck, CheckCircle2, Star, BookOpen,
  TrendingUp, Clock, ChevronRight, School,
} from 'lucide-react'
import {
  groupService, chapterService, consultationService,
  defenseService, consultationScheduleService, authService,
  monitoringService,
} from '../../services/api'

// ─── Shared UI ───────────────────────────────────────────────────────────────

function WelcomeBanner({ badge, badgeColor, name, sub, gradient, extra, tags }) {
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
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Large glow orb — right side */}
      <div
        className="absolute -right-16 -top-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, rgba(${badgeColor}, 0.08) 0%, transparent 65%)` }}
      />
      {/* Small gold orb — bottom left */}
      <div
        className="absolute -left-8 -bottom-12 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%)' }}
      />

      {/* Content */}
      <div className="relative z-10 px-6 pt-6 pb-7 sm:px-8 sm:pt-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
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
              className="font-display font-bold text-white"
              style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.5px', lineHeight: 1.2 }}
            >
              {name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {sub}
            </p>

            {/* Optional info tags (e.g. group name, project title) */}
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((t) => (
                  <div
                    key={t.label}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {t.icon && <t.icon size={11} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>
                      {t.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calendar widget */}
          <div
            className="hidden sm:flex flex-col items-center shrink-0 px-4 py-3 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              minWidth: 72,
              backdropFilter: 'blur(8px)',
            }}
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

      {/* Subtle top gradient wash */}
      <div
        className="absolute inset-x-0 top-0 h-16 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${color.bg} 0%, transparent 100%)`, opacity: 0.6 }}
      />

      <div className="pl-2 relative">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: color.bg,
              border: `1px solid ${color.icon}25`,
              boxShadow: `0 0 12px ${color.icon}20`,
            }}
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
          style={{ color: 'var(--text-heading)', fontSize: '1.9rem', letterSpacing: '-1.5px' }}
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

function NextEventBadge({ label, value, color, icon: Icon }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={16} style={{ color }} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-sm font-bold truncate" style={{ color: 'var(--text-heading)' }}>{value}</p>
      </div>
    </div>
  )
}

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

  const approved      = chapters.filter((c) => c.status === 'Approved').length
  const needsRevision = chapters.filter((c) => c.status === 'UnderRevision').length
  const nextDefense   = defenses.find((d) => d.status !== 'Cancelled')
  const nextDefenseDate = nextDefense
    ? new Date(nextDefense.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  // Banner info tags
  const bannerTags = []
  if (group) {
    bannerTags.push({ icon: Users, label: group.groupName ?? group.name ?? 'My Group' })
    if (group.projectTitle || group.thesisTitle) {
      bannerTags.push({ icon: BookOpen, label: group.projectTitle ?? group.thesisTitle })
    }
    if (group.classroomName) {
      bannerTags.push({ icon: School, label: group.classroomName })
    }
  }

  const hasUpcoming = nextDefense || consultations.length > 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #060e1f 0%, #0a1628 50%, #0f1e38 100%)"
        badge="Student"
        badgeColor="201,168,76"
        name={user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'Student'}
        sub={
          group
            ? 'Keep progressing on your capstone. Your adviser is tracking your submissions.'
            : 'You are not yet assigned to a capstone group. Contact your adviser.'
        }
        tags={bannerTags}
        extra={
          chapters.length > 0 && (
            <ProgressBanner approved={approved} total={chapters.length} needsRevision={needsRevision} />
          )
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
          value={nextDefenseDate ?? '—'}
          sub={nextDefense ? nextDefense.venue ?? 'Scheduled' : 'Not yet set'}
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defenses')}
        />
      </div>

      {/* Upcoming highlights strip */}
      {hasUpcoming && (
        <div className="mb-6">
          <SectionHeader title="Upcoming" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {nextDefense && (
              <NextEventBadge
                icon={Calendar}
                label="Next Defense"
                value={nextDefenseDate}
                color="#7c3aed"
              />
            )}
            {consultations.length > 0 && (
              <NextEventBadge
                icon={MessageSquare}
                label="Total Consultations This Semester"
                value={`${consultations.length} session${consultations.length !== 1 ? 's' : ''} logged`}
                color="#16a34a"
              />
            )}
            {needsRevision > 0 && (
              <NextEventBadge
                icon={AlertCircle}
                label="Action Required"
                value={`${needsRevision} chapter${needsRevision !== 1 ? 's' : ''} need revision`}
                color="#f59e0b"
              />
            )}
          </div>
        </div>
      )}

      {/* Main content */}
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
              <EmptyCard
                icon={FileText}
                message="No chapters submitted yet"
                hint="Upload your first chapter to get started"
              />
            ) : (
              <div>
                {chapters.map((c, idx) => {
                  const isApproved = c.status === 'Approved'
                  const isRevision = c.status === 'UnderRevision'
                  const accentColor = isApproved ? '#16a34a' : isRevision ? '#f59e0b' : 'var(--border-main)'
                  const iconBg     = isApproved ? 'rgba(34,197,94,0.12)' : isRevision ? 'rgba(245,158,11,0.12)' : 'var(--bg-subtle)'
                  const iconColor  = isApproved ? '#16a34a' : isRevision ? '#f59e0b' : 'var(--text-muted)'

                  return (
                    <div
                      key={c.id}
                      className="relative flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                      style={{ borderBottom: idx < chapters.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Status left stripe */}
                      <div
                        className="absolute left-0 inset-y-2 w-[3px] rounded-r-full"
                        style={{ background: accentColor, opacity: isApproved || isRevision ? 0.7 : 0 }}
                      />

                      {/* Chapter number badge */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                        style={{
                          background: iconBg,
                          color: iconColor,
                          border: `1px solid ${accentColor}35`,
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
                            ? `Submitted ${new Date(c.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : 'Date unknown'}
                        </p>
                      </div>

                      <Badge variant={statusVariant(c.status)} size="sm">
                        {statusLabel(c.status)}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        <div>
          <SectionHeader title="Quick Actions" />
          <Card>
            <QuickActions
              items={[
                { icon: Upload,        label: 'Upload a document',     desc: 'Submit chapter or file',   to: '/documents' },
                { icon: Cpu,           label: 'System tracker',        desc: 'Monitor feature progress', to: '/system-features' },
                { icon: CalendarClock, label: 'Consultation calendar', desc: 'View your schedule',       to: '/calendar' },
                { icon: Calendar,      label: 'Defense schedule',      desc: 'Your upcoming defenses',   to: '/defenses' },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

// ─── Faculty Dashboard ────────────────────────────────────────────────────────

function FacultyDashboard({ user }) {
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [pendingChapters, setPendingChapters] = useState([])
  const [consultations, setConsultations] = useState([])
  const [panelAssignments, setPanelAssignments] = useState([])
  const [schedules, setSchedules] = useState([])
  const [monitoring, setMonitoring] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      consultationService.list().catch(() => []),
      defenseService.mySchedules().catch(() => []),
      consultationScheduleService.all().catch(() => []),
      monitoringService.summary().catch(() => null),
    ]).then(async ([gs, co, pa, sc, mon]) => {
      setGroups(gs)
      setConsultations(co)
      setPanelAssignments(pa)
      setSchedules(sc)
      setMonitoring(mon)
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

  const upcomingPanelDefenses = panelAssignments.filter((d) => d.status !== 'Cancelled' && d.status !== 'Completed')

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #042e1f 0%, #064e3b 50%, #065f46 100%)"
        badge="Faculty"
        badgeColor="52,211,153"
        name={user?.fullName ?? 'Faculty'}
        sub={
          pendingChapters.length > 0
            ? `${pendingChapters.length} chapter${pendingChapters.length !== 1 ? 's' : ''} awaiting your review.`
            : upcomingPanelDefenses.length > 0
            ? `${upcomingPanelDefenses.length} panel assignment${upcomingPanelDefenses.length !== 1 ? 's' : ''} upcoming.`
            : 'Welcome back. All tasks are up to date.'
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Advised Groups"
          value={groups.length}
          sub="as adviser"
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
          icon={Star}
          label="Panel Assignments"
          value={upcomingPanelDefenses.length}
          sub="upcoming defenses"
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defenses')}
        />
        <StatCard
          icon={MessageSquare}
          label="Consultations"
          value={consultations.length}
          sub="total logged"
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/consultations')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {pendingChapters.length > 0 && (
            <div>
              <SectionHeader
                title="Pending Chapter Reviews"
                action={
                  <button className="btn-ghost text-xs" onClick={() => navigate('/chapters')}>
                    View all
                  </button>
                }
              />
              <Card>
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
              </Card>
            </div>
          )}

          {panelAssignments.length > 0 && (
            <div>
              <SectionHeader
                title="My Panel Assignments"
                action={
                  <button className="btn-ghost text-xs" onClick={() => navigate('/defenses')}>
                    View all
                  </button>
                }
              />
              <Card>
                <div>
                  {panelAssignments.map((d, idx) => {
                    const isCompleted = d.status === 'Completed'
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                        style={{ borderBottom: idx < panelAssignments.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(124,58,237,0.12)' }}>
                          <Star size={15} style={{ color: '#7c3aed' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {d.groupName ?? '—'}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {d.scheduledDateTime
                              ? new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </p>
                        </div>
                        <Badge variant={isCompleted ? 'approved' : statusVariant(d.status)} size="sm">
                          {statusLabel(d.status)}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {pendingChapters.length === 0 && panelAssignments.length === 0 && (
            <Card>
              <EmptyCard icon={CheckCircle2} message="All caught up" hint="No pending reviews or panel assignments at this time" />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {groups.length > 0 && (
            <div>
              <SectionHeader
                title="My Advised Groups"
                action={
                  <button className="btn-ghost text-xs" onClick={() => navigate('/groups')}>
                    View all
                  </button>
                }
              />
              <Card>
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
              </Card>
            </div>
          )}

          <div>
            <SectionHeader title="Quick Actions" />
            <Card>
              <QuickActions
                items={[
                  { icon: BookOpen,      label: 'Review Manuscripts',    desc: 'View group manuscripts',       to: '/manuscript' },
                  { icon: Calendar,      label: 'Defense Schedules',     desc: 'View assigned defenses',       to: '/defenses' },
                  { icon: CalendarClock, label: 'Consultation Manager',  desc: 'Manage consultation slots',    to: '/consultation-manager' },
                  { icon: School,        label: 'Classroom',             desc: 'Manage your classroom',        to: '/classroom' },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function MiniBarChart({ rows }) {
  const max = Math.max(...rows.map((r) => r.count), 1)
  return (
    <div className="space-y-3">
      {rows.map(({ label, count, color }) => (
        <div key={label}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>{count}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((count / max) * 100)}%`, background: color, opacity: 0.85 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertBanner({ icon: Icon, color, title, body, action, onAction }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-4"
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}
    >
      <Icon size={16} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color }}>{title}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{body}</p>
      </div>
      {action && (
        <button className="btn-ghost text-xs shrink-0" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}

function AdminDashboard({ user }) {
  const navigate = useNavigate()
  const [groups,        setGroups]        = useState([])
  const [defenses,      setDefenses]      = useState([])
  const [users,         setUsers]         = useState([])
  const [consultations, setConsultations] = useState([])
  const [monitoring,    setMonitoring]    = useState(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      defenseService.list().catch(() => []),
      authService.allUsers().catch(() => []),
      consultationService.list().catch(() => []),
      monitoringService.summary().catch(() => null),
    ]).then(([gs, de, us, co, mon]) => {
      setGroups(gs)
      setDefenses(de)
      setUsers(Array.isArray(us) ? us : [])
      setConsultations(Array.isArray(co) ? co : [])
      setMonitoring(mon)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeUsers      = users.filter((u) => u.isActive)
  const scheduledDefs    = defenses.filter((d) => d.status !== 'Cancelled' && d.status !== 'Completed')
  const completedDefs    = defenses.filter((d) => d.status === 'Completed')
  const cancelledDefs    = defenses.filter((d) => d.status === 'Cancelled')

  const now     = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const soonDefenses = scheduledDefs
    .filter((d) => d.scheduledDateTime && new Date(d.scheduledDateTime) >= now && new Date(d.scheduledDateTime) <= in7Days)
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))

  const archivedGroups = groups.filter((g) => g.isArchived)
  const activeGroups   = groups.filter((g) => !g.isArchived)

  const monGroups   = monitoring?.groups ?? []
  const atRiskGroups = monGroups.filter((g) => (g.consultationScore ?? 0) < 50)

  // Consultations in the last 30 days
  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentConsultations = consultations.filter(
    (c) => c.createdAt && new Date(c.createdAt) >= cutoff30
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #1a1035 0%, #1e1b4b 50%, #2d2a6e 100%)"
        badge="Administrator"
        badgeColor="165,180,252"
        name={user?.fullName ?? 'Admin'}
        sub={
          atRiskGroups.length > 0
            ? `${atRiskGroups.length} group${atRiskGroups.length !== 1 ? 's' : ''} need attention · ${scheduledDefs.length} defense${scheduledDefs.length !== 1 ? 's' : ''} scheduled`
            : `${groups.length} capstone group${groups.length !== 1 ? 's' : ''} · ${scheduledDefs.length} defense${scheduledDefs.length !== 1 ? 's' : ''} active`
        }
      />

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}         label="Total Groups"
          value={groups.length} sub={`${activeGroups.length} active · ${archivedGroups.length} archived`}
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/groups')}
        />
        <StatCard
          icon={GraduationCap} label="Defenses"
          value={defenses.length} sub={`${scheduledDefs.length} upcoming`}
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/defenses')}
        />
        <StatCard
          icon={ShieldCheck}   label="Active Users"
          value={activeUsers.length} sub={`of ${users.length} total accounts`}
          color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }}
          onClick={() => navigate('/users')}
        />
        <StatCard
          icon={MessageSquare} label="Consultations"
          value={consultations.length} sub={`${recentConsultations.length} in last 30 days`}
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/consultations')}
        />
      </div>

      {/* ── Overview row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Defense pipeline */}
        <Card>
          <CardHeader title="Defense Pipeline" />
          <div className="px-5 py-4">
            {defenses.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No defenses recorded</p>
            ) : (
              <>
                <MiniBarChart rows={[
                  { label: 'Scheduled',  count: scheduledDefs.length,  color: '#3b82f6' },
                  { label: 'Completed',  count: completedDefs.length,  color: '#16a34a' },
                  { label: 'Cancelled',  count: cancelledDefs.length,  color: '#dc2626' },
                ]} />
                <div
                  className="mt-4 pt-3 flex items-center justify-between border-t"
                  style={{ borderColor: 'var(--border-light)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>{defenses.length}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Group overview */}
        <Card>
          <CardHeader title="Group Overview" />
          <div className="px-5 py-4">
            {groups.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No groups registered</p>
            ) : (
              <>
                <MiniBarChart rows={[
                  { label: 'Active',   count: activeGroups.length,   color: '#16a34a' },
                  { label: 'Archived', count: archivedGroups.length, color: '#6b7280' },
                ]} />

                {/* Consultation health summary */}
                {monGroups.length > 0 && (
                  <div
                    className="mt-4 pt-3 border-t space-y-1"
                    style={{ borderColor: 'var(--border-light)' }}
                  >
                    {[
                      { label: 'On track (≥75%)',  count: monGroups.filter((g) => (g.consultationScore ?? 0) >= 75).length, color: '#16a34a' },
                      { label: 'Moderate (50–74%)', count: monGroups.filter((g) => { const s = g.consultationScore ?? 0; return s >= 50 && s < 75 }).length, color: '#c9a84c' },
                      { label: 'At risk (<50%)',    count: atRiskGroups.length, color: '#ef4444' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums" style={{ color }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* User distribution */}
        <Card>
          <CardHeader title="User Distribution" />
          <div className="px-5 py-4">
            {users.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No user data</p>
            ) : (
              <>
                <RoleBreakdownBar users={users} />
                <div
                  className="mt-4 pt-3 flex items-center justify-between border-t"
                  style={{ borderColor: 'var(--border-light)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active accounts</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                    {activeUsers.length} / {users.length}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Alert banners ────────────────────────────────────────────────────── */}
      {atRiskGroups.length > 0 && (
        <AlertBanner
          icon={AlertCircle}
          color="#f59e0b"
          title={`${atRiskGroups.length} group${atRiskGroups.length !== 1 ? 's' : ''} below consultation threshold`}
          body={atRiskGroups.slice(0, 3).map((g) => g.groupName ?? g.projectTitle).join(', ') + (atRiskGroups.length > 3 ? ` and ${atRiskGroups.length - 3} more` : '') + ' — score below 50%'}
          action="View monitoring"
          onAction={() => navigate('/monitoring')}
        />
      )}
      {soonDefenses.length > 0 && (
        <AlertBanner
          icon={Calendar}
          color="#3b82f6"
          title={`${soonDefenses.length} defense${soonDefenses.length !== 1 ? 's' : ''} scheduled in the next 7 days`}
          body={`Next: ${soonDefenses[0]?.groupName} on ${new Date(soonDefenses[0]?.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
          action="View all"
          onAction={() => navigate('/defenses')}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Monitoring table — 2/3 */}
        <div className="xl:col-span-2">
          <SectionHeader
            title="Group Consultation Monitoring"
            action={
              <button className="btn-ghost text-xs" onClick={() => navigate('/monitoring')}>
                Full report
              </button>
            }
          />
          <Card>
            {monGroups.length === 0 ? (
              <EmptyCard icon={TrendingUp} message="No monitoring data yet" hint="Data appears once groups are active and logging consultations" />
            ) : (
              <div>
                {/* Column headers */}
                <div
                  className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wide border-b"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}
                >
                  <span className="col-span-5">Group / Project</span>
                  <span className="col-span-2 text-center">Total</span>
                  <span className="col-span-2 text-center">Last 30d</span>
                  <span className="col-span-3 text-right">Score</span>
                </div>

                {monGroups.map((g, idx) => {
                  const score      = g.consultationScore ?? 0
                  const scoreColor = score >= 75 ? '#16a34a' : score >= 50 ? '#c9a84c' : '#ef4444'
                  const scoreBg    = score >= 75 ? 'rgba(34,197,94,0.10)' : score >= 50 ? 'rgba(201,168,76,0.10)' : 'rgba(239,68,68,0.08)'
                  return (
                    <div
                      key={g.groupId}
                      className="transition-colors duration-100"
                      style={{ borderBottom: idx < monGroups.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="grid grid-cols-12 gap-2 px-5 pt-3 pb-1 items-center">
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {g.projectTitle || g.groupName}
                          </p>
                          {g.projectTitle && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{g.groupName}</p>
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
                        <div className="col-span-3 flex justify-end">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: scoreBg, color: scoreColor }}
                          >
                            {score}%
                          </span>
                        </div>
                      </div>
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

        {/* Right column — defense list + quick actions */}
        <div className="space-y-6">
          <div>
            <SectionHeader
              title="Defense Schedule"
              action={
                <button className="btn-primary text-xs px-3 py-1.5 gap-1" onClick={() => navigate('/defenses')}>
                  <Plus size={13} /> Add
                </button>
              }
            />
            <Card>
              {scheduledDefs.length === 0 ? (
                <EmptyCard icon={Calendar} message="No upcoming defenses" hint="Schedule a defense to see it here" />
              ) : (
                <div>
                  {scheduledDefs.slice(0, 5).map((d, idx) => (
                    <div
                      key={d.id}
                      className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
                      style={{ borderBottom: idx < Math.min(scheduledDefs.length, 5) - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(59,130,246,0.1)' }}
                      >
                        <Calendar size={15} style={{ color: '#3b82f6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {d.groupName ?? '—'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {d.scheduledDateTime
                            ? new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </p>
                      </div>
                      <Badge variant={statusVariant(d.status)} size="sm">
                        {statusLabel(d.status)}
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
                  { icon: Plus,      label: 'Create new group', desc: 'Add a capstone group',  to: '/groups' },
                  { icon: Calendar,  label: 'Schedule defense', desc: 'Set date, time, venue',  to: '/defenses' },
                  { icon: Users,     label: 'Manage users',     desc: 'Roles & accounts',       to: '/users' },
                  { icon: BarChart3, label: 'Generate report',  desc: 'Export system data',     to: '/reports' },
                ]}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


// ─── SuperAdmin Dashboard ─────────────────────────────────────────────────────

const ROLE_META = {
  SuperAdmin: { color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
  Admin:      { color: '#ea580c', bg: 'rgba(249,115,22,0.12)' },
  Faculty:    { color: '#16a34a', bg: 'rgba(34,197,94,0.12)' },
  Student:    { color: '#0284c7', bg: 'rgba(14,165,233,0.12)' },
}

function RoleBreakdownBar({ users }) {
  const total = users.length
  if (total === 0) return null
  const countOf = (role) => users.filter((u) => u.role === role).length
  const rows = [
    { role: 'Student',    count: countOf('Student') },
    { role: 'Faculty',    count: countOf('Faculty') },
    { role: 'Admin',      count: countOf('Admin') },
    { role: 'SuperAdmin', count: countOf('SuperAdmin') },
  ]
  const max = Math.max(...rows.map((r) => r.count), 1)

  return (
    <div className="space-y-3">
      {rows.map(({ role, count }) => {
        const meta = ROLE_META[role]
        const pct  = Math.round((count / max) * 100)
        const pctOfTotal = total > 0 ? Math.round((count / total) * 100) : 0
        return (
          <div key={role}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pctOfTotal}%</span>
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
  const [groups,        setGroups]        = useState([])
  const [users,         setUsers]         = useState([])
  const [defenses,      setDefenses]      = useState([])
  const [consultations, setConsultations] = useState([])
  const [monitoring,    setMonitoring]    = useState(null)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      authService.allUsers().catch(() => []),
      defenseService.list().catch(() => []),
      consultationService.list().catch(() => []),
      monitoringService.summary().catch(() => null),
    ]).then(([gs, us, de, co, mon]) => {
      setGroups(gs)
      setUsers(Array.isArray(us) ? us : [])
      setDefenses(de)
      setConsultations(Array.isArray(co) ? co : [])
      setMonitoring(mon)
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  // ── Derived ──────────────────────────────────────────────────────────────────
  const activeUsers    = users.filter((u) => u.isActive)
  const inactiveUsers  = users.filter((u) => !u.isActive)
  const twoFaUsers     = users.filter((u) => u.twoFactorEnabled)
  const scheduledDefs  = defenses.filter((d) => d.status !== 'Cancelled' && d.status !== 'Completed')
  const completedDefs  = defenses.filter((d) => d.status === 'Completed')
  const cancelledDefs  = defenses.filter((d) => d.status === 'Cancelled')
  const archivedGroups = groups.filter((g) => g.isArchived)
  const activeGroups   = groups.filter((g) => !g.isArchived)

  const now     = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const soonDefenses = scheduledDefs
    .filter((d) => d.scheduledDateTime && new Date(d.scheduledDateTime) >= now && new Date(d.scheduledDateTime) <= in7Days)
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))

  const cutoff30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const recentConsultations = consultations.filter((c) => c.createdAt && new Date(c.createdAt) >= cutoff30)

  const monGroups    = monitoring?.groups ?? []
  const atRiskGroups = monGroups.filter((g) => (g.consultationScore ?? 0) < 50)

  const twoFaPct = users.length > 0 ? Math.round((twoFaUsers.length / users.length) * 100) : 0

  // Most recently registered users (sort by id as proxy if no createdAt)
  const recentUsers = [...users]
    .sort((a, b) => (b.id > a.id ? 1 : -1))
    .slice(0, 4)

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #0d0d0d 0%, #181818 50%, #212121 100%)"
        badge="Super Administrator"
        badgeColor="148,163,184"
        name={user?.fullName ?? 'SuperAdmin'}
        sub={
          atRiskGroups.length > 0
            ? `${atRiskGroups.length} group${atRiskGroups.length !== 1 ? 's' : ''} need attention · ${users.length} users · full system access`
            : `${users.length} users · ${groups.length} groups · full system access`
        }
      />

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}         label="Total Users"
          value={users.length} sub={`${activeUsers.length} active · ${inactiveUsers.length} inactive`}
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/users')}
        />
        <StatCard
          icon={GraduationCap} label="Capstone Groups"
          value={groups.length} sub={`${activeGroups.length} active · ${archivedGroups.length} archived`}
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/groups')}
        />
        <StatCard
          icon={Calendar}      label="Defenses"
          value={defenses.length} sub={`${scheduledDefs.length} upcoming`}
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defenses')}
        />
        <StatCard
          icon={MessageSquare} label="Consultations"
          value={consultations.length} sub={`${recentConsultations.length} in last 30 days`}
          color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }}
          onClick={() => navigate('/consultations')}
        />
      </div>

      {/* ── Overview row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Defense pipeline */}
        <Card>
          <CardHeader title="Defense Pipeline" />
          <div className="px-5 py-4">
            {defenses.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No defenses recorded</p>
            ) : (
              <>
                <MiniBarChart rows={[
                  { label: 'Scheduled',  count: scheduledDefs.length, color: '#7c3aed' },
                  { label: 'Completed',  count: completedDefs.length, color: '#16a34a' },
                  { label: 'Cancelled',  count: cancelledDefs.length, color: '#dc2626' },
                ]} />
                <div className="mt-4 pt-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-light)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>{defenses.length}</span>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Group overview */}
        <Card>
          <CardHeader title="Group Overview" />
          <div className="px-5 py-4">
            {groups.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No groups registered</p>
            ) : (
              <>
                <MiniBarChart rows={[
                  { label: 'Active',   count: activeGroups.length,   color: '#16a34a' },
                  { label: 'Archived', count: archivedGroups.length, color: '#6b7280' },
                ]} />
                {monGroups.length > 0 && (
                  <div className="mt-4 pt-3 border-t space-y-1" style={{ borderColor: 'var(--border-light)' }}>
                    {[
                      { label: 'On track (≥75%)',   count: monGroups.filter((g) => (g.consultationScore ?? 0) >= 75).length,                                        color: '#16a34a' },
                      { label: 'Moderate (50–74%)',  count: monGroups.filter((g) => { const s = g.consultationScore ?? 0; return s >= 50 && s < 75 }).length,        color: '#c9a84c' },
                      { label: 'At risk (<50%)',     count: atRiskGroups.length,                                                                                     color: '#ef4444' },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
                        </div>
                        <span className="text-xs font-semibold tabular-nums" style={{ color }}>{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* User distribution */}
        <Card>
          <CardHeader title="User Distribution" />
          <div className="px-5 py-4">
            {users.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No user data</p>
            ) : (
              <>
                <RoleBreakdownBar users={users} />
                <div className="mt-4 pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-light)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Active accounts</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                      {activeUsers.length} / {users.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>2FA enabled</span>
                    <span className="text-xs font-bold" style={{ color: twoFaPct >= 50 ? '#16a34a' : '#f59e0b' }}>
                      {twoFaUsers.length} ({twoFaPct}%)
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ── Alert banners ─────────────────────────────────────────────────────── */}
      {atRiskGroups.length > 0 && (
        <AlertBanner
          icon={AlertCircle}
          color="#f59e0b"
          title={`${atRiskGroups.length} group${atRiskGroups.length !== 1 ? 's' : ''} below consultation threshold`}
          body={atRiskGroups.slice(0, 3).map((g) => g.groupName ?? g.projectTitle).join(', ') + (atRiskGroups.length > 3 ? ` and ${atRiskGroups.length - 3} more` : '') + ' — score below 50%'}
          action="View monitoring"
          onAction={() => navigate('/monitoring')}
        />
      )}
      {soonDefenses.length > 0 && (
        <AlertBanner
          icon={Calendar}
          color="#7c3aed"
          title={`${soonDefenses.length} defense${soonDefenses.length !== 1 ? 's' : ''} scheduled in the next 7 days`}
          body={`Next: ${soonDefenses[0]?.groupName} on ${new Date(soonDefenses[0]?.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
          action="View all"
          onAction={() => navigate('/defenses')}
        />
      )}
      {inactiveUsers.length > 0 && (
        <AlertBanner
          icon={ShieldCheck}
          color="#6b7280"
          title={`${inactiveUsers.length} deactivated account${inactiveUsers.length !== 1 ? 's' : ''}`}
          body="These accounts cannot log in. Review in user management if re-activation is needed."
          action="Manage users"
          onAction={() => navigate('/users')}
        />
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Monitoring table — 2/3 */}
        <div className="xl:col-span-2">
          <SectionHeader
            title="Group Consultation Monitoring"
            action={
              <button className="btn-ghost text-xs" onClick={() => navigate('/monitoring')}>Full report</button>
            }
          />
          <Card>
            {monGroups.length === 0 ? (
              <EmptyCard icon={TrendingUp} message="No monitoring data yet" hint="Data appears once groups are active and logging consultations" />
            ) : (
              <div>
                <div
                  className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wide border-b"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}
                >
                  <span className="col-span-5">Group / Project</span>
                  <span className="col-span-2 text-center">Total</span>
                  <span className="col-span-2 text-center">Last 30d</span>
                  <span className="col-span-3 text-right">Score</span>
                </div>
                {monGroups.map((g, idx) => {
                  const score      = g.consultationScore ?? 0
                  const scoreColor = score >= 75 ? '#16a34a' : score >= 50 ? '#c9a84c' : '#ef4444'
                  const scoreBg    = score >= 75 ? 'rgba(34,197,94,0.10)' : score >= 50 ? 'rgba(201,168,76,0.10)' : 'rgba(239,68,68,0.08)'
                  return (
                    <div
                      key={g.groupId}
                      className="transition-colors duration-100"
                      style={{ borderBottom: idx < monGroups.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div className="grid grid-cols-12 gap-2 px-5 pt-3 pb-1 items-center">
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {g.projectTitle || g.groupName}
                          </p>
                          {g.projectTitle && (
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{g.groupName}</p>
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
                        <div className="col-span-3 flex justify-end">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ background: scoreBg, color: scoreColor }}
                          >
                            {score}%
                          </span>
                        </div>
                      </div>
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

        {/* Right column */}
        <div className="space-y-6">

          {/* Recent users */}
          <div>
            <SectionHeader
              title="Recent Users"
              action={
                <button className="btn-ghost text-xs" onClick={() => navigate('/users')}>Manage all</button>
              }
            />
            <Card>
              {recentUsers.length === 0 ? (
                <EmptyCard icon={Users} message="No users yet" />
              ) : (
                <div>
                  {recentUsers.map((u, idx) => {
                    const roleColor = { Student: '#38bdf8', Faculty: '#34d399', Admin: '#fb923c', SuperAdmin: '#f87171' }[u.role] ?? '#c9a84c'
                    const initials  = u.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
                        style={{ borderBottom: idx < recentUsers.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{
                            background: 'linear-gradient(135deg, #0a1628, #162238)',
                            color: roleColor,
                            border: `1.5px solid ${roleColor}40`,
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {u.fullName ?? u.email}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                        </div>
                        <span
                          className="text-xs font-medium shrink-0 px-2 py-0.5 rounded-lg"
                          style={{ background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}
                        >
                          {u.role}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Quick actions */}
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
    Faculty:    FacultyDashboard,
    Admin:      AdminDashboard,
    SuperAdmin: SuperAdminDashboard,
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
