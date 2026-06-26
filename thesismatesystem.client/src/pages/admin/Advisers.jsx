import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { groupService, authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import { PageLoader } from '../../components/ui/Spinner'
import {
  GraduationCap, Users, Search, ChevronRight, CheckCircle2,
  Clock, AlertCircle, ArrowRight, BookOpen, TrendingUp, Inbox, CalendarDays,
} from 'lucide-react'

function deadlineChip(dueDate, label) {
  if (!dueDate) return null
  const diffDays = Math.ceil((new Date(dueDate) - new Date()) / 86400000)
  const [color, bg] = diffDays < 0 ? ['#dc2626', 'rgba(220,38,38,0.1)']
    : diffDays <= 7 ? ['#f59e0b', 'rgba(245,158,11,0.1)']
    : ['#16a34a', 'rgba(34,197,94,0.1)']
  const suffix = diffDays < 0 ? 'overdue' : diffDays === 0 ? 'today' : `${diffDays}d`
  return (
    <span key={label} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium"
      style={{ background: bg, color }}>
      <CalendarDays size={10} /> {label} {suffix}
    </span>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#c9a84c' : pct > 0 ? '#f59e0b' : '#e2cc91'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Progress</span>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Active:    { color: '#16a34a', bg: 'rgba(34,197,94,0.10)'   },
    Archived:  { color: '#6b7280', bg: 'rgba(107,114,128,0.10)' },
    Completed: { color: '#3b82f6', bg: 'rgba(59,130,246,0.10)'  },
  }
  const s = map[status] ?? map.Active
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}>
      {status}
    </span>
  )
}

// ── Member avatars ────────────────────────────────────────────────────────────
function MemberAvatars({ members }) {
  const shown = members.slice(0, 4)
  const extra = members.length - 4
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {shown.map(m => {
          const initials = m.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
          return (
            <div key={m.id} title={m.fullName}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6', outline: '2px solid var(--bg-card)' }}>
              {initials}
            </div>
          )
        })}
      </div>
      {extra > 0 && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{extra} more</span>
      )}
      {members.length === 0 && (
        <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No members assigned</span>
      )}
    </div>
  )
}

// ── Group card (inside detail panel) ─────────────────────────────────────────
function GroupCard({ group, navigate }) {
  const progress    = group.milestoneProgress?.completionPercentage ?? 0
  const chapters    = group.milestoneProgress?.approvedChapters ?? 0
  const defDone     = group.milestoneProgress?.defenseCompleted ?? false
  const defSched    = group.milestoneProgress?.defenseScheduled ?? false

  return (
    <div
      className="rounded-2xl p-5 transition-all duration-150 cursor-pointer"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.3)'; e.currentTarget.style.background = 'var(--bg-card)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-subtle)' }}
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-heading)' }}>
              {group.groupName}
            </p>
            <StatusBadge status={group.status} />
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            {group.projectTitle || <span className="italic">No research title set</span>}
          </p>
        </div>
        <ChevronRight size={15} className="shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
      </div>

      {/* Members */}
      <div className="mb-3">
        <p className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Members ({group.members?.length ?? 0})
        </p>
        <MemberAvatars members={group.members ?? []} />
        {group.members?.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {group.members.slice(0, 3).map(m => (
              <p key={m.id} className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                • {m.fullName}
              </p>
            ))}
            {group.members.length > 3 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                +{group.members.length - 3} more member{group.members.length - 3 !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Progress */}
      <ProgressBar pct={progress} />

      {/* Milestone chips */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium"
          style={{ background: chapters > 0 ? 'rgba(34,197,94,0.1)' : 'var(--bg-subtle)', color: chapters > 0 ? '#16a34a' : 'var(--text-muted)', border: '1px solid transparent' }}>
          <BookOpen size={10} /> {chapters}/5 chapters
        </span>
        {defDone && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
            <CheckCircle2 size={10} /> Defense done
          </span>
        )}
        {defSched && !defDone && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
            <Clock size={10} /> Defense scheduled
          </span>
        )}
        {!defSched && !defDone && (
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg font-medium"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <AlertCircle size={10} /> No defense yet
          </span>
        )}
      </div>

      {/* Deadline chips */}
      {(group.manuscriptDueDate || group.systemFeaturesDueDate) && (
        <div className="flex flex-wrap gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid var(--border-light)' }}>
          {deadlineChip(group.manuscriptDueDate,     'MS')}
          {deadlineChip(group.systemFeaturesDueDate, 'SF')}
        </div>
      )}
    </div>
  )
}

