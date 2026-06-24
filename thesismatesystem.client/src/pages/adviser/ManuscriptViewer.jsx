import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { manuscriptService, groupService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import { PageLoader } from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import {
  BookOpen, Users, Hash, Clock, Search, CheckCircle2, Lock, Unlock,
  Send, MessageSquare, RotateCcw, Circle, History, ChevronDown, ChevronUp,
  CheckCircle,
} from 'lucide-react'
import DOMPurify from 'dompurify'

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  { key: 'chapter1',   label: 'Chapter 1',   subtitle: 'Introduction' },
  { key: 'chapter2',   label: 'Chapter 2',   subtitle: 'Review of Related Literature' },
  { key: 'chapter3',   label: 'Chapter 3',   subtitle: 'Research Methodology' },
  { key: 'chapter4',   label: 'Chapter 4',   subtitle: 'Results and Discussion' },
  { key: 'chapter5',   label: 'Chapter 5',   subtitle: 'Summary, Conclusion and Recommendations' },
  { key: 'references', label: 'References',  subtitle: 'Bibliography and Citations' },
]

// Role → color palette for comment avatars and badges
const ROLE_PALETTE = {
  Adviser:    { color: '#16a34a', bg: 'rgba(34,197,94,0.15)',  label: 'Adviser'    },
  Panel:      { color: '#7c3aed', bg: 'rgba(139,92,246,0.15)', label: 'Panelist'   },
  FacultyIC:  { color: '#0891b2', bg: 'rgba(6,182,212,0.15)',  label: 'Faculty IC' },
  Admin:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Admin'      },
  SuperAdmin: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  label: 'SuperAdmin' },
}
function rolePalette(role) {
  return ROLE_PALETTE[role] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.15)', label: role ?? 'Unknown' }
}

// ── Section review status dot ─────────────────────────────────────────────────

function SectionStatusDot({ hasContent, isReviewed, commentCount }) {
  if (!hasContent)    return <Circle size={9} style={{ color: 'var(--border-main)', flexShrink: 0 }} />
  if (isReviewed)     return <CheckCircle2 size={10} style={{ color: '#16a34a', flexShrink: 0 }} />
  return (
    <span
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ background: '#f59e0b', display: 'inline-block' }}
      title={commentCount === 0 ? 'No comments yet' : `${commentCount} comment(s) — not all sections reviewed`}
    />
  )
}

// ── Comment bubble ────────────────────────────────────────────────────────────

function CommentBubble({ c }) {
  const pal = rolePalette(c.authorRole)
  const initial = c.author?.fullName?.[0]?.toUpperCase() ?? '?'
  return (
    <li className="flex gap-3">
      {/* Avatar with role-colored ring */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: pal.bg,
          color: pal.color,
          border: `2px solid ${pal.color}`,
          boxShadow: `0 0 0 2px ${pal.bg}`,
        }}
      >
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {c.author?.fullName}
          </span>
          {/* Role badge */}
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: pal.bg, color: pal.color, border: `1px solid ${pal.color}30` }}
          >
            {pal.label}
          </span>
          {/* Revision badge */}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-md"
            style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}
          >
            Rev {c.revision}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(c.createdAt).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
          </span>
        </div>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {c.content}
        </p>
      </div>
    </li>
  )
}

// ── Revision history panel ────────────────────────────────────────────────────

