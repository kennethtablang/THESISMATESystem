import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusLabel, statusVariant } from '../../components/ui/Badge'
import {
  Users, FileText, Calendar, AlertCircle, ArrowRight,
  BarChart3, GraduationCap, MessageSquare, Upload, Cpu,
  CalendarClock, ShieldCheck, CheckCircle2, Star, BookOpen,
  TrendingUp, ChevronRight, School, ClipboardList,
  Shield, LayoutDashboard, Bell, CheckCheck, PenLine,
} from 'lucide-react'
import {
  groupService, chapterService, consultationService,
  defenseService, consultationScheduleService, authService,
  monitoringService, classroomService, notificationService,
  documentService,
} from '../../services/api'

// ── Phase config ─────────────────────────────────────────────────────────────
const PHASE_META = {
  TitleDefense:    { label: 'Title Defense',    short: 'TD', color: '#7c3aed', bg: 'rgba(124,58,237,0.12)'  },
  ProposalDefense: { label: 'Proposal Defense', short: 'PD', color: '#c9a84c', bg: 'rgba(201,168,76,0.12)'  },
  FinalDefense:    { label: 'Final Defense',    short: 'FD', color: '#16a34a', bg: 'rgba(34,197,94,0.12)'   },
}
function phaseMeta(key) { return PHASE_META[key] ?? { label: key, short: '?', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' } }

function phaseLabel(key) { return phaseMeta(key).label }
function phaseColor(key) { return phaseMeta(key).color }

// ─── Shared UI ───────────────────────────────────────────────────────────────

function WelcomeBanner({ badge, badgeColor, name, sub, gradient, extra, tags }) {
  const today   = new Date()
  const day     = today.getDate()
  const month   = today.toLocaleDateString('en-PH', { month: 'short' })
  const weekday = today.toLocaleDateString('en-PH', { weekday: 'long' })

  return (
    <div className="rounded-2xl mb-6 overflow-hidden relative" style={{ background: gradient }}>
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #c9a84c 0%, rgba(201,168,76,0.15) 100%)' }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
      <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, rgba(${badgeColor}, 0.08) 0%, transparent 65%)` }} />
      <div className="absolute -left-8 -bottom-12 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%)' }} />

      <div className="relative z-10 px-6 pt-6 pb-7 sm:px-8 sm:pt-7">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg mb-4"
              style={{ background: `rgba(${badgeColor}, 0.15)`, border: `1px solid rgba(${badgeColor}, 0.25)` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${badgeColor})` }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: `rgb(${badgeColor})` }}>
                {badge}
              </span>
            </div>
            <h2 className="font-display font-bold text-white"
              style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              {name}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{sub}</p>
            {tags && tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map(t => (
                  <div key={t.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {t.icon && <t.icon size={11} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />}
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap' }}>{t.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="hidden sm:flex flex-col items-center shrink-0 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 72, backdropFilter: 'blur(8px)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>{month}</p>
            <p className="font-display font-bold text-white"
              style={{ fontSize: '2.2rem', letterSpacing: '-2px', lineHeight: 1.05 }}>{day}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{weekday.slice(0, 3)}</p>
          </div>
        </div>
        {extra && <div className="mt-5">{extra}</div>}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <button type="button" className="stat-card w-full text-left group relative overflow-hidden" onClick={onClick}>
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl" style={{ background: color.icon }} />
      <div className="absolute inset-x-0 top-0 h-16 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${color.bg} 0%, transparent 100%)`, opacity: 0.6 }} />
      <div className="pl-2 relative">
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: color.bg, border: `1px solid ${color.icon}25`, boxShadow: `0 0 12px ${color.icon}20` }}>
            <Icon size={18} style={{ color: color.icon }} strokeWidth={1.75} />
          </div>
          <ChevronRight size={15} className="opacity-0 group-hover:opacity-60 transition-opacity mt-0.5 shrink-0"
            style={{ color: 'var(--text-muted)' }} />
        </div>
        <p className="font-display font-bold leading-none mb-2"
          style={{ color: 'var(--text-heading)', fontSize: '1.9rem', letterSpacing: '-1.5px' }}>{value}</p>
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {sub && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
    </button>
  )
}

function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-[3px] h-5 rounded-full" style={{ background: '#c9a84c' }} />
        <h3 className="font-semibold" style={{ color: 'var(--text-heading)', fontSize: '15px' }}>{title}</h3>
      </div>
      {action}
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)' }}>
      {children}
    </div>
  )
}

function CardHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
      <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{title}</p>
      {action}
    </div>
  )
}

function QuickActions({ items }) {
  const navigate = useNavigate()
  return (
    <div className="p-4 grid grid-cols-1 gap-2">
      {items.map(a => (
        <button key={a.label} type="button" onClick={() => navigate(a.to)}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left group transition-all duration-150"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)'; e.currentTarget.style.background = 'rgba(201,168,76,0.06)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.18)' }}>
            <a.icon size={15} style={{ color: '#c9a84c' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{a.label}</p>
            {a.desc && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{a.desc}</p>}
          </div>
          <ArrowRight size={14} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#c9a84c' }} />
        </button>
      ))}
    </div>
  )
}

function EmptyCard({ icon: Icon, message, hint }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
        <Icon size={20} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
      </div>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

function DashboardLoader() {
  return (
    <div className="p-6 sm:p-8">
      <div className="h-32 rounded-2xl mb-6 animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
        ))}
      </div>
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
    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Chapter Progress</span>
        <span className="text-sm font-bold" style={{ color: '#c9a84c' }}>{progress}%</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #c9a84c, #d4b565)' }} />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{approved} of {total} chapters approved</span>
        {needsRevision > 0 && (
          <span className="text-xs font-medium" style={{ color: '#f59e0b' }}>{needsRevision} needs revision</span>
        )}
      </div>
    </div>
  )
}

function AlertBanner({ icon: Icon, color, title, body, action, onAction }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-4"
      style={{ background: `${color}10`, border: `1px solid ${color}30` }}>
      <Icon size={16} style={{ color, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color }}>{title}</p>
        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{body}</p>
      </div>
      {action && <button className="btn-ghost text-xs shrink-0" onClick={onAction}>{action}</button>}
    </div>
  )
}

