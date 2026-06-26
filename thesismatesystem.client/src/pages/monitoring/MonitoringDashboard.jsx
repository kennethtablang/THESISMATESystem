import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import { monitoringService } from '../../services/api'
import {
  Activity, AlertTriangle, CheckCircle2, TrendingUp,
  ChevronDown, ChevronUp, FileText, Cpu, BookOpen,
  MessageSquare, RefreshCw, Zap, Target, Search, ArrowUpDown,
  Info,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const RISK_META = {
  Excellent:      { label: 'Excellent',      color: '#16a34a', bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.25)',  stripe: '#16a34a' },
  OnTrack:        { label: 'On Track',       color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)', stripe: '#3b82f6' },
  NeedsAttention: { label: 'Needs Attention',color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', stripe: '#f59e0b' },
  AtRisk:         { label: 'At Risk',        color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  stripe: '#ef4444' },
}

// Each dimension gets its own accent color, independent of the group's risk level
const DIM_COLORS = {
  chapterScore:       '#c9a84c',
  systemFeatureScore: '#7c3aed',
  manuscriptScore:    '#0891b2',
  consultationScore:  '#16a34a',
}

const DIMENSION_LABELS = [
  { key: 'chapterScore',       label: 'Chapters',      icon: FileText,      weight: '35%' },
  { key: 'systemFeatureScore', label: 'Sys. Features', icon: Cpu,           weight: '25%' },
  { key: 'manuscriptScore',    label: 'Manuscript',    icon: BookOpen,      weight: '25%' },
  { key: 'consultationScore',  label: 'Consultations', icon: MessageSquare, weight: '15%' },
]

const FILTER_OPTIONS = ['All', 'AtRisk', 'NeedsAttention', 'OnTrack', 'Excellent']

const SORT_OPTIONS = [
  { value: 'score-asc',  label: 'Score ↑ (worst first)' },
  { value: 'score-desc', label: 'Score ↓ (best first)'  },
  { value: 'name-asc',   label: 'Name A–Z'              },
]

// ── Primitives ────────────────────────────────────────────────────────────────

function ScoreBar({ score, color, height = 6 }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: 'var(--bg-subtle)', flex: 1 }}>
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
    </div>
  )
}

function RiskBadge({ level }) {
  const m = RISK_META[level] ?? RISK_META.AtRisk
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  )
}

// SVG arc progress ring used in the student score hero
function ScoreRing({ score, color, size = 108 }) {
  const sw = 7
  const r  = (size - sw) / 2
  const c  = 2 * Math.PI * r
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size} height={size}
        style={{ position: 'absolute', top: 0, left: 0, transform: 'rotate(-90deg)' }}
      >
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--bg-subtle)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${(score / 100) * c} ${c}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="flex flex-col items-center justify-center">
        <span className="font-display font-bold leading-none" style={{ color, fontSize: '2.2rem', letterSpacing: '-2px' }}>
          {score}
        </span>
        <span className="text-[10px] font-semibold mt-0.5" style={{ color, opacity: 0.65 }}>/ 100</span>
      </div>
    </div>
  )
}