function RevisionHistory({ history }) {
  const [open, setOpen] = useState(false)
  if (history.length === 0) return null

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)' }}
    >
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-3"
        onClick={() => setOpen(v => !v)}
      >
        <History size={13} style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-semibold flex-1 text-left" style={{ color: 'var(--text-heading)' }}>
          Revision History
        </span>
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
        >
          {history.length} past
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-muted)' }} />
               : <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />}
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border-main)' }}>
          {history.map((h, i) => {
            const complete = h.isComplete
            return (
              <div
                key={h.revision}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  borderBottom: i < history.length - 1 ? '1px solid var(--border-light)' : 'none',
                }}
              >
                {/* Rev indicator */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: complete ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                    color: complete ? '#16a34a' : '#f59e0b',
                  }}
                >
                  R{h.revision}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Revision {h.revision}
                    </span>
                    {complete ? (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}
                      >
                        Complete
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}
                      >
                        Partial ({h.reviewedSections}/6)
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {h.totalComments} comment{h.totalComments !== 1 ? 's' : ''} · {h.reviewedSections} of 6 sections reviewed
                    {h.snapshotAt && ` · Snapshot ${new Date(h.snapshotAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`}
                  </p>
                </div>

                {/* 6 fill-dots representing sections reviewed (filled left-to-right as a count, not per-section identity) */}
                <div className="hidden sm:flex items-center gap-1 shrink-0" title={`${h.reviewedSections}/6 sections reviewed`}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <span key={i} className="w-2 h-2 rounded-full" style={{
                      background: complete ? '#16a34a' : i < h.reviewedSections ? '#c9a84c' : 'var(--border-main)',
                    }} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ManuscriptViewer() {
  const { user } = useAuth()
  const canReview      = ['Adviser', 'FacultyIC', 'Panel'].includes(user?.role)
  const canOpenRevision = ['Adviser', 'FacultyIC'].includes(user?.role)

  const [groups,            setGroups]            = useState([])
  const [selectedGroup,     setSelectedGroup]     = useState(null)
  const [sections,          setSections]          = useState({})
  const [activeKey,         setActiveKey]         = useState('chapter1')
  const [loadingGroups,     setLoadingGroups]     = useState(true)
  const [loadingSections,   setLoadingSections]   = useState(false)
  const [search,            setSearch]            = useState('')
  const [comments,          setComments]          = useState([])
  const [commentInput,      setCommentInput]      = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [openingRevision,   setOpeningRevision]   = useState(false)
  const [actionError,       setActionError]       = useState('')
  const [revSummary,        setRevSummary]        = useState(null)  // RevisionSummaryDto

  useEffect(() => {
    groupService.list()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoadingGroups(false))
  }, [])

  async function selectGroup(group) {
    if (selectedGroup?.id === group.id) return
    setSelectedGroup(group)
    setActiveKey('chapter1')
    setSections({})
    setComments([])
    setRevSummary(null)
    setLoadingSections(true)
    try {
      const [data, summary] = await Promise.all([
        manuscriptService.byGroup(group.id),
        manuscriptService.revisionSummary(group.id).catch(() => null),
      ])
      const map = {}
      data.forEach(s => { map[s.sectionKey] = s })
      setSections(map)
      setRevSummary(summary)
      await loadComments(group.id, 'chapter1')
    } catch {
      setSections({})
    } finally {
      setLoadingSections(false)
    }
  }

  async function loadComments(groupId, sectionKey) {
    try {
      const data = await manuscriptService.comments(groupId, sectionKey, null)
      setComments(data)
    } catch { setComments([]) }
  }

  async function switchSection(key) {
    setActiveKey(key)
    if (selectedGroup) await loadComments(selectedGroup.id, key)
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!commentInput.trim() || !selectedGroup) return
    setSubmittingComment(true)
    setActionError('')
    try {
      const c = await manuscriptService.addComment(selectedGroup.id, activeKey, { content: commentInput.trim() })
      setComments(prev => [...prev, c])
      setCommentInput('')
      // Refresh revision summary so section indicators update
      const updated = await manuscriptService.revisionSummary(selectedGroup.id).catch(() => null)
      if (updated) setRevSummary(updated)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleOpenRevision() {
    if (!selectedGroup) return
    if (!confirm('Open the next revision? The group will be able to edit the manuscript again.')) return
    setOpeningRevision(true)
    setActionError('')
    try {
      await manuscriptService.openRevision(selectedGroup.id)
      const [updated, summary] = await Promise.all([
        groupService.get(selectedGroup.id),
        manuscriptService.revisionSummary(selectedGroup.id).catch(() => null),
      ])
      setSelectedGroup(updated)
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      if (summary) setRevSummary(summary)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setOpeningRevision(false)
    }
  }

  const filtered = groups.filter(g =>
    (g.groupName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (g.projectTitle ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const activeSection   = SECTIONS.find(s => s.key === activeKey)
  const sectionData     = sections[activeKey]
  const filledCount     = Object.values(sections).filter(s => s?.content).length
  const totalWords      = Object.values(sections).reduce((sum, s) => sum + (s?.wordCount ?? 0), 0)
  const progressPct     = Math.round((filledCount / SECTIONS.length) * 100)
  const isLocked        = selectedGroup?.manuscriptLocked ?? false
  const revision        = selectedGroup?.manuscriptRevision ?? 1

  // Per-section review status from revision summary
  const sectionStatusMap = useMemo(() => {
    if (!revSummary) return {}
    return Object.fromEntries(revSummary.sections.map(s => [s.sectionKey, s]))
  }, [revSummary])

  const reviewedCount = revSummary?.sections.filter(s => s.isReviewed).length ?? 0
  const allReviewed   = revSummary?.isCurrentRevisionReviewed ?? false

  if (loadingGroups) return <><TopBar title="Manuscript Monitor" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title="Manuscript Monitor"
        subtitle="View and track manuscript progress across all groups"
      />

      <div className="p-4 sm:p-6 flex gap-4 items-start">
        {/* ── Group list ───────────────────────────────── */}
        <aside
          className="w-56 shrink-0 rounded-2xl flex flex-col overflow-hidden"
          style={{
            border: '1px solid var(--border-main)',
            background: 'var(--bg-card)',
            maxHeight: 'calc(100vh - 140px)',
            position: 'sticky',
            top: 16,
          }}
        >
          <div className="px-3 pt-3 pb-2.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
            <p className="text-xs font-semibold tracking-wide uppercase px-1 mb-2"
              style={{ color: 'var(--text-muted)', fontSize: 10 }}>
              Groups
            </p>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
              <input type="text" className="form-input pl-7 text-xs py-1.5" placeholder="Search…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filtered.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No groups found</p>
            ) : filtered.map(g => {
              const sel = selectedGroup?.id === g.id
              return (
                <button key={g.id} onClick={() => selectGroup(g)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: sel ? 'rgba(201,168,76,0.10)' : 'transparent',
                    border: sel ? '1px solid rgba(201,168,76,0.22)' : '1px solid transparent',
                  }}>
                  <p className="text-sm font-medium truncate" style={{ color: sel ? '#c9a84c' : 'var(--text-primary)' }}>
                    {g.groupName}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {g.members?.length ?? 0} members · {g.academicYear}
                  </p>
                  {g.manuscriptLocked && (
                    <span className="mt-1 inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}>
                      <Lock size={9} /> Locked
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────── */}
        {!selectedGroup ? (
          <div className="flex-1 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)' }}>
            <EmptyState icon={BookOpen} title="Select a group"
              description="Choose a capstone group from the left to view their manuscript." />
          </div>
        ) : (
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            {actionError && (
              <div className="rounded-xl px-4 py-2.5 text-sm flex items-center justify-between"
                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                <span>{actionError}</span>
                <button className="ml-3 text-xs underline shrink-0" onClick={() => setActionError('')}>Dismiss</button>
              </div>
            )}

            {/* ── Header card ──────────────────────────── */}
            <div className="rounded-2xl p-4" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-main)',
              borderLeft: allReviewed
                ? '3px solid #16a34a'
                : isLocked
                  ? '3px solid #c9a84c'
                  : '3px solid rgba(22,163,74,0.5)',
            }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display font-semibold" style={{ color: 'var(--text-heading)' }}>
                      {selectedGroup.groupName}
                    </h2>

                    {/* Lock status */}
                    {isLocked ? (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}>
                        <Lock size={9} /> Locked · Rev {revision}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(22,163,74,0.08)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.15)' }}>
                        <Unlock size={9} /> Editing · Rev {revision}
                      </span>
                    )}

                    {/* Revision review status */}
                    {revSummary && isLocked && (
                      allReviewed ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
                          <CheckCircle size={9} /> Revision Reviewed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                          {reviewedCount}/6 sections reviewed
                        </span>
                      )
                    )}
                  </div>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                    {selectedGroup.projectTitle ?? 'No title set'} · {selectedGroup.academicYear}
                  </p>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-bold leading-none" style={{ color: '#c9a84c' }}>
                      {filledCount}<span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>/{SECTIONS.length}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Sections</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold leading-none" style={{ color: 'var(--text-heading)' }}>
                      {totalWords.toLocaleString()}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Words</p>
                  </div>
                  {canOpenRevision && isLocked && (
                    <button
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      onClick={handleOpenRevision}
                      disabled={openingRevision}>
                      <RotateCcw size={12} />
                      {openingRevision ? 'Opening…' : 'Open Revision'}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Manuscript completion</span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{progressPct}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      background: progressPct === 100 ? '#16a34a' : progressPct >= 50 ? '#c9a84c' : '#e2cc91',
                    }} />
                </div>
              </div>
            </div>

            {/* ── Section tabs + content + comments ──── */}
            <div className="flex gap-3 items-start">
              {/* Section list */}
              <div className="w-44 shrink-0 rounded-2xl overflow-hidden"
                style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)' }}>
                <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    Sections
                  </p>
                  {revSummary && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      <span style={{ color: reviewedCount === 6 ? '#16a34a' : '#f59e0b' }}>
                        {reviewedCount}/6
                      </span> reviewed
                    </p>
                  )}
                </div>
                <div className="p-2 space-y-0.5">
                  {SECTIONS.map(s => {
                    const filled  = !!sections[s.key]?.content
                    const active  = activeKey === s.key
                    const status  = sectionStatusMap[s.key]
                    const reviewed = status?.isReviewed ?? false
                    const commentCount = status?.commentCount ?? 0

                    // Border: active=gold, reviewed=green, has-content=default, empty=transparent
                    const borderColor = active
                      ? 'rgba(201,168,76,0.22)'
                      : reviewed && filled
                        ? 'rgba(34,197,94,0.2)'
                        : 'transparent'
                    const bgColor = active
                      ? 'rgba(201,168,76,0.10)'
                      : reviewed && filled
                        ? 'rgba(34,197,94,0.06)'
                        : 'transparent'

                    return (
                      <button key={s.key} onClick={() => switchSection(s.key)}
                        className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                        style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate"
                            style={{ color: active ? '#c9a84c' : 'var(--text-primary)', maxWidth: 90 }}>
                            {s.label}
                          </span>
                          <SectionStatusDot
                            hasContent={filled}
                            isReviewed={reviewed}
                            commentCount={commentCount}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                            {sections[s.key]?.wordCount
                              ? `${sections[s.key].wordCount.toLocaleString()} words`
                              : 'No content'}
                          </p>
                          {commentCount > 0 && (
                            <span className="text-[10px] shrink-0" style={{ color: reviewed ? '#16a34a' : '#f59e0b' }}>
                              {commentCount} cmt
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Content + comments */}
              <div className="flex-1 flex flex-col gap-3 min-w-0">
                {/* Content area */}
                <div className="rounded-2xl flex flex-col overflow-hidden"
                  style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)', minHeight: 400 }}>
                  {loadingSections ? (
                    <div className="flex-1 flex items-center justify-center py-16"><PageLoader /></div>
                  ) : sectionData?.content ? (
                    <>
                      <div className="px-5 py-3 border-b flex items-center gap-4 flex-wrap"
                        style={{ borderColor: 'var(--border-main)' }}>
                        <p className="text-sm font-semibold flex-1" style={{ color: 'var(--text-heading)' }}>
                          {activeSection?.label} — {activeSection?.subtitle}
                        </p>
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1"><Hash size={11} /> {sectionData.wordCount.toLocaleString()} words</span>
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {new Date(sectionData.updatedAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          {sectionData.updatedBy?.fullName && (
                            <span className="flex items-center gap-1"><Users size={11} /> {sectionData.updatedBy.fullName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-6">
                        <SafeHtml
                          html={sectionData.content}
                          className="text-sm max-w-3xl mx-auto"
                          style={{
                            color: 'var(--text-primary)',
                            fontFamily: '"Times New Roman", serif',
                            fontSize: 13,
                            lineHeight: 2,
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center py-20">
                      <EmptyState icon={BookOpen} title="No content yet"
                        description={`The group has not written their ${activeSection?.label} yet.`} />
                    </div>
                  )}
                </div>

                {/* Comments panel */}
                <div className="rounded-2xl overflow-hidden"
                  style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)' }}>
                  {/* Comments header */}
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare size={13} style={{ color: 'var(--text-muted)' }} />
                      <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-heading)' }}>
                        Comments — {activeSection?.label}
                      </span>
                      {/* Section review badge */}
                      {(() => {
                        const st = sectionStatusMap[activeKey]
                        if (!st) return null
                        return st.isReviewed ? (
                          <span className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <CheckCircle2 size={9} /> Reviewed
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>
                            Awaiting review
                          </span>
                        )
                      })()}
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        Rev {revision}
                      </span>
                    </div>
                    {/* Role color legend */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {Object.entries(ROLE_PALETTE).map(([role, pal]) => (
                        <span key={role} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: pal.color }} />
                          {pal.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-4">
                    {comments.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-6">
                        <MessageSquare size={22} style={{ color: 'var(--border-main)' }} strokeWidth={1.3} />
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {isLocked ? 'No comments yet. Be the first to review this section.' : 'No comments yet for this section.'}
                        </p>
                      </div>
                    ) : (
                      <ul className="space-y-3 mb-4">
                        {comments.map(c => <CommentBubble key={c.id} c={c} />)}
                      </ul>
                    )}

                    {canReview && isLocked && (
                      <form onSubmit={handleAddComment} className="mt-2">
                        <textarea
                          rows={2}
                          maxLength={1000}
                          className="form-input w-full text-sm py-2 resize-none"
                          placeholder="Leave a comment on this section…"
                          value={commentInput}
                          onChange={e => setCommentInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(e) }
                          }}
                        />
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px]" style={{ color: commentInput.length > 900 ? '#f59e0b' : 'var(--text-muted)' }}>
                            {commentInput.length}/1000
                          </span>
                          <button type="submit" className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
                            disabled={submittingComment || !commentInput.trim()}>
                            <Send size={12} />
                            {submittingComment ? 'Posting…' : 'Post comment'}
                          </button>
                        </div>
                      </form>
                    )}
                    {canReview && !isLocked && (
                      <p className="text-xs text-center py-2 mt-1" style={{ color: 'var(--text-muted)' }}>
                        Comments can only be added when the manuscript is finalized and locked by the group.
                      </p>
                    )}
                  </div>
                </div>

                {/* Revision history */}
                {revSummary && <RevisionHistory history={revSummary.history} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SafeHtml({ html, className, style }) {
  const clean = useMemo(
    () => DOMPurify.sanitize(html ?? '', {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div'],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'style', 'class',
        'colspan', 'rowspan', 'width', 'height'],
      ALLOW_DATA_ATTR: false,
    }),
    [html]
  )
  return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: clean }} />
}