function MiniBarChart({ rows }) {
  const max = Math.max(...rows.map(r => r.count), 1)
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
            <div className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.round((count / max) * 100)}%`, background: color, opacity: 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// Phase breakdown bar (for defense pipeline)
function PhaseBarChart({ defenses }) {
  const phases = [
    { key: 'TitleDefense',    label: 'Title Defense',    color: '#7c3aed' },
    { key: 'ProposalDefense', label: 'Proposal Defense', color: '#c9a84c' },
    { key: 'FinalDefense',    label: 'Final Defense',    color: '#16a34a' },
  ]
  const rows = phases.map(ph => ({
    label:     ph.label,
    color:     ph.color,
    scheduled: defenses.filter(d => d.phase === ph.key && (d.status === 'Scheduled' || d.status === 'Rescheduled')).length,
    completed: defenses.filter(d => d.phase === ph.key && d.status === 'Completed').length,
    total:     defenses.filter(d => d.phase === ph.key).length,
  }))
  const maxTotal = Math.max(...rows.map(r => r.total), 1)
  return (
    <div className="space-y-4">
      {rows.map(r => (
        <div key={r.label}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: r.color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {r.scheduled > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: `${r.color}18`, color: r.color }}>{r.scheduled} upcoming</span>
              )}
              {r.completed > 0 && (
                <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.completed} done</span>
              )}
              {r.total === 0 && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>0</span>
              )}
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
            <div className="h-full flex rounded-full overflow-hidden">
              {r.total > 0 && (
                <>
                  <div className="h-full transition-all duration-700"
                    style={{ width: `${Math.round((r.completed / maxTotal) * 100)}%`, background: r.color, opacity: 0.9 }} />
                  <div className="h-full transition-all duration-700"
                    style={{ width: `${Math.round((r.scheduled / maxTotal) * 100)}%`, background: r.color, opacity: 0.4 }} />
                </>
              )}
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-4 pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: 'var(--text-muted)', opacity: 0.9 }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-2 rounded-sm" style={{ background: 'var(--text-muted)', opacity: 0.4 }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Upcoming</span>
        </div>
      </div>
    </div>
  )
}

const ROLE_META = {
  SuperAdmin: { color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
  Admin:      { color: '#ea580c', bg: 'rgba(249,115,22,0.12)' },
  Faculty:    { color: '#16a34a', bg: 'rgba(34,197,94,0.12)'  },
  Student:    { color: '#0284c7', bg: 'rgba(14,165,233,0.12)' },
}

function RoleBreakdownBar({ users }) {
  const total = users.length
  if (total === 0) return null
  const rows = ['Student', 'Faculty', 'Admin', 'SuperAdmin'].map(role => ({
    role,
    count: users.filter(u => u.role === role).length,
  }))
  const max = Math.max(...rows.map(r => r.count), 1)
  return (
    <div className="space-y-3">
      {rows.map(({ role, count }) => {
        const meta = ROLE_META[role]
        return (
          <div key={role}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{role}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {total > 0 ? Math.round((count / total) * 100) : 0}%
                </span>
                <span className="text-xs font-semibold tabular-nums" style={{ color: meta.color, minWidth: 18, textAlign: 'right' }}>
                  {count}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
              <div className="h-1.5 rounded-full transition-all duration-700"
                style={{ width: `${Math.round((count / max) * 100)}%`, background: meta.color, opacity: 0.85 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Shared: Recent Notifications ────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

const NOTIF_TYPE_COLORS = {
  ChapterSubmitted:             { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)'  },
  ChapterStatusUpdated:         { color: '#c9a84c', bg: 'rgba(201,168,76,0.12)'  },
  RevisionNoteAdded:            { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  ConsultationLogged:           { color: '#16a34a', bg: 'rgba(34,197,94,0.12)'   },
  ConsultationRequested:        { color: '#0284c7', bg: 'rgba(14,165,233,0.12)'  },
  ConsultationRequestResponded: { color: '#0284c7', bg: 'rgba(14,165,233,0.12)'  },
  DefenseScheduled:             { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)'  },
  DefenceCancelled:             { color: '#dc2626', bg: 'rgba(239,68,68,0.12)'   },
  DefenseRescheduled:           { color: '#ea580c', bg: 'rgba(249,115,22,0.12)'  },
  RatingSubmitted:              { color: '#c9a84c', bg: 'rgba(201,168,76,0.12)'  },
  DocumentUploaded:             { color: '#16a34a', bg: 'rgba(34,197,94,0.12)'   },
  DocumentCommented:            { color: '#0284c7', bg: 'rgba(14,165,233,0.12)'  },
  ClassroomAnnouncement:        { color: '#0891b2', bg: 'rgba(8,145,178,0.12)'   },
  ClassroomInvitation:          { color: '#0891b2', bg: 'rgba(8,145,178,0.12)'   },
  ManuscriptUpdated:            { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)'  },
  DeadlinePosted:               { color: '#dc2626', bg: 'rgba(239,68,68,0.12)'   },
}
function notifStyle(type) {
  return NOTIF_TYPE_COLORS[type] ?? { color: '#c9a84c', bg: 'rgba(201,168,76,0.12)' }
}

function RecentNotifications({ className = 'px-4 sm:px-6 lg:px-8 mt-6 mb-6' }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [markingAll,    setMarkingAll]    = useState(false)

  useEffect(() => {
    notificationService.list()
      .then(ns => setNotifications(Array.isArray(ns) ? ns : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleMarkRead(id) {
    try {
      await notificationService.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch {}
  }

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await notificationService.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {} finally {
      setMarkingAll(false)
    }
  }

  if (loading) return null

  const unread = notifications.filter(n => !n.isRead)
  const recent = [...notifications]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  if (recent.length === 0) return null

  return (
    <div className={className}>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <div className="flex items-center gap-2">
            <Bell size={14} style={{ color: unread.length > 0 ? '#c9a84c' : 'var(--text-muted)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Recent Activity</span>
            {unread.length > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)' }}>
                {unread.length} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                disabled={markingAll}
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium transition-opacity"
                style={{ color: 'var(--text-muted)', opacity: markingAll ? 0.5 : 1 }}>
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
            <button className="btn-ghost text-xs" onClick={() => navigate('/notifications')}>View all</button>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {recent.map(n => {
            const ns = notifStyle(n.type)
            return (
              <div key={n.id}
                className="flex items-start gap-3 px-5 py-3 transition-colors duration-100 cursor-pointer"
                style={{ background: n.isRead ? 'transparent' : 'rgba(201,168,76,0.03)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? 'transparent' : 'rgba(201,168,76,0.03)')}
                onClick={() => !n.isRead && handleMarkRead(n.id)}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: ns.bg }}>
                  <Bell size={12} style={{ color: ns.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed" style={{ color: n.isRead ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: n.isRead ? 400 : 500 }}>
                    {n.message}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: '#c9a84c' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Student Dashboard ────────────────────────────────────────────────────────

function StudentDashboard({ user }) {
  const navigate = useNavigate()
  const [group,        setGroup]        = useState(null)
  const [chapters,     setChapters]     = useState([])
  const [consultations,setConsultations]= useState([])
  const [defenses,     setDefenses]     = useState([])
  const [deadlines,    setDeadlines]    = useState([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    groupService.myGroup()
      .then(g => {
        setGroup(g)
        return Promise.all([
          chapterService.listByGroup(g.id).catch(() => []),
          consultationService.byGroup(g.id).catch(() => []),
          defenseService.byGroup(g.id).catch(() => []),
          groupService.getDeadlines(g.id).catch(() => []),
        ])
      })
      .then(([ch, co, de, dl]) => {
        setChapters(ch)
        setConsultations(co)
        setDefenses(de)
        setDeadlines(dl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const approved       = chapters.filter(c => c.status === 'Approved').length
  const needsRevision  = chapters.filter(c => c.status === 'UnderRevision').length
  const pendingReview  = chapters.filter(c => c.status === 'PendingReview').length

  const activeDefenses = defenses
    .filter(d => d.status !== 'Cancelled')
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))
  const nextDefense = activeDefenses.find(d => new Date(d.scheduledDateTime) >= new Date()) ?? activeDefenses[0]

  const now = new Date()
  const upcomingDeadlines = deadlines
    .filter(d => new Date(d.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3)

  const bannerTags = []
  if (group) {
    bannerTags.push({ icon: Users, label: group.groupName })
    if (group.projectTitle) bannerTags.push({ icon: BookOpen, label: group.projectTitle })
    if (group.academicYear) bannerTags.push({ icon: School, label: group.academicYear })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
      <WelcomeBanner
        gradient="linear-gradient(135deg, #060e1f 0%, #0a1628 50%, #0f1e38 100%)"
        badge="Student"
        badgeColor="201,168,76"
        name={user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'Student'}
        sub={
          group
            ? needsRevision > 0
              ? `${needsRevision} chapter${needsRevision !== 1 ? 's' : ''} need revision — check your adviser's feedback.`
              : 'Keep progressing on your capstone. Your adviser is tracking your submissions.'
            : 'You are not yet assigned to a capstone group. Contact your adviser.'
        }
        tags={bannerTags}
        extra={chapters.length > 0 && (
          <ProgressBanner approved={approved} total={chapters.length} needsRevision={needsRevision} />
        )}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={FileText} label="Chapters Submitted" value={chapters.length}
          sub={approved > 0 ? `${approved} approved` : 'None approved yet'}
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/chapters')}
        />
        <StatCard
          icon={AlertCircle} label="Needs Attention"
          value={needsRevision + pendingReview}
          sub={needsRevision > 0 ? `${needsRevision} under revision` : pendingReview > 0 ? `${pendingReview} pending review` : 'All clear'}
          color={{ bg: needsRevision > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)', icon: needsRevision > 0 ? '#f59e0b' : '#16a34a' }}
          onClick={() => navigate('/chapters')}
        />
        <StatCard
          icon={MessageSquare} label="Consultations" value={consultations.length}
          sub="logged this semester"
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/consultations')}
        />
        <StatCard
          icon={Calendar}
          label={nextDefense ? phaseLabel(nextDefense.phase) : 'Defense'}
          value={nextDefense
            ? new Date(nextDefense.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
            : '—'}
          sub={nextDefense ? nextDefense.venue || 'Scheduled' : 'Not yet scheduled'}
          color={{ bg: nextDefense ? `${phaseColor(nextDefense.phase)}18` : 'rgba(124,58,237,0.12)', icon: nextDefense ? phaseColor(nextDefense.phase) : '#7c3aed' }}
          onClick={() => navigate('/defenses')}
        />
      </div>

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <div className="mb-6">
          <SectionHeader title="Upcoming Deadlines" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {upcomingDeadlines.map(dl => {
              const days   = Math.ceil((new Date(dl.dueDate) - now) / 86400000)
              const urgent = days <= 3
              const warn   = days <= 7
              const color  = urgent ? '#dc2626' : warn ? '#f59e0b' : '#3b82f6'
              return (
                <div key={dl.id} className="rounded-xl p-4"
                  style={{ background: 'var(--bg-card)', border: `1px solid ${color}30` }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: `${color}15`, color }}>
                      {days === 0 ? 'Today' : days}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{dl.title}</p>
                      <p className="text-xs mt-0.5" style={{ color }}>
                        {days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `Due in ${days} days`}
                      </p>
                      {dl.description && (
                        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{dl.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Chapter Submissions — full width */}
      <div className="mb-6">
        <SectionHeader
          title="Chapter Submissions"
          action={<button className="btn-ghost text-xs" onClick={() => navigate('/chapters')}>View all</button>}
        />
        <Card>
          {chapters.length === 0 ? (
            <EmptyCard icon={FileText} message="No chapters submitted yet" hint="Upload your first chapter to get started" />
          ) : (
            <div>
              {chapters.map((c, idx) => {
                const isApproved = c.status === 'Approved'
                const isRevision = c.status === 'UnderRevision'
                const isPending  = c.status === 'PendingReview'
                const accentColor = isApproved ? '#16a34a' : isRevision ? '#f59e0b' : isPending ? '#3b82f6' : 'var(--border-main)'
                const iconBg     = isApproved ? 'rgba(34,197,94,0.12)' : isRevision ? 'rgba(245,158,11,0.12)' : isPending ? 'rgba(59,130,246,0.12)' : 'var(--bg-subtle)'
                const iconColor  = isApproved ? '#16a34a' : isRevision ? '#f59e0b' : isPending ? '#3b82f6' : 'var(--text-muted)'
                return (
                  <div key={c.id}
                    className="relative flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                    style={{ borderBottom: idx < chapters.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div className="absolute left-0 inset-y-2 w-[3px] rounded-r-full"
                      style={{ background: accentColor, opacity: (isApproved || isRevision || isPending) ? 0.7 : 0 }} />
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: iconBg, color: iconColor, border: `1px solid ${accentColor}35` }}>
                      {c.chapterNumber ?? '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {c.fileName || `Chapter ${c.chapterNumber}`}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {c.submittedAt
                          ? `Submitted ${new Date(c.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : 'Date unknown'}
                      </p>
                    </div>
                    <Badge variant={statusVariant(c.status)} size="sm">{statusLabel(c.status)}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Activity — after Chapter Submissions */}
      <RecentNotifications className="mb-6" />

      {/* Defense schedule + Quick Actions + My Team */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {/* Defense schedule */}
          {activeDefenses.length > 0 && (
            <div>
              <SectionHeader
                title="My Defense Schedule"
                action={<button className="btn-ghost text-xs" onClick={() => navigate('/defenses')}>View all</button>}
              />
              <Card>
                <div>
                  {activeDefenses.slice(0, 3).map((d, idx) => {
                    const pm = phaseMeta(d.phase)
                    return (
                      <div key={d.id}
                        className="flex items-center gap-3 px-5 py-4 transition-colors duration-100"
                        style={{ borderBottom: idx < Math.min(activeDefenses.length, 3) - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: pm.bg }}>
                          <span className="text-xs font-bold" style={{ color: pm.color }}>{pm.short}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{pm.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {d.venue ? ` · ${d.venue}` : ''}
                          </p>
                        </div>
                        <Badge variant={statusVariant(d.status)} size="sm">{statusLabel(d.status)}</Badge>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader title="Quick Actions" />
            <Card>
              <QuickActions items={[
                { icon: Upload,        label: 'Upload a document',     desc: 'Submit chapter or file',    to: '/documents'       },
                { icon: BookOpen,      label: 'Manuscript editor',     desc: 'Edit your thesis draft',    to: '/manuscript'      },
                { icon: CalendarClock, label: 'Consultation calendar', desc: 'View your schedule',        to: '/calendar'        },
                { icon: Cpu,           label: 'System tracker',        desc: 'Monitor feature progress',  to: '/system-features' },
              ]} />
            </Card>
          </div>

          {group && (
            <div>
              <SectionHeader title="My Team" />
              <Card>
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>Adviser</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: 'linear-gradient(135deg, #042e1f, #064e3b)', color: '#34d399', border: '1.5px solid rgba(52,211,153,0.25)' }}>
                      {group.adviser?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{group.adviser?.fullName ?? '—'}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{group.adviser?.email}</p>
                    </div>
                  </div>
                </div>
                <div className="px-5 pt-3 pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                    Members ({group.members?.length ?? 0})
                  </p>
                </div>
                <div>
                  {group.members?.map((m, idx) => (
                    <div key={m.id}
                      className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-100"
                      style={{ borderBottom: idx < group.members.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: 'rgba(14,165,233,0.12)', color: '#0284c7' }}>
                        {m.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.fullName}</p>
                        {m.studentId && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.studentId}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Faculty Dashboard ────────────────────────────────────────────────────────

function FacultyDashboard({ user }) {
  const navigate = useNavigate()
  const [groups,          setGroups]          = useState([])
  const [pendingChapters, setPendingChapters] = useState([])
  const [consultations,   setConsultations]   = useState([])
  const [myDefenses,      setMyDefenses]      = useState([])
  const [schedules,       setSchedules]       = useState([])
  const [recentDocs,      setRecentDocs]      = useState([])
  const [loading,         setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      consultationService.list().catch(() => []),
      defenseService.mySchedules().catch(() => []),
      consultationScheduleService.mySchedules().catch(() => []),
      documentService.forAdviser().catch(() => []),
    ]).then(async ([gs, co, defs, sc, docs]) => {
      setGroups(gs)
      setConsultations(co)
      setMyDefenses(defs)
      setSchedules(sc)
      setRecentDocs(
        [...(Array.isArray(docs) ? docs : [])]
          .sort((a, b) => new Date(b.uploadedAt ?? b.createdAt) - new Date(a.uploadedAt ?? a.createdAt))
          .slice(0, 5)
      )
      const chaptersByGroup = await Promise.all(
        gs.map(g =>
          chapterService.listByGroup(g.id)
            .then(ch => ch.map(c => ({ ...c, groupName: g.groupName })))
            .catch(() => [])
        )
      )
      setPendingChapters(
        chaptersByGroup.flat().filter(c => c.status === 'PendingReview' || c.status === 'UnderRevision')
      )
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const now = new Date()

  const upcomingDefenses = myDefenses
    .filter(d => d.status !== 'Cancelled' && d.status !== 'Completed')
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))

  const upcomingSlots = schedules
    .filter(s => new Date(s.scheduledStartAt) >= now && s.status !== 'Cancelled')
    .sort((a, b) => new Date(a.scheduledStartAt) - new Date(b.scheduledStartAt))
    .slice(0, 3)

  const thisMonthConsultations = consultations.filter(c => {
    const d = new Date(c.consultationDate ?? c.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

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
            : upcomingDefenses.length > 0
            ? `${upcomingDefenses.length} defense assignment${upcomingDefenses.length !== 1 ? 's' : ''} upcoming.`
            : 'Welcome back. All tasks are up to date.'
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Advised Groups" value={groups.length}
          sub={`${groups.filter(g => g.status === 'Active').length} active`}
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/groups')} />
        <StatCard icon={FileText} label="Pending Reviews" value={pendingChapters.length}
          sub={pendingChapters.length > 0 ? 'Requires response' : 'All reviewed'}
          color={{ bg: pendingChapters.length > 0 ? 'rgba(245,158,11,0.12)' : 'rgba(34,197,94,0.08)', icon: pendingChapters.length > 0 ? '#f59e0b' : '#16a34a' }}
          onClick={() => navigate('/chapters')} />
        <StatCard icon={Star} label="Defense Assignments" value={upcomingDefenses.length}
          sub="upcoming defenses"
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defenses')} />
        <StatCard icon={MessageSquare} label="Consultations" value={thisMonthConsultations.length}
          sub="this month"
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/consultations')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">

          {/* Recent manuscript submissions */}
          {recentDocs.length > 0 && (
            <div>
              <SectionHeader
                title="Recently Submitted Manuscripts"
                action={<button className="btn-ghost text-xs" onClick={() => navigate('/documents')}>View all</button>}
              />
              <Card>
                <div>
                  {recentDocs.map((doc, idx) => {
                    const submittedDate = new Date(doc.uploadedAt ?? doc.createdAt)
                    const daysAgo = Math.floor((Date.now() - submittedDate) / 86400000)
                    const ageLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`
                    const isNew = daysAgo <= 2
                    return (
                      <div key={doc.id}
                        className="flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                        style={{ borderBottom: idx < recentDocs.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                          <FileText size={18} style={{ color: '#7c3aed' }} strokeWidth={1.75} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {doc.fileName ?? doc.title ?? 'Untitled document'}
                            </p>
                            {isNew && (
                              <span className="text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0"
                                style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)' }}>
                                New
                              </span>
                            )}
                          </div>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {doc.groupName ?? 'Unknown group'}{' · '}{ageLabel}
                            {doc.version && ` · v${doc.version}`}
                          </p>
                        </div>
                        <button
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                          style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.2)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.1)' }}
                          onClick={() => navigate('/documents')}>
                          <PenLine size={12} />
                          Review
                        </button>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Pending chapter reviews */}
          {pendingChapters.length > 0 && (
            <div>
              <SectionHeader
                title="Pending Chapter Reviews"
                action={<button className="btn-ghost text-xs" onClick={() => navigate('/chapters')}>View all</button>}
              />
              <Card>
                <div>
                  {pendingChapters.slice(0, 6).map((c, i) => {
                    const isRevision = c.status === 'UnderRevision'
                    const color = isRevision ? '#f59e0b' : '#3b82f6'
                    return (
                      <div key={c.id ?? i}
                        className="flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                        style={{ borderBottom: i < Math.min(pendingChapters.length, 6) - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
                          {c.chapterNumber ?? '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {c.fileName || `Chapter ${c.chapterNumber}`}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.groupName}</p>
                        </div>
                        <Badge variant={statusVariant(c.status)} size="sm">{statusLabel(c.status)}</Badge>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Upcoming defense assignments */}
          {upcomingDefenses.length > 0 && (
            <div>
              <SectionHeader
                title="Upcoming Defense Assignments"
                action={<button className="btn-ghost text-xs" onClick={() => navigate('/defenses')}>View all</button>}
              />
              <Card>
                <div>
                  {upcomingDefenses.slice(0, 5).map((d, idx) => {
                    const pm = phaseMeta(d.phase)
                    return (
                      <div key={d.id}
                        className="flex items-center gap-4 px-5 py-4 transition-colors duration-100"
                        style={{ borderBottom: idx < Math.min(upcomingDefenses.length, 5) - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: pm.bg }}>
                          <span className="text-xs font-bold" style={{ color: pm.color }}>{pm.short}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.groupName}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {pm.label} ·{' '}
                            {new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <Badge variant={statusVariant(d.status)} size="sm">{statusLabel(d.status)}</Badge>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {pendingChapters.length === 0 && upcomingDefenses.length === 0 && (
            <Card>
              <EmptyCard icon={CheckCircle2} message="All caught up" hint="No pending reviews or upcoming defense assignments" />
            </Card>
          )}
        </div>

        <div className="space-y-6">

          {/* Today's schedule */}
          {(() => {
            const todayStr = new Date().toDateString()
            const todayDefenses = myDefenses.filter(d =>
              d.status !== 'Cancelled' && new Date(d.scheduledDateTime).toDateString() === todayStr
            )
            const todaySlots = schedules.filter(s =>
              s.status !== 'Cancelled' && new Date(s.scheduledStartAt).toDateString() === todayStr
            )
            if (todayDefenses.length === 0 && todaySlots.length === 0) return null
            const allItems = [
              ...todayDefenses.map(d => ({ type: 'defense', time: d.scheduledDateTime, data: d })),
              ...todaySlots.map(s => ({ type: 'slot',    time: s.scheduledStartAt,  data: s })),
            ].sort((a, b) => new Date(a.time) - new Date(b.time))
            return (
              <div>
                <SectionHeader title="Today's Schedule" />
                <Card>
                  {allItems.map(({ type, data }, idx) => {
                    if (type === 'defense') {
                      const pm = phaseMeta(data.phase)
                      return (
                        <div key={`d-${data.id}`}
                          className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
                          style={{ borderBottom: idx < allItems.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: pm.bg }}>
                            <span className="text-xs font-bold" style={{ color: pm.color }}>{pm.short}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{data.groupName}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {new Date(data.scheduledDateTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                              {' · '}{pm.label}
                            </p>
                          </div>
                        </div>
                      )
                    }
                    return (
                      <div key={`s-${data.id}`}
                        className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
                        style={{ borderBottom: idx < allItems.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(59,130,246,0.12)' }}>
                          <CalendarClock size={14} style={{ color: '#3b82f6' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{data.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {new Date(data.scheduledStartAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                            {' · '}Consultation slot
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </Card>
              </div>
            )
          })()}

          {/* Advised groups progress */}
          {groups.length > 0 && (
            <div>
              <SectionHeader
                title="My Advised Groups"
                action={<button className="btn-ghost text-xs" onClick={() => navigate('/groups')}>View all</button>}
              />
              <Card>
                <div>
                  {groups.slice(0, 5).map((g, idx) => {
                    const prog = Number(g.milestoneProgress?.completionPercentage ?? 0)
                    const pColor = prog >= 70 ? '#16a34a' : prog >= 40 ? '#c9a84c' : 'var(--text-muted)'
                    return (
                      <div key={g.id}
                        className="px-5 py-4 transition-colors duration-100 cursor-pointer"
                        style={{ borderBottom: idx < Math.min(groups.length, 5) - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        onClick={() => navigate(`/groups/${g.id}`)}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {g.groupName}
                          </p>
                          <span className="text-xs font-bold tabular-nums shrink-0 ml-2" style={{ color: pColor }}>{prog}%</span>
                        </div>
                        <div className="h-1.5 rounded-full mb-1" style={{ background: 'var(--bg-subtle)' }}>
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${prog}%`, background: prog >= 70 ? '#16a34a' : prog >= 40 ? '#c9a84c' : 'var(--border-main)' }} />
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {g.members?.length ?? 0} members · {g.academicYear}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* Upcoming consultation slots */}
          {upcomingSlots.length > 0 && (
            <div>
              <SectionHeader
                title="Upcoming Consultation Slots"
                action={<button className="btn-ghost text-xs" onClick={() => navigate('/consultation-manager')}>Manage</button>}
              />
              <Card>
                <div>
                  {upcomingSlots.map((s, idx) => (
                    <div key={s.id}
                      className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
                      style={{ borderBottom: idx < upcomingSlots.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(59,130,246,0.12)' }}>
                        <CalendarClock size={15} style={{ color: '#3b82f6' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {new Date(s.scheduledStartAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {' · '}{s.approvedCount}/{s.maxGroups} groups
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          <div>
            <SectionHeader title="Quick Actions" />
            <Card>
              <QuickActions items={[
                { icon: BookOpen,      label: 'Review Manuscripts',   desc: 'View group manuscripts',    to: '/manuscript'           },
                { icon: LayoutDashboard, label: 'Defense Scheduler',  desc: 'Manage defense calendar',   to: '/defense-scheduler'    },
                { icon: ClipboardList, label: 'Rubric Manager',       desc: 'Manage evaluation rubrics', to: '/rubric-manager'       },
                { icon: CalendarClock, label: 'Consultation Manager', desc: 'Manage consultation slots', to: '/consultation-manager' },
              ]} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ user }) {
  const navigate = useNavigate()
  const [groups,     setGroups]     = useState([])
  const [defenses,   setDefenses]   = useState([])
  const [users,      setUsers]      = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [monitoring, setMonitoring] = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      defenseService.list().catch(() => []),
      authService.allUsers().catch(() => []),
      monitoringService.summary().catch(() => null),
      classroomService.allClassrooms().catch(() => []),
    ]).then(([gs, de, us, mon, cl]) => {
      setGroups(gs)
      setDefenses(de)
      setUsers(Array.isArray(us) ? us : [])
      setMonitoring(mon)
      setClassrooms(Array.isArray(cl) ? cl : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const activeGroups   = groups.filter(g => g.status === 'Active')
  const archivedGroups = groups.filter(g => g.status === 'Archived')
  const activeUsers    = users.filter(u => u.isActive)
  const activeClassrooms = classrooms.filter(c => c.isActive)

  const scheduledDefs  = defenses.filter(d => d.status === 'Scheduled' || d.status === 'Rescheduled')
  const completedDefs  = defenses.filter(d => d.status === 'Completed')
  const cancelledDefs  = defenses.filter(d => d.status === 'Cancelled')

  const now     = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const soonDefenses = scheduledDefs
    .filter(d => d.scheduledDateTime && new Date(d.scheduledDateTime) >= now && new Date(d.scheduledDateTime) <= in7Days)
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))

  const monGroups    = monitoring?.groups ?? []
  const atRiskGroups = monGroups.filter(g => (g.consultationScore ?? 0) < 50)

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
            : `${activeGroups.length} active groups · ${scheduledDefs.length} defense${scheduledDefs.length !== 1 ? 's' : ''} upcoming`
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Active Groups" value={activeGroups.length}
          sub={archivedGroups.length > 0 ? `${archivedGroups.length} archived` : 'No archived groups'}
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/groups')} />
        <StatCard icon={School} label="Classrooms" value={activeClassrooms.length}
          sub={`${classrooms.length} total · ${activeClassrooms.reduce((s, c) => s + (c.enrollmentCount ?? 0), 0)} enrolled`}
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/classrooms')} />
        <StatCard icon={GraduationCap} label="Upcoming Defenses" value={scheduledDefs.length}
          sub={`${completedDefs.length} completed · ${cancelledDefs.length} cancelled`}
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defense-scheduler')} />
        <StatCard icon={ShieldCheck} label="Active Users" value={activeUsers.length}
          sub={`of ${users.length} total accounts`}
          color={{ bg: 'rgba(245,158,11,0.12)', icon: '#f59e0b' }}
          onClick={() => navigate('/users')} />
      </div>

      {/* Overview row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Defense pipeline by phase */}
        <Card>
          <CardHeader title="Defense Pipeline" action={
            <button className="btn-ghost text-xs" onClick={() => navigate('/defense-scheduler')}>Scheduler</button>
          } />
          <div className="px-5 py-4">
            {defenses.length === 0
              ? <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No defenses recorded</p>
              : <PhaseBarChart defenses={defenses} />
            }
          </div>
        </Card>

        {/* Group overview */}
        <Card>
          <CardHeader title="Group Overview" />
          <div className="px-5 py-4">
            {groups.length === 0
              ? <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No groups registered</p>
              : (
                <>
                  <MiniBarChart rows={[
                    { label: 'Active',   count: activeGroups.length,   color: '#16a34a' },
                    { label: 'Archived', count: archivedGroups.length, color: '#6b7280' },
                  ]} />
                  {monGroups.length > 0 && (
                    <div className="mt-4 pt-3 border-t space-y-1.5" style={{ borderColor: 'var(--border-light)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Consultation Health</p>
                      {[
                        { label: 'On track (≥75%)',   count: monGroups.filter(g => (g.consultationScore ?? 0) >= 75).length,                                  color: '#16a34a' },
                        { label: 'Moderate (50–74%)', count: monGroups.filter(g => { const s = g.consultationScore ?? 0; return s >= 50 && s < 75 }).length,  color: '#c9a84c' },
                        { label: 'At risk (<50%)',     count: atRiskGroups.length,                                                                             color: '#ef4444' },
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
            {users.length === 0
              ? <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No user data</p>
              : (
                <>
                  <RoleBreakdownBar users={users} />
                  <div className="mt-4 pt-3 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-light)' }}>
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

      {/* Alert banners */}
      {atRiskGroups.length > 0 && (
        <AlertBanner
          icon={AlertCircle} color="#f59e0b"
          title={`${atRiskGroups.length} group${atRiskGroups.length !== 1 ? 's' : ''} below consultation threshold`}
          body={atRiskGroups.slice(0, 3).map(g => g.groupName ?? g.projectTitle).join(', ') + (atRiskGroups.length > 3 ? ` and ${atRiskGroups.length - 3} more` : '') + ' — score below 50%'}
          action="View monitoring" onAction={() => navigate('/monitoring')}
        />
      )}
      {soonDefenses.length > 0 && (
        <AlertBanner
          icon={Calendar} color="#7c3aed"
          title={`${soonDefenses.length} defense${soonDefenses.length !== 1 ? 's' : ''} scheduled in the next 7 days`}
          body={`Next: ${soonDefenses[0]?.groupName} (${phaseLabel(soonDefenses[0]?.phase)}) on ${new Date(soonDefenses[0]?.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
          action="View all" onAction={() => navigate('/defense-scheduler')}
        />
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader
            title="Group Consultation Monitoring"
            action={<button className="btn-ghost text-xs" onClick={() => navigate('/monitoring')}>Full report</button>}
          />
          <Card>
            {monGroups.length === 0
              ? <EmptyCard icon={TrendingUp} message="No monitoring data yet" hint="Data appears once groups are active and logging consultations" />
              : (
                <div>
                  <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wide border-b"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}>
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
                      <div key={g.groupId} className="transition-colors duration-100"
                        style={{ borderBottom: idx < monGroups.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{g.totalConsultations ?? 0}</span>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{g.consultationsLast30Days ?? 0}</span>
                          </div>
                          <div className="col-span-3 flex justify-end">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: scoreBg, color: scoreColor }}>
                              {score}%
                            </span>
                          </div>
                        </div>
                        <div className="px-5 pb-3">
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                            <div className="h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${score}%`, background: scoreColor }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </Card>
        </div>

        <div className="space-y-6">
          <div>
            <SectionHeader
              title="Upcoming Defenses"
              action={<button className="btn-ghost text-xs" onClick={() => navigate('/defense-scheduler')}>Scheduler</button>}
            />
            <Card>
              {scheduledDefs.length === 0
                ? <EmptyCard icon={Calendar} message="No upcoming defenses" hint="Use the Defense Scheduler to add schedules" />
                : (
                  <div>
                    {scheduledDefs.slice(0, 6).map((d, idx) => {
                      const pm = phaseMeta(d.phase)
                      return (
                        <div key={d.id}
                          className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
                          style={{ borderBottom: idx < Math.min(scheduledDefs.length, 6) - 1 ? '1px solid var(--border-light)' : 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: pm.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.groupName}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {pm.label} · {d.scheduledDateTime
                                ? new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
            </Card>
          </div>

          {groups.length > 0 && (
            <div>
              <SectionHeader
                title="Recent Groups"
                action={<button className="btn-ghost text-xs" onClick={() => navigate('/groups')}>View all</button>}
              />
              <Card>
                {[...groups]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .slice(0, 5)
                  .map((g, idx, arr) => (
                    <div key={g.id}
                      className="px-5 py-3 transition-colors duration-100 cursor-pointer"
                      style={{ borderBottom: idx < arr.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => navigate(`/groups/${g.id}`)}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{g.groupName}</p>
                        <span className="text-xs shrink-0 px-1.5 py-0.5 rounded-md font-medium"
                          style={{
                            background: g.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                            color:      g.status === 'Active' ? '#16a34a'              : '#6b7280',
                          }}>
                          {g.status}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {g.members?.length ?? 0} members · {g.academicYear}
                      </p>
                    </div>
                  ))}
              </Card>
            </div>
          )}

          <div>
            <SectionHeader title="Quick Actions" />
            <Card>
              <QuickActions items={[
                { icon: LayoutDashboard, label: 'Defense Scheduler', desc: 'Schedule & manage defenses',  to: '/defense-scheduler' },
                { icon: ClipboardList,   label: 'Rubric Manager',    desc: 'Manage evaluation rubrics',   to: '/rubric-manager'    },
                { icon: Users,           label: 'Manage users',      desc: 'Roles & accounts',            to: '/users'             },
                { icon: BarChart3,       label: 'Generate report',   desc: 'Export system data',          to: '/reports'           },
              ]} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SuperAdmin Dashboard ─────────────────────────────────────────────────────

function SuperAdminDashboard({ user }) {
  const navigate = useNavigate()
  const [groups,     setGroups]     = useState([])
  const [users,      setUsers]      = useState([])
  const [defenses,   setDefenses]   = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [monitoring, setMonitoring] = useState(null)
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      authService.allUsers().catch(() => []),
      defenseService.list().catch(() => []),
      monitoringService.summary().catch(() => null),
      classroomService.allClassrooms().catch(() => []),
    ]).then(([gs, us, de, mon, cl]) => {
      setGroups(gs)
      setUsers(Array.isArray(us) ? us : [])
      setDefenses(de)
      setMonitoring(mon)
      setClassrooms(Array.isArray(cl) ? cl : [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoader />

  const activeUsers    = users.filter(u => u.isActive)
  const inactiveUsers  = users.filter(u => !u.isActive)
  const twoFaUsers     = users.filter(u => u.twoFactorEnabled)
  const activeGroups   = groups.filter(g => g.status === 'Active')
  const archivedGroups = groups.filter(g => g.status === 'Archived')
  const activeClassrooms = classrooms.filter(c => c.isActive)

  const scheduledDefs  = defenses.filter(d => d.status === 'Scheduled' || d.status === 'Rescheduled')
  const completedDefs  = defenses.filter(d => d.status === 'Completed')
  const cancelledDefs  = defenses.filter(d => d.status === 'Cancelled')

  const now     = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const soonDefenses = scheduledDefs
    .filter(d => d.scheduledDateTime && new Date(d.scheduledDateTime) >= now && new Date(d.scheduledDateTime) <= in7Days)
    .sort((a, b) => new Date(a.scheduledDateTime) - new Date(b.scheduledDateTime))

  const monGroups    = monitoring?.groups ?? []
  const atRiskGroups = monGroups.filter(g => (g.consultationScore ?? 0) < 50)
  const twoFaPct     = users.length > 0 ? Math.round((twoFaUsers.length / users.length) * 100) : 0

  const recentUsers = [...users]
    .sort((a, b) => (b.id > a.id ? 1 : -1))
    .slice(0, 5)

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
            : `${users.length} users · ${activeGroups.length} active groups · ${activeClassrooms.length} classrooms`
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Users" value={users.length}
          sub={`${activeUsers.length} active · ${inactiveUsers.length} inactive`}
          color={{ bg: 'rgba(59,130,246,0.12)', icon: '#3b82f6' }}
          onClick={() => navigate('/users')} />
        <StatCard icon={GraduationCap} label="Active Groups" value={activeGroups.length}
          sub={archivedGroups.length > 0 ? `${archivedGroups.length} archived` : 'None archived'}
          color={{ bg: 'rgba(34,197,94,0.12)', icon: '#16a34a' }}
          onClick={() => navigate('/groups')} />
        <StatCard icon={School} label="Classrooms" value={activeClassrooms.length}
          sub={`${activeClassrooms.reduce((s, c) => s + (c.enrollmentCount ?? 0), 0)} total enrollments`}
          color={{ bg: 'rgba(201,168,76,0.12)', icon: '#c9a84c' }}
          onClick={() => navigate('/classrooms')} />
        <StatCard icon={Calendar} label="Upcoming Defenses" value={scheduledDefs.length}
          sub={`${completedDefs.length} completed · ${cancelledDefs.length} cancelled`}
          color={{ bg: 'rgba(124,58,237,0.12)', icon: '#7c3aed' }}
          onClick={() => navigate('/defense-scheduler')} />
      </div>

      {/* Overview row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Defense pipeline by phase */}
        <Card>
          <CardHeader title="Defense Pipeline" action={
            <button className="btn-ghost text-xs" onClick={() => navigate('/defense-scheduler')}>Scheduler</button>
          } />
          <div className="px-5 py-4">
            {defenses.length === 0
              ? <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No defenses recorded</p>
              : <PhaseBarChart defenses={defenses} />
            }
          </div>
        </Card>

        {/* User distribution */}
        <Card>
          <CardHeader title="User Distribution" />
          <div className="px-5 py-4">
            {users.length === 0
              ? <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>No user data</p>
              : (
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

        {/* Group + classroom health */}
        <Card>
          <CardHeader title="System Health" />
          <div className="px-5 py-4 space-y-4">
            <MiniBarChart rows={[
              { label: 'Active Groups',      count: activeGroups.length,    color: '#16a34a' },
              { label: 'Archived Groups',    count: archivedGroups.length,  color: '#6b7280' },
              { label: 'Active Classrooms',  count: activeClassrooms.length, color: '#c9a84c' },
            ]} />
            {monGroups.length > 0 && (
              <div className="pt-3 border-t space-y-1.5" style={{ borderColor: 'var(--border-light)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>Consultation Health</p>
                {[
                  { label: 'On track (≥75%)',   count: monGroups.filter(g => (g.consultationScore ?? 0) >= 75).length,                                  color: '#16a34a' },
                  { label: 'Moderate (50–74%)', count: monGroups.filter(g => { const s = g.consultationScore ?? 0; return s >= 50 && s < 75 }).length,  color: '#c9a84c' },
                  { label: 'At risk (<50%)',     count: atRiskGroups.length,                                                                             color: '#ef4444' },
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
          </div>
        </Card>
      </div>

      {/* Alert banners */}
      {atRiskGroups.length > 0 && (
        <AlertBanner
          icon={AlertCircle} color="#f59e0b"
          title={`${atRiskGroups.length} group${atRiskGroups.length !== 1 ? 's' : ''} below consultation threshold`}
          body={atRiskGroups.slice(0, 3).map(g => g.groupName ?? g.projectTitle).join(', ') + (atRiskGroups.length > 3 ? ` and ${atRiskGroups.length - 3} more` : '') + ' — score below 50%'}
          action="View monitoring" onAction={() => navigate('/monitoring')}
        />
      )}
      {soonDefenses.length > 0 && (
        <AlertBanner
          icon={Calendar} color="#7c3aed"
          title={`${soonDefenses.length} defense${soonDefenses.length !== 1 ? 's' : ''} scheduled in the next 7 days`}
          body={`Next: ${soonDefenses[0]?.groupName} (${phaseLabel(soonDefenses[0]?.phase)}) on ${new Date(soonDefenses[0]?.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
          action="View all" onAction={() => navigate('/defense-scheduler')}
        />
      )}
      {inactiveUsers.length > 0 && (
        <AlertBanner
          icon={Shield} color="#6b7280"
          title={`${inactiveUsers.length} deactivated account${inactiveUsers.length !== 1 ? 's' : ''}`}
          body="These accounts cannot log in. Review in user management if re-activation is needed."
          action="Manage users" onAction={() => navigate('/users')}
        />
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader
            title="Group Consultation Monitoring"
            action={<button className="btn-ghost text-xs" onClick={() => navigate('/monitoring')}>Full report</button>}
          />
          <Card>
            {monGroups.length === 0
              ? <EmptyCard icon={TrendingUp} message="No monitoring data yet" hint="Data appears once groups are active and logging consultations" />
              : (
                <div>
                  <div className="grid grid-cols-12 gap-2 px-5 py-2 text-xs font-semibold uppercase tracking-wide border-b"
                    style={{ color: 'var(--text-muted)', borderColor: 'var(--border-light)' }}>
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
                      <div key={g.groupId} className="transition-colors duration-100"
                        style={{ borderBottom: idx < monGroups.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
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
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{g.totalConsultations ?? 0}</span>
                          </div>
                          <div className="col-span-2 text-center">
                            <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{g.consultationsLast30Days ?? 0}</span>
                          </div>
                          <div className="col-span-3 flex justify-end">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: scoreBg, color: scoreColor }}>
                              {score}%
                            </span>
                          </div>
                        </div>
                        <div className="px-5 pb-3">
                          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${score}%`, background: scoreColor }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Recent users */}
          <div>
            <SectionHeader
              title="Recent Users"
              action={<button className="btn-ghost text-xs" onClick={() => navigate('/users')}>Manage all</button>}
            />
            <Card>
              {recentUsers.length === 0
                ? <EmptyCard icon={Users} message="No users yet" />
                : (
                  <div>
                    {recentUsers.map((u, idx) => {
                      const roleColor = { Student: '#38bdf8', Faculty: '#34d399', Admin: '#fb923c', SuperAdmin: '#f87171' }[u.role] ?? '#c9a84c'
                      const initials  = u.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
                      return (
                        <div key={u.id}
                          className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
                          style={{ borderBottom: idx < recentUsers.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                            style={{ background: 'linear-gradient(135deg, #0a1628, #162238)', color: roleColor, border: `1.5px solid ${roleColor}40` }}>
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.fullName ?? u.email}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                          </div>
                          <span className="text-xs font-medium shrink-0 px-2 py-0.5 rounded-lg"
                            style={{ background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}>
                            {u.role}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
            </Card>
          </div>

          {defenses.length > 0 && (
            <div>
              <SectionHeader title="Defense Completion" />
              <Card>
                <div className="px-5 py-4 space-y-4">
                  {[
                    { key: 'TitleDefense',    label: 'Title Defense',    color: '#7c3aed' },
                    { key: 'ProposalDefense', label: 'Proposal Defense', color: '#c9a84c' },
                    { key: 'FinalDefense',    label: 'Final Defense',    color: '#16a34a' },
                  ].map(ph => {
                    const phTotal     = defenses.filter(d => d.phase === ph.key).length
                    const phCompleted = defenses.filter(d => d.phase === ph.key && d.status === 'Completed').length
                    const pct         = phTotal > 0 ? Math.round((phCompleted / phTotal) * 100) : 0
                    return (
                      <div key={ph.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: ph.color }} />
                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{ph.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {phCompleted}/{phTotal}
                            </span>
                            <span className="text-xs font-bold tabular-nums" style={{ color: ph.color, minWidth: 32, textAlign: 'right' }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                          <div className="h-2 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: ph.color, opacity: 0.85 }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-light)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Overall completed</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                      {completedDefs.length} / {defenses.length}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div>
            <SectionHeader title="Quick Actions" />
            <Card>
              <QuickActions items={[
                { icon: Users,           label: 'Manage users',      desc: 'Roles, accounts, access',     to: '/users'             },
                { icon: LayoutDashboard, label: 'Defense Scheduler', desc: 'Manage defense calendar',     to: '/defense-scheduler' },
                { icon: ClipboardList,   label: 'Rubric Manager',    desc: 'Evaluation criteria by phase', to: '/rubric-manager'   },
                { icon: BarChart3,       label: 'Generate report',   desc: 'Export system-wide data',     to: '/reports'           },
              ]} />
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
        subtitle={new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      />
      {user?.role !== 'Student' && <RecentNotifications />}
      <RoleDashboard user={user} />
    </div>
  )
}