function Loader() {
  return (
    <div className="p-6 sm:p-8 space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 rounded-2xl animate-pulse"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-20 rounded-2xl animate-pulse"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }} />
      ))}
    </div>
  )
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryBar({ summary }) {
  const cards = [
    { label: 'At Risk',         value: summary.atRiskCount,         color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: AlertTriangle },
    { label: 'Needs Attention', value: summary.needsAttentionCount, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Info          },
    { label: 'On Track',        value: summary.onTrackCount,        color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: TrendingUp    },
    { label: 'Excellent',       value: summary.excellentCount,      color: '#16a34a', bg: 'rgba(34,197,94,0.1)',  icon: CheckCircle2  },
  ]
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-2xl p-4 flex items-center gap-3"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderLeft: `3px solid ${c.color}`,
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: c.bg }}>
            <c.icon size={16} style={{ color: c.color }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-2xl font-bold font-display" style={{ color: c.color, letterSpacing: '-1.5px', lineHeight: 1 }}>
              {c.value}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Algorithm info (collapsible) ──────────────────────────────────────────────

function AlgorithmInfo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl transition-all"
        style={{
          background: open ? 'rgba(201,168,76,0.1)' : 'var(--bg-subtle)',
          color: open ? '#c9a84c' : 'var(--text-muted)',
          border: `1px solid ${open ? 'rgba(201,168,76,0.25)' : 'var(--border-main)'}`,
        }}
      >
        <Target size={12} />
        How is the score calculated?
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl px-4 py-4 text-xs leading-relaxed space-y-3"
          style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)', color: 'var(--text-secondary)' }}
        >
          <p>
            Each group's <strong style={{ color: 'var(--text-primary)' }}>Health Score (0–100)</strong> is a weighted composite of four dimensions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DIM_COLORS.chapterScore }} />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Chapters</span>
                <span className="ml-auto font-bold" style={{ color: DIM_COLORS.chapterScore }}>35%</span>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Approved ×20 pts · Under Revision ×10 · Pending ×6</p>
              <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>5 approved chapters = 100 pts (capped at 100)</p>
            </div>

            <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DIM_COLORS.systemFeatureScore }} />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>System Features</span>
                <span className="ml-auto font-bold" style={{ color: DIM_COLORS.systemFeatureScore }}>25%</span>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Average completion across all tracked features:</p>
              <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Completed=100 · In Progress=50 · Needs Revision=25 · Not Started=0
              </p>
            </div>

            <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DIM_COLORS.manuscriptScore }} />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Manuscript</span>
                <span className="ml-auto font-bold" style={{ color: DIM_COLORS.manuscriptScore }}>25%</span>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Sections with content ({'>'} 100 words) ÷ 6 × 100</p>
              <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>All 6 sections filled = 100 pts</p>
            </div>

            <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DIM_COLORS.consultationScore }} />
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>Consultations</span>
                <span className="ml-auto font-bold" style={{ color: DIM_COLORS.consultationScore }}>15%</span>
              </div>
              <p style={{ color: 'var(--text-muted)' }}>Based on sessions in the last 30 / 60 days:</p>
              <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
                ≥2 in 30 days=100 · 1 in 30 days=75 · 1 in 60 days=50 · any=25 · none=0
              </p>
            </div>
          </div>

          <p>
            Risk levels: <span style={{ color: '#ef4444' }}>At Risk</span> &lt;40 ·{' '}
            <span style={{ color: '#f59e0b' }}>Needs Attention</span> 40–59 ·{' '}
            <span style={{ color: '#3b82f6' }}>On Track</span> 60–79 ·{' '}
            <span style={{ color: '#16a34a' }}>Excellent</span> 80+
          </p>
        </div>
      )}
    </div>
  )
}

// ── Group row ─────────────────────────────────────────────────────────────────

