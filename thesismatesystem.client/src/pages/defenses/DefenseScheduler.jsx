import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Users, Clock, Trash2, ChevronRight, Info,
} from 'lucide-react'

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
]

function phaseOf(key) { return PHASES.find(p => p.key === key) ?? PHASES[0] }

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
function ScheduledChip({ group, defense, onView }) {
  const p = phaseOf(defense.phase)
  const time = new Date(defense.scheduledDateTime).toLocaleString('en-PH', {
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
  const navigate  = useNavigate()
  const calendarRef  = useRef(null)
  const draggableRef = useRef(null)
  const sidebarRef   = useRef(null)

  const [groups,      setGroups]      = useState([])
  const [defenses,    setDefenses]    = useState([])
  const [faculty,     setFaculty]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [activePhase, setActivePhase] = useState('TitleDefense')

  // Drop → confirm modal
  const [dropInfo,   setDropInfo]   = useState(null)
  const [form,       setForm]       = useState({ venue: '', panelistIds: [], durationMinutes: 60 })
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')

  // Event detail modal
  const [clickedDef,   setClickedDef]   = useState(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelling,    setCancelling]    = useState(false)

  const canSchedule = ['Admin', 'SuperAdmin', 'Faculty'].includes(user?.role)

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [grps, defs, users] = await Promise.all([
          groupService.list().catch(() => []),
          defenseService.list().catch(() => []),
          authService.allUsers().catch(() => []),
        ])
        setGroups(Array.isArray(grps)  ? grps.filter(g => g.status === 'Active') : [])
        setDefenses(Array.isArray(defs) ? defs : [])
        setFaculty(Array.isArray(users) ? users.filter(u => u.role === 'Faculty') : [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Wire external draggable ─────────────────────────────────────────────────
  useEffect(() => {
    if (!sidebarRef.current || !canSchedule) return
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
  }, [canSchedule, loading])

  // ── Derived state ───────────────────────────────────────────────────────────
  const progressByPhase = useMemo(() => {
    const result = {}
    PHASES.forEach(ph => {
      const ids = new Set(
        defenses.filter(d => d.phase === ph.key && d.status !== 'Cancelled').map(d => d.capstoneGroupId)
      )
      result[ph.key] = { scheduled: ids.size, total: groups.length }
    })
    return result
  }, [defenses, groups])

  const scheduledForPhase = useMemo(
    () => defenses.filter(d => d.phase === activePhase && d.status !== 'Cancelled'),
    [defenses, activePhase]
  )
  const scheduledGroupIds = useMemo(
    () => new Set(scheduledForPhase.map(d => d.capstoneGroupId)),
    [scheduledForPhase]
  )
  const unscheduledGroups = groups.filter(g => !scheduledGroupIds.has(g.id))
  const scheduledGroups   = groups.filter(g =>  scheduledGroupIds.has(g.id))

  // ── Calendar events (all phases except cancelled, color-coded) ─────────────
  const calendarEvents = defenses.filter(d => d.status !== 'Cancelled').map(d => ({
    id:              String(d.id),
    title:           d.groupName,
    start:           d.scheduledDateTime,
    end:             new Date(new Date(d.scheduledDateTime).getTime() + (d.durationMinutes ?? 60) * 60000).toISOString(),
    backgroundColor: phaseOf(d.phase).color,
    borderColor:     phaseOf(d.phase).color,
    extendedProps:   { defense: d },
  }))

  // ── Drop from sidebar ───────────────────────────────────────────────────────
  const handleEventReceive = useCallback((info) => {
    info.revert()
    const { groupId, groupName, projectTitle, phase } = info.event.extendedProps
    setDropInfo({ groupId, groupName, projectTitle, phase, start: info.event.start })
    setForm({ venue: '', panelistIds: [], durationMinutes: 60 })
    setSaveError('')
  }, [])

  // ── Save new defense ────────────────────────────────────────────────────────
  async function handleConfirmSchedule() {
    if (!form.venue.trim()) { setSaveError('Please enter a venue or room.'); return }
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
    } catch (err) {
      setSaveError(err.message || 'Failed to save defense schedule.')
    } finally {
      setSaving(false)
    }
  }

  // ── Click existing event ────────────────────────────────────────────────────
  const handleEventClick = useCallback((info) => {
    setClickedDef(info.event.extendedProps.defense)
    setCancelConfirm(false)
  }, [])

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
    } catch {
      // silently restore
    } finally {
      setCancelling(false)
    }
  }

  // ── Drag existing event to reschedule ───────────────────────────────────────
  const handleEventDrop = useCallback(async (info) => {
    const def = info.event.extendedProps.defense
    try {
      const updated = await defenseService.update(def.id, {
        scheduledDateTime: info.event.start.toISOString(),
      })
      setDefenses(prev => prev.map(d => d.id === def.id ? updated : d))
    } catch { info.revert() }
  }, [])

  // ── Resize to change duration ───────────────────────────────────────────────
  const handleEventResize = useCallback(async (info) => {
    const def = info.event.extendedProps.defense
    const mins = Math.round((info.event.end - info.event.start) / 60000)
    try {
      const updated = await defenseService.update(def.id, { durationMinutes: mins })
      setDefenses(prev => prev.map(d => d.id === def.id ? updated : d))
    } catch { info.revert() }
  }, [])

  if (loading) return <><TopBar title="Defense Scheduler" /><PageLoader /></>

  const p    = phaseOf(activePhase)
  const prog = progressByPhase[activePhase] ?? { scheduled: 0, total: 0 }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 68px)', overflow: 'hidden' }}>
      <TopBar title="Defense Scheduler" />

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

        {/* Drag hint */}
        {canSchedule && unscheduledGroups.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
            <GripVertical size={12} />
            Drag groups onto the calendar
          </div>
        )}
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
                  const def = scheduledForPhase.find(d => d.capstoneGroupId === g.id)
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
              editable={canSchedule}
              droppable={canSchedule}
              eventResizableFromStart={false}
              events={calendarEvents}
              eventReceive={handleEventReceive}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventResize={handleEventResize}
              eventContent={renderEventContent}
              eventDidMount={styleEvent}
              dayMaxEvents={3}
              businessHours={{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' }}
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

      {/* ── Event detail modal ────────────────────────────────────────────────── */}
      <Modal
        open={!!clickedDef}
        onClose={() => { setClickedDef(null); setCancelConfirm(false) }}
        title="Defense Details"
        size="sm"
        footer={
          cancelConfirm ? (
            <>
              <span className="text-xs mr-auto" style={{ color: 'var(--text-muted)' }}>Remove this defense schedule?</span>
              <button className="btn-secondary" onClick={() => setCancelConfirm(false)} disabled={cancelling}>Keep</button>
              <button
                onClick={handleCancelDefense}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#dc2626', color: '#fff' }}>
                {cancelling ? 'Removing…' : 'Yes, Remove'}
              </button>
            </>
          ) : (
            <>
              {canSchedule && (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="mr-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
                  <Trash2 size={12} /> Cancel Defense
                </button>
              )}
              <button className="btn-secondary" onClick={() => setClickedDef(null)}>Close</button>
              <button className="btn-primary" onClick={() => { navigate('/defenses'); setClickedDef(null) }}>
                Manage
              </button>
            </>
          )
        }
      >
        {clickedDef && (() => {
          const ph = phaseOf(clickedDef.phase)
          const d  = clickedDef
          const dt = new Date(d.scheduledDateTime)
          return (
            <div className="space-y-4">
              {/* Header */}
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

              {/* Detail rows */}
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
                {d.panelists?.length > 0 && (
                  <DetailRow icon={<Users size={14} />}
                    label="Panelists"
                    value={
                      <div className="space-y-0.5">
                        {d.panelists.map(pan => (
                          <p key={pan.id} className="text-sm" style={{ color: 'var(--text-primary)' }}>{pan.fullName}</p>
                        ))}
                      </div>
                    } />
                )}
              </div>

              {cancelConfirm && (
                <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                  <AlertCircle size={13} />
                  This will remove the scheduled defense. Panelists and the group will be notified.
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
