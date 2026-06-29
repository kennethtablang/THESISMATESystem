import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { exportDefenseGrid } from '../../lib/exportDefenseGrid'
import { useAuth } from '../../contexts/AuthContext'
import { defenseService, groupService, authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin, { Draggable } from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import {
  GripVertical, AlertCircle, CheckCircle2, CalendarDays, MapPin,
  Users, Clock, Trash2, ChevronRight, Info, Pencil, X, RefreshCw, GraduationCap,
  Download,
} from 'lucide-react'
import { toast } from '../../utils/toast'

// ── Phase config ──────────────────────────────────────────────────────────────
const PHASES = [
  {
    key:    'TitleDefense',
    label:  'Title Defense',
    short:  'TD',
    desc:   'Research title & concept presentation',
    color:  '#7c3aed',
    bg:     'rgba(124,58,237,0.10)',
    border: 'rgba(124,58,237,0.25)',
  },
  {
    key:    'ProposalDefense',
    label:  'Proposal Defense',
    short:  'PD',
    desc:   'Chapters 1–3: Introduction, Review, Methodology',
    color:  '#c9a84c',
    bg:     'rgba(201,168,76,0.10)',
    border: 'rgba(201,168,76,0.25)',
  },
  {
    key:    'FinalDefense',
    label:  'Final Defense',
    short:  'FD',
    desc:   'Full system demo + Chapters 4–5',
    color:  '#16a34a',
    bg:     'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.25)',
  },
  {
    key:    'ReDefense',
    label:  'Re-Defense',
    short:  'RD',
    desc:   'Re-evaluation after failed Final Defense',
    color:  '#dc2626',
    bg:     'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.25)',
  },
]

function phaseOf(key) { return PHASES.find(p => p.key === key) ?? PHASES[0] }

function getCurrentSchoolYear() {
  const now   = new Date()
  const month = now.getMonth() + 1   // 1–12
  const year  = now.getFullYear()
  // Philippines: school year runs June – May
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

// ── Draggable group chip (unscheduled) ────────────────────────────────────────
function UnscheduledChip({ group, phase }) {
  const p = phaseOf(phase)
  return (
    <div
      data-group-id={group.id}
      data-group-name={group.groupName}
      data-project-title={group.projectTitle ?? ''}
      data-phase={phase}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-grab select-none transition-all duration-150 active:cursor-grabbing"
      style={{ background: p.bg, border: `1px solid ${p.border}` }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 2px 8px ${p.border}`; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
    >
      <GripVertical size={12} style={{ color: p.color, flexShrink: 0, opacity: 0.7 }} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold truncate" style={{ color: p.color }}>{group.groupName}</p>
        {group.projectTitle && (
          <p className="text-xs truncate leading-tight" style={{ color: 'var(--text-muted)', marginTop: 1 }}>
            {group.projectTitle}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Scheduled group chip ──────────────────────────────────────────────────────
function parseUtc(str) {
  if (!str) return new Date(NaN)
  return new Date(str)
}

// Returns an error message if the time window is outside 6 AM – 7 PM, otherwise null.
const SCHED_START_MIN = 6 * 60   // 6:00 AM = 360 min
const SCHED_END_MIN   = 19 * 60  // 7:00 PM = 1140 min

function getAllowedHoursError(startDate, durationMins = 60) {
  const startMin = startDate.getHours() * 60 + startDate.getMinutes()
  const endMin   = startMin + (durationMins || 60)
  if (startMin < SCHED_START_MIN) return 'Defenses cannot be scheduled before 6:00 AM.'
  if (endMin > SCHED_END_MIN)     return 'Defenses cannot extend past 7:00 PM. Choose an earlier time or shorten the duration.'
  return null
}

function ScheduledChip({ group, defense, onView }) {
  const p = phaseOf(defense.phase)
  const time = parseUtc(defense.scheduledDateTime).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  return (
    <button
      onClick={() => onView(defense)}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = p.border }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border-light)' }}
    >
      <CheckCircle2 size={13} style={{ color: p.color, flexShrink: 0 }} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{group.groupName}</p>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{time}</p>
      </div>
      <ChevronRight size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DefenseScheduler() {
  const { user } = useAuth()
  const calendarRef  = useRef(null)
  const draggableRef = useRef(null)
  const sidebarRef   = useRef(null)

  const [groups,       setGroups]       = useState([])
  const [defenses,     setDefenses]     = useState([])
  const [faculty,      setFaculty]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [loadKey,      setLoadKey]      = useState(0)
  const [activePhase,  setActivePhase]  = useState('TitleDefense')
  const [selectedYear, setSelectedYear] = useState(() => getCurrentSchoolYear())

  // Drop → confirm modal
  const [dropInfo,   setDropInfo]   = useState(null)
  const [form,       setForm]       = useState({ venue: '', panelistIds: [], durationMinutes: 60 })
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')

  // Event detail modal
  const [clickedDef,    setClickedDef]    = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling,    setCancelling]    = useState(false)

  // Edit mode inside the detail modal
  const [editingDef,   setEditingDef]   = useState(false)
  const [editDefForm,  setEditDefForm]  = useState({ venue: '', scheduledDateTime: '', durationMinutes: 60, panelistIds: [] })
  const [editDefSaving,setEditDefSaving]= useState(false)
  const [editDefError, setEditDefError] = useState('')

  // Defense outcome tags form (Final/Re-defense completed)
  const [outcomeForm,   setOutcomeForm]   = useState({ defenseOutcome: '', revisionLevel: '', requiresReDefense: false })
  const [outcomeSaving, setOutcomeSaving] = useState(false)

  const canSchedule = ['Admin', 'SuperAdmin', 'Faculty'].includes(user?.role)
  const canModify   = ['Admin', 'SuperAdmin'].includes(user?.role)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    async function load() {
      try {
        const [grps, defs, users] = await Promise.all([
          groupService.list(),
          defenseService.list(),
          authService.allUsers().catch(() => []),
        ])
        setGroups(Array.isArray(grps)  ? grps.filter(g => g.status === 'Active') : [])
        setDefenses(Array.isArray(defs) ? defs : [])
        setFaculty(Array.isArray(users) ? users.filter(u => u.role === 'Faculty') : [])
      } catch (err) {
        setLoadError(err?.message || 'Failed to load scheduler data. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadKey])

  // ── Wire external draggable ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sidebarRef.current || !canModify) return
    draggableRef.current = new Draggable(sidebarRef.current, {
      itemSelector: '[data-group-id]',
      eventData(el) {
        return {
          title: el.dataset.groupName,
          duration: { minutes: 60 },
          extendedProps: {
            groupId:      parseInt(el.dataset.groupId, 10),
            groupName:    el.dataset.groupName,
            projectTitle: el.dataset.projectTitle,
            phase:        el.dataset.phase,
          },
        }
      },
    })
    return () => draggableRef.current?.destroy()
  }, [canModify, loading])

  // ── School-year filtering ────────────────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set([
      getCurrentSchoolYear(),
      ...groups.map(g => g.academicYear),
      ...defenses.map(d => d.academicYear),
    ].filter(Boolean))
    return [...years].sort().reverse()
  }, [groups, defenses])

  // Auto-snap to the most recent year that actually has data when the
  // computed school year has no groups/defenses (e.g. seeded data is "2025-2026"
  // but today's computed year is "2026-2027").
  useEffect(() => {
    if (!loading && availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      const bestYear = availableYears.find(y =>
        groups.some(g => g.academicYear === y) || defenses.some(d => d.academicYear === y)
      ) ?? availableYears[0]
      setSelectedYear(bestYear)
    }
  }, [loading, availableYears]) // eslint-disable-line react-hooks/exhaustive-deps

  const yearGroups   = useMemo(() => groups.filter(g => g.academicYear === selectedYear),   [groups, selectedYear])
  const yearDefenses = useMemo(() => defenses.filter(d => d.academicYear === selectedYear), [defenses, selectedYear])

  // ── Derived state ───────────────────────────────────────────────────────────
  const progressByPhase = useMemo(() => {
    const result = {}
    PHASES.forEach(ph => {
      const ids = new Set(
        yearDefenses
          .filter(d => String(d.phase) === ph.key && String(d.status) !== 'Cancelled')
          .map(d => Number(d.capstoneGroupId))
      )
      result[ph.key] = { scheduled: ids.size, total: yearGroups.length }
    })
    return result
  }, [yearDefenses, yearGroups])

  const scheduledForPhase = useMemo(
    () => yearDefenses.filter(d => String(d.phase) === activePhase && String(d.status) !== 'Cancelled'),
    [yearDefenses, activePhase]
  )
  const scheduledGroupIds = useMemo(
    () => new Set(scheduledForPhase.map(d => Number(d.capstoneGroupId))),
    [scheduledForPhase]
  )
  const unscheduledGroups = yearGroups.filter(g => !scheduledGroupIds.has(Number(g.id)))
  const scheduledGroups   = yearGroups.filter(g =>  scheduledGroupIds.has(Number(g.id)))

  // ── Calendar events (current year, all phases, excluding cancelled) ─────────
  // Both start and end MUST be UTC ISO strings so FullCalendar applies the same
  // timezone treatment to both. Passing d.scheduledDateTime directly risks
  // a no-Z string being interpreted as LOCAL time while the end (computed via
  // parseUtc) is UTC — the mismatch creates phantom multi-hour event blocks.
  const calendarEvents = yearDefenses.filter(d => String(d.status) !== 'Cancelled').map(d => {
    const canEdit   = d.status === 'Scheduled' || d.status === 'Rescheduled'
    const startDate = parseUtc(d.scheduledDateTime)
    return {
      id:              String(d.id),
      title:           d.groupName,
      start:           startDate.toISOString(),
      end:             new Date(startDate.getTime() + (d.durationMinutes ?? 60) * 60000).toISOString(),
      backgroundColor: canEdit ? phaseOf(d.phase).color : '#6b7280',
      borderColor:     canEdit ? phaseOf(d.phase).color : '#6b7280',
      editable:        canEdit,
      extendedProps:   { defense: d },
    }
  })

  // ── Drop from sidebar ───────────────────────────────────────────────────────
  const handleEventReceive = useCallback((info) => {
    info.revert()
    const timeErr = getAllowedHoursError(info.event.start, 60)
    if (timeErr) { toast.error(timeErr); return }
    const { groupId, groupName, projectTitle, phase } = info.event.extendedProps
    setDropInfo({ groupId, groupName, projectTitle, phase, start: info.event.start })
    setForm({ venue: '', panelistIds: [], durationMinutes: 60 })
    setSaveError('')
  }, [])

  // ── Save new defense ────────────────────────────────────────────────────────
  async function handleConfirmSchedule() {
    if (!form.venue.trim()) { setSaveError('Please enter a venue or room.'); return }
    const timeErr = getAllowedHoursError(dropInfo.start, form.durationMinutes)
    if (timeErr) { setSaveError(timeErr); return }
    setSaving(true); setSaveError('')
    try {
      const created = await defenseService.create({
        capstoneGroupId:   dropInfo.groupId,
        scheduledDateTime: dropInfo.start.toISOString(),
        durationMinutes:   form.durationMinutes,
        venue:             form.venue.trim(),
        phase:             dropInfo.phase,
        panelistIds:       form.panelistIds,
      })
      setDefenses(prev => [...prev, created])
      setDropInfo(null)
      toast.success('Defense scheduled.')
    } catch (err) {
      setSaveError(err.message || 'Failed to save defense schedule.')
      toast.error(err.message || 'Failed to save defense schedule.')
    } finally {
      setSaving(false)
    }
  }

  // ── Click existing event ────────────────────────────────────────────────────
  const handleEventClick = useCallback((info) => {
    const defense = info.event.extendedProps.defense
    setClickedDef(defense)
    setCancelConfirm(false)
    setOutcomeForm({ defenseOutcome: '', revisionLevel: '', requiresReDefense: false })
  }, [])

  // ── Set defense outcome ─────────────────────────────────────────────────────
  async function handleSetOutcome() {
    if (!clickedDef) return
    setOutcomeSaving(true)
    try {
      await groupService.setDefenseOutcome(clickedDef.capstoneGroupId, {
        defenseOutcome:    outcomeForm.defenseOutcome   || undefined,
        revisionLevel:     outcomeForm.revisionLevel    || undefined,
        requiresReDefense: outcomeForm.requiresReDefense,
      })
      toast.success('Defense outcome saved.')
    } catch {
      toast.error('Failed to save outcome.')
    } finally {
      setOutcomeSaving(false)
    }
  }

  // ── Cancel defense ──────────────────────────────────────────────────────────
  async function handleCancelDefense() {
    if (!clickedDef) return
    setCancelling(true)
    try {
      await defenseService.cancel(clickedDef.id)
      // Mark as Cancelled (keeps history) so the group reappears as unscheduled
      setDefenses(prev => prev.map(d => d.id === clickedDef.id ? { ...d, status: 'Cancelled' } : d))
      setClickedDef(null)
      setCancelConfirm(false)
      toast.success('Defense cancelled.')
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel defense.')
    } finally {
      setCancelling(false)
    }
  }

  // ── Open edit mode ──────────────────────────────────────────────────────────
  function openEditMode(d) {
    const dt2 = new Date(d.scheduledDateTime ?? '')
    const pad = n => String(n).padStart(2, '0')
    const localDT = `${dt2.getFullYear()}-${pad(dt2.getMonth()+1)}-${pad(dt2.getDate())}T${pad(dt2.getHours())}:${pad(dt2.getMinutes())}`
    setEditDefForm({
      venue:             d.venue ?? '',
      scheduledDateTime: localDT,
      durationMinutes:   d.durationMinutes ?? 60,
      panelistIds:       d.panelists?.map(p => p.id) ?? [],
    })
    setEditingDef(true)
    setEditDefError('')
    setCancelConfirm(false)
  }

  // ── Save edits ───────────────────────────────────────────────────────────────
  async function handleSaveEdit() {
    if (!editDefForm.venue.trim()) { setEditDefError('Venue is required.'); return }
    if (!editDefForm.scheduledDateTime) { setEditDefError('Date & time is required.'); return }
    // datetime-local strings parse as LOCAL time in the browser — correct for schedule validation
    const newDt   = new Date(editDefForm.scheduledDateTime)
    const timeErr = getAllowedHoursError(newDt, editDefForm.durationMinutes)
    if (timeErr) { setEditDefError(timeErr); return }

    // Only include scheduledDateTime when it actually changed to avoid spurious
    // "Rescheduled" status and notifications for venue/panelist-only edits.
    const oldDt      = parseUtc(clickedDef.scheduledDateTime)
    const dtChanged  = Math.abs(newDt - oldDt) > 30000   // >30 s difference
    setEditDefSaving(true); setEditDefError('')
    try {
      const updated = await defenseService.update(clickedDef.id, {
        venue:           editDefForm.venue.trim(),
        durationMinutes: editDefForm.durationMinutes,
        panelistIds:     editDefForm.panelistIds,
        ...(dtChanged ? { scheduledDateTime: newDt.toISOString() } : {}),
      })
      setDefenses(prev => prev.map(d => d.id === clickedDef.id ? updated : d))
      setClickedDef(updated)
      setEditingDef(false)
      toast.success('Defense updated.')
    } catch (err) {
      setEditDefError(err.message || 'Failed to save changes.')
      toast.error(err.message || 'Failed to save changes.')
    } finally {
      setEditDefSaving(false)
    }
  }

  // ── Drag existing event to reschedule ───────────────────────────────────────
  const handleEventDrop = useCallback(async (info) => {
    const def = info.event.extendedProps.defense
    const timeErr = getAllowedHoursError(info.event.start, def.durationMinutes ?? 60)
    if (timeErr) { info.revert(); toast.error(timeErr); return }
    try {
      const updated = await defenseService.update(def.id, {
        scheduledDateTime: info.event.start.toISOString(),
      })
      setDefenses(prev => prev.map(d => d.id === def.id ? updated : d))
      toast.success('Defense rescheduled.')
    } catch (err) {
      info.revert()
      toast.error(err?.message || 'Failed to reschedule defense.')
    }
  }, [])

  // ── Resize to change duration ───────────────────────────────────────────────
  const handleEventResize = useCallback(async (info) => {
    const def = info.event.extendedProps.defense
    const mins = Math.round((info.event.end - info.event.start) / 60000)
    const timeErr = getAllowedHoursError(info.event.start, mins)
    if (timeErr) { info.revert(); toast.error(timeErr); return }
    try {
      const updated = await defenseService.update(def.id, { durationMinutes: mins })
      setDefenses(prev => prev.map(d => d.id === def.id ? updated : d))
      toast.success('Duration updated.')
    } catch (err) {
      info.revert()
      toast.error(err?.message || 'Failed to update duration.')
    }
  }, [])

  // ── XLSX schedule grid export ────────────────────────────────────────────────
  async function handleExportGrid() {
    try {
      const ok = await exportDefenseGrid(yearDefenses, yearGroups, selectedYear)
      if (ok) toast.success('Schedule grid exported.')
      else toast.error('No scheduled defenses to export.')
    } catch (err) {
      console.error(err)
      toast.error('Failed to export schedule grid.')
    }
  }

  if (loading) return <><TopBar title="Defense Scheduler" /><PageLoader /></>

  const p = phaseOf(activePhase)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 68px)', overflow: 'hidden' }}>
      <TopBar title="Defense Scheduler" />

      {/* ── Load error banner ────────────────────────────────────────────── */}
      {loadError && (
        <div className="mx-5 mt-3 px-4 py-3 rounded-xl flex items-center gap-3 shrink-0"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span className="text-sm flex-1" style={{ color: '#dc2626' }}>{loadError}</span>
          <button
            onClick={() => setLoadKey(k => k + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
            style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

      {/* ── Phase tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-light)' }}>
        {PHASES.map(ph => {
          const pr  = progressByPhase[ph.key] ?? { scheduled: 0, total: 0 }
          const pct = pr.total > 0 ? (pr.scheduled / pr.total) * 100 : 0
          const active = activePhase === ph.key
          return (
            <button
              key={ph.key}
              onClick={() => setActivePhase(ph.key)}
              className="flex flex-col items-start px-4 py-2.5 rounded-xl transition-all duration-150 shrink-0"
              style={{
                background: active ? ph.color : 'var(--bg-subtle)',
                border: `1px solid ${active ? ph.color : 'var(--border-main)'}`,
                minWidth: 160,
              }}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs font-bold" style={{ color: active ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                  {ph.short}
                </span>
                <span className="text-sm font-semibold" style={{ color: active ? '#fff' : 'var(--text-primary)' }}>
                  {ph.label}
                </span>
                <span className="ml-auto text-xs font-bold tabular-nums"
                  style={{ color: active ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)' }}>
                  {pr.scheduled}/{pr.total}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full mt-1.5 rounded-full overflow-hidden"
                style={{ height: 3, background: active ? 'rgba(255,255,255,0.25)' : 'var(--border-main)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: active ? '#fff' : ph.color,
                  }} />
              </div>
            </button>
          )
        })}

        {/* Phase description chip */}
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl ml-2"
          style={{ background: p.bg, border: `1px solid ${p.border}` }}>
          <Info size={12} style={{ color: p.color, flexShrink: 0 }} />
          <span className="text-xs" style={{ color: p.color }}>{p.desc}</span>
        </div>

        {/* Year selector + drag hint */}
        <div className="ml-auto flex items-center gap-2">
          {/* School-year picker */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
            <GraduationCap size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12,
                       fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          {yearDefenses.some(d => d.status !== 'Cancelled') && (
            <button
              onClick={handleExportGrid}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              title="Export schedule as Excel spreadsheet"
            >
              <Download size={12} />
              Export XLSX
            </button>
          )}
          {canModify && unscheduledGroups.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
              <GripVertical size={12} />
              Drag groups onto the calendar
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="flex flex-col shrink-0"
          style={{ width: 232, borderRight: '1px solid var(--border-light)', background: 'var(--bg-page)' }}>

          {/* Unscheduled section */}
          <div className="px-3 pt-3 pb-1 shrink-0">
            <p className="text-xs font-bold tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
              TO SCHEDULE
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {unscheduledGroups.length === 0 ? 'None remaining' : `${unscheduledGroups.length} group${unscheduledGroups.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div ref={sidebarRef} className="overflow-y-auto px-2 pb-2 space-y-1.5"
            style={{ maxHeight: unscheduledGroups.length === 0 ? 0 : scheduledGroups.length > 0 ? '45%' : '100%', minHeight: 40 }}>
            {unscheduledGroups.length === 0 ? (
              <div className="px-3 py-3 flex items-center gap-2">
                <CheckCircle2 size={14} style={{ color: p.color }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>All scheduled</span>
              </div>
            ) : unscheduledGroups.map(g => (
              <UnscheduledChip key={g.id} group={g} phase={activePhase} />
            ))}
          </div>

          {/* Divider + Scheduled section */}
          {scheduledGroups.length > 0 && (
            <>
              <div className="mx-3 shrink-0" style={{ height: 1, background: 'var(--border-light)', margin: '6px 12px' }} />
              <div className="px-3 pb-1 shrink-0">
                <p className="text-xs font-bold tracking-wide mb-0.5" style={{ color: 'var(--text-muted)' }}>
                  SCHEDULED
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {scheduledGroups.length} group{scheduledGroups.length !== 1 ? 's' : ''} · click to view
                </p>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5">
                {scheduledGroups.map(g => {
                  const def = scheduledForPhase.find(d => Number(d.capstoneGroupId) === Number(g.id))
                  return (
                    <ScheduledChip
                      key={g.id}
                      group={g}
                      defense={def}
                      onView={setClickedDef}
                    />
                  )
                })}
              </div>
            </>
          )}

          {/* Legend */}
          <div className="px-3 py-3 shrink-0" style={{ borderTop: '1px solid var(--border-light)' }}>
            <p className="text-xs font-bold tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>LEGEND</p>
            <div className="space-y-1.5">
              {PHASES.map(ph => {
                const pr = progressByPhase[ph.key] ?? { scheduled: 0, total: 0 }
                return (
                  <div key={ph.key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: ph.color }} />
                    <span className="text-xs flex-1" style={{ color: 'var(--text-secondary)' }}>{ph.label}</span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {pr.scheduled}/{pr.total}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </aside>

        {/* ── Calendar ────────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-hidden p-3" style={{ background: 'var(--bg-page)' }}>
          <div className="h-full rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <FullCalendar
              ref={calendarRef}
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin, listPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left:   'prev,next today',
                center: 'title',
                right:  'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
              }}
              height="100%"
              slotMinTime="06:00:00"
              slotMaxTime="21:00:00"
              slotDuration="00:30:00"
              snapDuration="00:15:00"
              allDaySlot={false}
              nowIndicator
              editable={canModify}
              droppable={canModify}
              eventResizableFromStart={false}
              events={calendarEvents}
              eventReceive={handleEventReceive}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventContent={renderEventContent}
              eventDidMount={styleEvent}
              dayMaxEvents={3}
              businessHours={{ startTime: '06:00', endTime: '19:00' }}
            />
          </div>
        </main>
      </div>

      {/* ── Schedule confirm modal ─────────────────────────────────────────── */}
      <Modal
        open={!!dropInfo}
        onClose={() => { if (!saving) setDropInfo(null) }}
        title="Schedule Defense"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDropInfo(null)} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={handleConfirmSchedule} disabled={saving}>
              {saving ? 'Scheduling…' : 'Confirm Schedule'}
            </button>
          </>
        }
      >
        {dropInfo && (() => {
          const ph = phaseOf(dropInfo.phase)
          return (
            <div className="space-y-4">
              {/* Summary header */}
              <div className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: ph.bg, border: `1px solid ${ph.border}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: ph.color }}>
                  <CalendarDays size={16} color="#fff" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: ph.color }}>{dropInfo.groupName}</p>
                  {dropInfo.projectTitle && (
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{dropInfo.projectTitle}</p>
                  )}
                  <p className="text-xs font-semibold mt-0.5" style={{ color: ph.color }}>
                    {ph.label} · {dropInfo.start.toLocaleString('en-PH', {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {saveError && (
                <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertCircle size={13} /> {saveError}
                </div>
              )}

              {/* Venue (required — first) */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Venue / Room <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  autoFocus
                  placeholder="e.g. Room 301, Conference Hall, or meeting link"
                  value={form.venue}
                  onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmSchedule()}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Duration
                </label>
                <div className="flex gap-2">
                  {[30, 45, 60, 90, 120].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, durationMinutes: m }))}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                      style={{
                        background: form.durationMinutes === m ? ph.color : 'var(--bg-subtle)',
                        color:      form.durationMinutes === m ? '#fff' : 'var(--text-secondary)',
                        border:     `1px solid ${form.durationMinutes === m ? ph.color : 'var(--border-light)'}`,
                      }}
                    >
                      {m < 60 ? `${m}m` : `${m / 60}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panelists */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Panelists
                  {form.panelistIds.length > 0 && (
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-md"
                      style={{ background: ph.bg, color: ph.color }}>
                      {form.panelistIds.length} selected
                    </span>
                  )}
                </label>
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-light)', maxHeight: 180, overflowY: 'auto' }}>
                  {faculty.length === 0 ? (
                    <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No faculty found.</p>
                  ) : faculty.map((f, idx) => {
                    const checked = form.panelistIds.includes(f.id)
                    return (
                      <label key={f.id}
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                        style={{
                          borderBottom: idx < faculty.length - 1 ? '1px solid var(--border-light)' : 'none',
                          background: checked ? ph.bg : 'transparent',
                          transition: 'background 0.1s',
                        }}>
                        <input type="checkbox" checked={checked} onChange={() =>
                          setForm(prev => ({
                            ...prev,
                            panelistIds: checked
                              ? prev.panelistIds.filter(id => id !== f.id)
                              : [...prev.panelistIds, f.id],
                          }))
                        } />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {f.fullName}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{f.email}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* ── Event detail / edit modal ─────────────────────────────────────────── */}
      <Modal
        open={!!clickedDef}
        onClose={() => { setClickedDef(null); setCancelConfirm(false); setEditingDef(false) }}
        title={editingDef ? 'Edit Defense' : 'Defense Details'}
        size="md"
        footer={(() => {
          const isActive = clickedDef?.status === 'Scheduled' || clickedDef?.status === 'Rescheduled'
          if (editingDef) return (
            <>
              <button className="btn-secondary" onClick={() => { setEditingDef(false); setEditDefError('') }}
                disabled={editDefSaving}>
                Discard
              </button>
              <button className="btn-primary" onClick={handleSaveEdit} disabled={editDefSaving}>
                {editDefSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          )
          if (cancelConfirm) return (
            <>
              <span className="text-xs mr-auto" style={{ color: 'var(--text-muted)' }}>Remove this schedule?</span>
              <button className="btn-secondary" onClick={() => setCancelConfirm(false)} disabled={cancelling}>Keep</button>
              <button onClick={handleCancelDefense} disabled={cancelling}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: '#dc2626', color: '#fff' }}>
                {cancelling ? 'Removing…' : 'Yes, Remove'}
              </button>
            </>
          )
          return (
            <>
              {canModify && isActive && (
                <button onClick={() => setCancelConfirm(true)}
                  className="mr-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                  <Trash2 size={12} /> Cancel Defense
                </button>
              )}
              <button className="btn-secondary" onClick={() => setClickedDef(null)}>Close</button>
              {canModify && isActive && (
                <button className="btn-primary flex items-center gap-1.5" onClick={() => openEditMode(clickedDef)}>
                  <Pencil size={13} /> Edit
                </button>
              )}
            </>
          )
        })()}
      >
        {clickedDef && (() => {
          const ph = phaseOf(clickedDef.phase)
          const d  = clickedDef
          const dt = parseUtc(d.scheduledDateTime)

          // ── Edit form ──────────────────────────────────────────────────────
          if (editingDef) return (
            <div className="space-y-4">
              {/* Group + phase header */}
              <div className="rounded-xl p-3.5 flex items-center gap-3"
                style={{ background: ph.bg, border: `1px solid ${ph.border}` }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: ph.color }}>
                  <CalendarDays size={16} color="#fff" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: ph.color }}>{d.groupName}</p>
                  <p className="text-xs font-semibold" style={{ color: ph.color }}>{ph.label}</p>
                </div>
              </div>

              {editDefError && (
                <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertCircle size={13} /> {editDefError}
                </div>
              )}

              {/* Date & Time */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Date &amp; Time <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editDefForm.scheduledDateTime}
                  onChange={e => setEditDefForm(f => ({ ...f, scheduledDateTime: e.target.value }))}
                />
              </div>

              {/* Venue */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Venue / Room <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  autoFocus
                  placeholder="e.g. Room 301, Conference Hall"
                  value={editDefForm.venue}
                  onChange={e => setEditDefForm(f => ({ ...f, venue: e.target.value }))}
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Duration</label>
                <div className="flex gap-2">
                  {[30, 45, 60, 90, 120].map(m => (
                    <button key={m} type="button"
                      onClick={() => setEditDefForm(f => ({ ...f, durationMinutes: m }))}
                      className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
                      style={{
                        background: editDefForm.durationMinutes === m ? ph.color : 'var(--bg-subtle)',
                        color:      editDefForm.durationMinutes === m ? '#fff'    : 'var(--text-secondary)',
                        border:     `1px solid ${editDefForm.durationMinutes === m ? ph.color : 'var(--border-light)'}`,
                      }}>
                      {m < 60 ? `${m}m` : `${m / 60}h`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Panelists */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Panelists
                  {editDefForm.panelistIds.length > 0 && (
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-md"
                      style={{ background: ph.bg, color: ph.color }}>
                      {editDefForm.panelistIds.length} selected
                    </span>
                  )}
                </label>
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-light)', maxHeight: 180, overflowY: 'auto' }}>
                  {faculty.length === 0
                    ? <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>No faculty found.</p>
                    : faculty.map((f, idx) => {
                      const checked = editDefForm.panelistIds.includes(f.id)
                      return (
                        <label key={f.id}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                          style={{
                            borderBottom: idx < faculty.length - 1 ? '1px solid var(--border-light)' : 'none',
                            background:   checked ? ph.bg : 'transparent',
                            transition:   'background 0.1s',
                          }}>
                          <input type="checkbox" checked={checked}
                            style={{ accentColor: ph.color }}
                            onChange={() => setEditDefForm(prev => ({
                              ...prev,
                              panelistIds: checked
                                ? prev.panelistIds.filter(id => id !== f.id)
                                : [...prev.panelistIds, f.id],
                            }))} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {f.fullName}
                            </p>
                            <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{f.email}</p>
                          </div>
                          {checked && <CheckCircle2 size={14} style={{ color: ph.color, flexShrink: 0 }} />}
                        </label>
                      )
                    })
                  }
                </div>
              </div>
            </div>
          )

          // ── View mode ──────────────────────────────────────────────────────
          return (
            <div className="space-y-4">
              <div className="rounded-xl p-4" style={{ background: ph.bg, border: `1px solid ${ph.border}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-base" style={{ color: ph.color }}>{d.groupName}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: ph.color }}>{ph.label}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0"
                    style={{ background: ph.color, color: '#fff' }}>
                    {d.status}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <DetailRow icon={<CalendarDays size={14} />}
                  label="Date & Time"
                  value={dt.toLocaleString('en-PH', {
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })} />
                <DetailRow icon={<Clock size={14} />}
                  label="Duration"
                  value={`${d.durationMinutes ?? 60} minutes`} />
                <DetailRow icon={<MapPin size={14} />}
                  label="Venue"
                  value={d.venue || '—'} />
                <DetailRow icon={<Users size={14} />}
                  label="Panelists"
                  value={
                    d.panelists?.length > 0
                      ? <div className="space-y-0.5">
                          {d.panelists.map(pan => (
                            <p key={pan.id} className="text-sm" style={{ color: 'var(--text-primary)' }}>{pan.fullName}</p>
                          ))}
                        </div>
                      : <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No panelists assigned</p>
                  } />
              </div>

              {cancelConfirm && (
                <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertCircle size={13} />
                  This will remove the scheduled defense. Panelists and the group will be notified.
                </div>
              )}

              {/* ── Defense outcome tags (Final/Re-defense completed) ── */}
              {canModify && d.status === 'Completed' && (d.phase === 'FinalDefense' || d.phase === 'ReDefense') && (
                <div className="rounded-xl p-4 space-y-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Set Group Outcome
                  </p>

                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Defense Result</p>
                    <div className="flex gap-2">
                      {[
                        { value: 'Defended',    label: 'Defended',     color: '#16a34a', bg: 'rgba(34,197,94,0.12)' },
                        { value: 'NotDefended', label: 'Not Defended', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
                      ].map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setOutcomeForm(f => ({ ...f, defenseOutcome: f.defenseOutcome === opt.value ? '' : opt.value }))}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: outcomeForm.defenseOutcome === opt.value ? opt.bg : 'var(--bg-card)',
                            color: outcomeForm.defenseOutcome === opt.value ? opt.color : 'var(--text-secondary)',
                            border: `1px solid ${outcomeForm.defenseOutcome === opt.value ? opt.color : 'var(--border-main)'}`,
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Revision Level</p>
                    <div className="flex gap-2">
                      {[
                        { value: 'None',           label: 'No Revisions',    color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
                        { value: 'MinorRevisions', label: 'Minor Revisions', color: '#ca8a04', bg: 'rgba(234,179,8,0.12)' },
                        { value: 'MajorRevisions', label: 'Major Revisions', color: '#dc2626', bg: 'rgba(239,68,68,0.12)' },
                      ].map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setOutcomeForm(f => ({ ...f, revisionLevel: f.revisionLevel === opt.value ? '' : opt.value }))}
                          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: outcomeForm.revisionLevel === opt.value ? opt.bg : 'var(--bg-card)',
                            color: outcomeForm.revisionLevel === opt.value ? opt.color : 'var(--text-secondary)',
                            border: `1px solid ${outcomeForm.revisionLevel === opt.value ? opt.color : 'var(--border-main)'}`,
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={outcomeForm.requiresReDefense}
                        onChange={e => setOutcomeForm(f => ({ ...f, requiresReDefense: e.target.checked }))}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: '#dc2626' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Requires Re-Defense</span>
                    </label>
                  </div>

                  <button onClick={handleSetOutcome} disabled={outcomeSaving || (!outcomeForm.defenseOutcome && !outcomeForm.revisionLevel && !outcomeForm.requiresReDefense)}
                    className="btn-primary text-xs w-full">
                    {outcomeSaving ? 'Saving...' : 'Save Outcome Tags'}
                  </button>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

// ── Calendar event content ────────────────────────────────────────────────────
function renderEventContent(info) {
  const d  = info.event.extendedProps.defense
  const ph = phaseOf(d?.phase)
  const panCount = d?.panelists?.length ?? 0
  return (
    <div className="overflow-hidden px-1.5 py-1 h-full flex flex-col gap-0.5"
      title={`${info.event.title} · ${ph.label}${d?.venue ? ` · ${d.venue}` : ''}`}>
      <p className="font-bold text-xs leading-tight truncate">{info.event.title}</p>
      <p className="text-xs leading-tight truncate opacity-85"
        style={{ fontSize: 10 }}>
        {ph.short} · {info.event.start?.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
      </p>
      {d?.venue && (
        <p className="text-xs leading-tight truncate opacity-70" style={{ fontSize: 10 }}>{d.venue}</p>
      )}
      {panCount > 0 && (
        <p className="text-xs leading-tight opacity-70" style={{ fontSize: 10 }}>
          {panCount} panelist{panCount !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}

function styleEvent(info) {
  Object.assign(info.el.style, {
    borderRadius: '8px',
    border:       'none',
    boxShadow:    '0 1px 4px rgba(0,0,0,0.18)',
    cursor:       'pointer',
  })
}

// ── Detail row ────────────────────────────────────────────────────────────────
function DetailRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5"
        style={{ color: 'var(--text-muted)' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
        {typeof value === 'string'
          ? <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{value}</p>
          : value}
      </div>
    </div>
  )
}