function GroupRow({ group, expanded, onToggle }) {
  const risk = RISK_META[group.riskLevel] ?? RISK_META.AtRisk

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderLeft: `3px solid ${risk.stripe}`,
      }}
    >
      <button type="button" className="w-full text-left" onClick={onToggle}>
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Score badge */}
          <div
            className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
            style={{ background: risk.bg, border: `1.5px solid ${risk.border}` }}
          >
            <span className="text-xl font-bold font-display" style={{ color: risk.color, lineHeight: 1, letterSpacing: '-1px' }}>
              {group.healthScore}
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: risk.color, opacity: 0.7 }}>
              /100
            </span>
          </div>

          {/* Group info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                {group.groupName}
              </p>
              <RiskBadge level={group.riskLevel} />
              {group.alerts.length > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{ background: 'rgba(239,68,68,0.09)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.18)' }}
                >
                  <AlertTriangle size={10} />
                  {group.alerts.length} alert{group.alerts.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {group.adviserName} · {group.memberCount} members · {group.academicYear}
            </p>
            {group.projectTitle && (
              <p className="text-xs mt-0.5 truncate max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                {group.projectTitle}
              </p>
            )}
          </div>

          {/* Dimension mini-bars — each uses its own dimension color */}
          <div className="hidden lg:flex flex-col gap-1.5 w-52 shrink-0">
            {DIMENSION_LABELS.map(d => (
              <div key={d.key} className="flex items-center gap-2">
                <span className="text-[10px] w-20 shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
                <ScoreBar score={group[d.key]} color={DIM_COLORS[d.key]} height={4} />
                <span className="text-[10px] w-7 text-right shrink-0 tabular-nums font-medium" style={{ color: DIM_COLORS[d.key] }}>
                  {group[d.key]}
                </span>
              </div>
            ))}
          </div>

          <div className="shrink-0 ml-1" style={{ color: 'var(--text-muted)' }}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-light)' }}>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {DIMENSION_LABELS.map(d => {
              const score    = group[d.key]
              const dimColor = DIM_COLORS[d.key]
              const dm       = RISK_META[score >= 80 ? 'Excellent' : score >= 60 ? 'OnTrack' : score >= 40 ? 'NeedsAttention' : 'AtRisk']
              return (
                <div
                  key={d.key}
                  className="rounded-xl p-3"
                  style={{ background: 'var(--bg-subtle)', borderTop: `2px solid ${dimColor}`, border: `1px solid var(--border-light)` }}
                >
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${dimColor}18` }}>
                      <d.icon size={13} style={{ color: dimColor }} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.label}</p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>weight {d.weight}</p>
                    </div>
                    <span className="text-lg font-bold font-display shrink-0" style={{ color: dm.color, letterSpacing: '-1px' }}>
                      {score}
                    </span>
                  </div>
                  <ScoreBar score={score} color={dimColor} height={5} />
                  <DimensionDetail group={group} dimKey={d.key} />
                </div>
              )
            })}
          </div>

          {group.alerts.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Action Items</p>
              <div className="space-y-1.5">
                {group.alerts.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', color: 'var(--text-primary)' }}
                  >
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DimensionDetail({ group, dimKey }) {
  const lines = []
  if (dimKey === 'chapterScore') {
    lines.push(`${group.approvedChapters} approved · ${group.underRevisionChapters} in revision · ${group.pendingChapters} pending`)
    lines.push(`${group.totalChaptersSubmitted} of 5 chapters submitted`)
  } else if (dimKey === 'systemFeatureScore') {
    if (group.totalFeatures === 0) {
      lines.push('No features tracked yet')
    } else {
      lines.push(`${group.completedFeatures} completed · ${group.inProgressFeatures} in progress`)
      lines.push(`${group.totalFeatures} total features`)
    }
  } else if (dimKey === 'manuscriptScore') {
    lines.push(`${group.manuscriptSectionsWithContent} of 6 sections with content`)
    if (group.manuscriptLocked) lines.push(`Locked · Revision ${group.manuscriptRevision}`)
    if (group.lastManuscriptUpdate)
      lines.push(`Last edit ${new Date(group.lastManuscriptUpdate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`)
  } else if (dimKey === 'consultationScore') {
    lines.push(`${group.consultationsLast30Days} session${group.consultationsLast30Days !== 1 ? 's' : ''} in last 30 days`)
    lines.push(`${group.totalConsultations} total sessions`)
    if (group.lastConsultationDate)
      lines.push(`Last: ${new Date(group.lastConsultationDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`)
  }
  return (
    <div className="mt-2 space-y-0.5">
      {lines.map((l, i) => (
        <p key={i} className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>{l}</p>
      ))}
    </div>
  )
}

// ── Student view ──────────────────────────────────────────────────────────────

function StudentMonitorView() {
  const [health,  setHealth]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    monitoringService.myGroup()
      .then(setHealth)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loader />
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
    </div>
  )
  if (!health) return (
    <div className="p-8 text-center">
      <Activity size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} strokeWidth={1.3} />
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        You are not assigned to an active capstone group.
      </p>
    </div>
  )

  const risk = RISK_META[health.riskLevel] ?? RISK_META.AtRisk

  return (
    <div className="p-4 sm:p-6 lg:p-8 animate-slide-up space-y-5">
      {/* Score hero */}
      <div
        className="rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderLeft: `3px solid ${risk.stripe}` }}
      >
        <ScoreRing score={health.healthScore} color={risk.color} size={108} />

        <div className="flex-1 min-w-0 text-center sm:text-left">
          <RiskBadge level={health.riskLevel} />
          <h2 className="font-display font-bold mt-2 mb-1"
            style={{ fontSize: '1.3rem', color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
            {health.groupName}
          </h2>
          {health.projectTitle && (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{health.projectTitle}</p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Adviser: {health.adviserName} · {health.memberCount} members · {health.academicYear}
          </p>
        </div>

        {/* Quick dimension bars */}
        <div className="hidden md:flex flex-col gap-2 w-52 shrink-0">
          {DIMENSION_LABELS.map(d => (
            <div key={d.key} className="flex items-center gap-2">
              <span className="text-[10px] w-20 shrink-0" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
              <ScoreBar score={health[d.key]} color={DIM_COLORS[d.key]} height={5} />
              <span className="text-[10px] w-6 text-right font-medium tabular-nums" style={{ color: DIM_COLORS[d.key] }}>
                {health[d.key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dimension cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {DIMENSION_LABELS.map(d => {
          const score    = health[d.key]
          const dimColor = DIM_COLORS[d.key]
          const dm       = RISK_META[score >= 80 ? 'Excellent' : score >= 60 ? 'OnTrack' : score >= 40 ? 'NeedsAttention' : 'AtRisk']
          return (
            <div
              key={d.key}
              className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderTop: `2px solid ${dimColor}` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${dimColor}15` }}>
                  <d.icon size={15} style={{ color: dimColor }} strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{d.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>weight {d.weight}</p>
                </div>
                <span className="ml-auto font-bold font-display"
                  style={{ color: dm.color, fontSize: '1.4rem', letterSpacing: '-1px', lineHeight: 1 }}>
                  {score}
                </span>
              </div>
              <ScoreBar score={score} color={dimColor} height={6} />
              <DimensionDetail group={health} dimKey={d.key} />
            </div>
          )
        })}
      </div>

      {/* Action items */}
      {health.alerts.length > 0 ? (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} style={{ color: '#f59e0b' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Action Items</p>
            <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
              {health.alerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {health.alerts.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-sm"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', color: 'var(--text-primary)' }}
              >
                <AlertTriangle size={13} className="shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
                {a}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-5 flex items-center gap-3"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
          <p className="text-sm font-medium" style={{ color: '#16a34a' }}>
            No action items — your group is progressing well!
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MonitoringDashboard() {
  const { user } = useAuth()
  const isStudent = user?.role === 'Student'

  const [summary,    setSummary]    = useState(null)
  const [loading,    setLoading]    = useState(!isStudent)
  const [error,      setError]      = useState(null)
  const [filter,     setFilter]     = useState('All')
  const [search,     setSearch]     = useState('')
  const [sort,       setSort]       = useState('score-asc')
  const [expandedId, setExpandedId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (isStudent) return
    try {
      const data = await monitoringService.summary()
      setSummary(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isStudent])

  useEffect(() => { load() }, [load])

  const groups = summary?.groups ?? []

  const displayedGroups = useMemo(() => {
    let result = filter === 'All' ? groups : groups.filter(g => g.riskLevel === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(g =>
        (g.groupName ?? '').toLowerCase().includes(q) ||
        (g.projectTitle ?? '').toLowerCase().includes(q) ||
        (g.adviserName ?? '').toLowerCase().includes(q)
      )
    }
    if (sort === 'score-asc')  return [...result].sort((a, b) => a.healthScore - b.healthScore)
    if (sort === 'score-desc') return [...result].sort((a, b) => b.healthScore - a.healthScore)
    if (sort === 'name-asc')   return [...result].sort((a, b) => (a.groupName ?? '').localeCompare(b.groupName ?? ''))
    return result
  }, [groups, filter, search, sort])

  if (isStudent) {
    return (
      <div>
        <TopBar title="Group Monitoring" subtitle="Your capstone group health score and progress breakdown" />
        <StudentMonitorView />
      </div>
    )
  }

  if (loading) return (
    <div>
      <TopBar title="Monitoring" subtitle="Evaluating group health…" />
      <Loader />
    </div>
  )

  if (error) return (
    <div>
      <TopBar title="Monitoring" />
      <div className="p-8 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
      </div>
    </div>
  )

  return (
    <div>
      <TopBar
        title="Monitoring"
        subtitle={`${summary?.totalGroups ?? 0} groups · avg. health score ${summary?.averageHealthScore ?? 0}`}
      />

      <div className="p-4 sm:p-6 lg:p-8 animate-slide-up">
        {summary && <SummaryBar summary={summary} />}

        <AlgorithmInfo />

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Filter pills */}
          {FILTER_OPTIONS.map(f => {
            const active = filter === f
            const meta   = f !== 'All' ? RISK_META[f] : null
            const count  = f === 'All' ? groups.length : groups.filter(g => g.riskLevel === f).length
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150"
                style={{
                  background: active ? (meta?.bg ?? 'rgba(201,168,76,0.12)') : 'var(--bg-subtle)',
                  color: active ? (meta?.color ?? '#c9a84c') : 'var(--text-secondary)',
                  border: `1px solid ${active ? (meta?.border ?? 'rgba(201,168,76,0.3)') : 'var(--border-main)'}`,
                }}
              >
                {f === 'All' ? `All (${count})` : `${meta.label} (${count})`}
              </button>
            )
          })}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              className="form-input pl-7 text-xs py-1.5"
              style={{ width: 180 }}
              placeholder="Search groups…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <ArrowUpDown size={12} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9ca3af' }} />
            <select
              className="form-input pl-7 text-xs py-1.5 pr-7"
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{ width: 172, cursor: 'pointer' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => { setRefreshing(true); load() }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Group list */}
        {displayedGroups.length === 0 ? (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
          >
            <Activity size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {search
                ? `No groups matching "${search}"`
                : filter === 'All'
                  ? 'No groups found.'
                  : `No groups in the "${RISK_META[filter]?.label}" category.`}
            </p>
            {(search || filter !== 'All') && (
              <button
                className="mt-3 text-xs underline"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => { setSearch(''); setFilter('All') }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedGroups.map(g => (
              <GroupRow
                key={g.groupId}
                group={g}
                expanded={expandedId === g.groupId}
                onToggle={() => setExpandedId(expandedId === g.groupId ? null : g.groupId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