// ── Adviser sidebar card ──────────────────────────────────────────────────────
function AdviserCard({ entry, selected, onClick }) {
  const { adviser, groups } = entry
  const totalMembers = groups.reduce((s, g) => s + (g.members?.length ?? 0), 0)
  const activeGroups = groups.filter(g => g.status === 'Active').length
  const atRisk = groups.filter(g => (g.milestoneProgress?.completionPercentage ?? 0) === 0 && g.status === 'Active').length
  const initials = adviser.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl transition-all duration-150"
      style={{
        background: selected ? 'rgba(201,168,76,0.08)' : 'transparent',
        border: `1px solid ${selected ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
      }}
      onMouseEnter={e => { if (!selected) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border-light)' } }}
      onMouseLeave={e => { if (!selected) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' } }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
          style={{
            background: selected ? 'linear-gradient(135deg, #c9a84c, #a0732a)' : 'rgba(201,168,76,0.12)',
            color: selected ? '#fff' : '#c9a84c',
          }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: selected ? 'var(--text-heading)' : 'var(--text-primary)' }}>
            {adviser.fullName}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{adviser.email}</p>
        </div>

        {selected && <ChevronRight size={14} style={{ color: '#c9a84c', flexShrink: 0 }} />}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
          <Users size={10} /> {groups.length} group{groups.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
          <GraduationCap size={10} /> {totalMembers} student{totalMembers !== 1 ? 's' : ''}
        </span>
        {atRisk > 0 && (
          <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626' }}>
            <AlertCircle size={10} /> {atRisk} at risk
          </span>
        )}
        {groups.length === 0 && (
          <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>No groups</span>
        )}
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Advisers() {
  const navigate = useNavigate()

  const [groups,   setGroups]   = useState([])
  const [faculty,  setFaculty]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [selected, setSelected] = useState(null)   // adviser id

  useEffect(() => {
    Promise.all([groupService.list(), authService.allUsers()])
      .then(([grps, users]) => {
        setGroups(grps)
        setFaculty(users.filter(u => u.role === 'Faculty'))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Build adviser → groups map, merged with full faculty list
  const adviserEntries = useMemo(() => {
    const map = {}
    groups.forEach(g => {
      if (!g.adviser) return
      if (!map[g.adviser.id]) {
        map[g.adviser.id] = { adviser: g.adviser, groups: [] }
      }
      map[g.adviser.id].groups.push(g)
    })
    // Include faculty members who have no groups yet
    faculty.forEach(f => {
      if (!map[f.id]) {
        map[f.id] = { adviser: { id: f.id, fullName: f.fullName, email: f.email }, groups: [] }
      }
    })
    return Object.values(map).sort((a, b) => a.adviser.fullName.localeCompare(b.adviser.fullName))
  }, [groups, faculty])

  const filtered = useMemo(() => {
    if (!search.trim()) return adviserEntries
    const q = search.toLowerCase()
    return adviserEntries.filter(e =>
      e.adviser.fullName?.toLowerCase().includes(q) ||
      e.adviser.email?.toLowerCase().includes(q)
    )
  }, [adviserEntries, search])

  const selectedEntry = selected ? adviserEntries.find(e => e.adviser.id === selected) : null
  const selectedGroups = selectedEntry?.groups ?? []

  // Summary stats for the selected adviser header
  const totalMembers   = selectedGroups.reduce((s, g) => s + (g.members?.length ?? 0), 0)
  const activeCount    = selectedGroups.filter(g => g.status === 'Active').length
  const avgProgress    = selectedGroups.length
    ? Math.round(selectedGroups.reduce((s, g) => s + (g.milestoneProgress?.completionPercentage ?? 0), 0) / selectedGroups.length)
    : 0
  const atRiskGroups   = selectedGroups.filter(g => (g.milestoneProgress?.completionPercentage ?? 0) === 0 && g.status === 'Active')

  if (loading) return <><TopBar title="Advisers" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title="Advisers"
        subtitle={`${adviserEntries.length} faculty · ${adviserEntries.reduce((s, e) => s + e.groups.length, 0)} groups total`}
      />

      <div className="flex h-[calc(100vh-68px)] overflow-hidden">

        {/* ── Left panel: adviser list ──────────────────────────────────── */}
        <aside
          className="flex-shrink-0 flex flex-col"
          style={{
            width: 300,
            minWidth: 260,
            borderRight: '1px solid var(--border-light)',
            background: 'var(--bg-page)',
          }}
        >
          {/* Search */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input pl-9 text-sm"
                placeholder="Search advisers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No advisers found</p>
              </div>
            ) : (
              filtered.map(entry => (
                <AdviserCard
                  key={entry.adviser.id}
                  entry={entry}
                  selected={selected === entry.adviser.id}
                  onClick={() => setSelected(entry.adviser.id === selected ? null : entry.adviser.id)}
                />
              ))
            )}
          </div>

          {/* Footer summary */}
          <div className="p-4 border-t text-xs" style={{ borderColor: 'var(--border-light)', color: 'var(--text-muted)' }}>
            {adviserEntries.length} adviser{adviserEntries.length !== 1 ? 's' : ''} ·{' '}
            {adviserEntries.reduce((s, e) => s + e.groups.reduce((gs, g) => gs + (g.members?.length ?? 0), 0), 0)} students enrolled
          </div>
        </aside>

        {/* ── Right panel: adviser detail ───────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {!selectedEntry ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)' }}
              >
                <GraduationCap size={36} style={{ color: '#c9a84c', opacity: 0.5 }} />
              </div>
              <div className="text-center max-w-xs">
                <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-heading)' }}>Select an Adviser</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Click any faculty member on the left to view their assigned groups, member rosters, and project progress.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-6 max-w-4xl mx-auto">

              {/* Adviser header */}
              <div
                className="rounded-2xl p-5 mb-6"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
              >
                <div className="flex items-center gap-4 mb-4">
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, #c9a84c, #a0732a)', color: '#fff' }}
                  >
                    {selectedEntry.adviser.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                      {selectedEntry.adviser.fullName}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{selectedEntry.adviser.email}</p>
                    <span className="inline-flex items-center gap-1 mt-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)' }}>
                      <GraduationCap size={10} /> Faculty Adviser
                    </span>
                  </div>
                  <button
                    className="btn-secondary text-xs flex items-center gap-1.5"
                    onClick={() => navigate('/users')}
                  >
                    Manage User <ArrowRight size={12} />
                  </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Groups',    value: selectedGroups.length, color: '#3b82f6', icon: Users },
                    { label: 'Active Groups',   value: activeCount,           color: '#16a34a', icon: CheckCircle2 },
                    { label: 'Total Students',  value: totalMembers,          color: '#c9a84c', icon: GraduationCap },
                    { label: 'Avg. Progress',   value: `${avgProgress}%`,    color: avgProgress >= 50 ? '#16a34a' : '#f59e0b', icon: TrendingUp },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-3 text-center"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                      <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* At-risk alert */}
                {atRiskGroups.length > 0 && (
                  <div className="mt-4 px-4 py-3 rounded-xl flex items-start gap-2"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle size={15} className="shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
                        {atRiskGroups.length} group{atRiskGroups.length !== 1 ? 's' : ''} at risk
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {atRiskGroups.map(g => g.groupName).join(', ')} — no recorded progress. Consider a check-in with this adviser.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Group list */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Assigned Groups
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                    ({selectedGroups.length})
                  </span>
                </h3>
                {selectedGroups.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Click any group card to open its full detail page
                  </span>
                )}
              </div>

              {selectedGroups.length === 0 ? (
                <div
                  className="rounded-2xl p-12 text-center"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
                >
                  <Inbox size={36} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                    No groups assigned
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    This faculty member has not been assigned as an adviser to any group yet.
                  </p>
                  <button className="btn-primary mt-4 text-sm" onClick={() => navigate('/groups')}>
                    Manage Groups
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedGroups.map(g => (
                    <GroupCard key={g.id} group={g} navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
