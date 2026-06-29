import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { defenseService, groupService, authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Calendar, Clock, MapPin, Users, Plus, Star, Lock, Unlock,
  ToggleRight, Pencil, ChevronDown, ChevronUp, Scale, Trash2,
  AlertCircle,
} from 'lucide-react'
import { toast } from '../../utils/toast'

// ── Phase config ──────────────────────────────────────────────────────────────
const PHASES = {
  TitleDefense:    { label: 'Title Defense',    short: 'TD', color: '#7c3aed', bg: 'rgba(124,58,237,0.10)', border: 'rgba(124,58,237,0.25)' },
  ProposalDefense: { label: 'Proposal Defense', short: 'PD', color: '#c9a84c', bg: 'rgba(201,168,76,0.10)', border: 'rgba(201,168,76,0.25)' },
  FinalDefense:    { label: 'Final Defense',    short: 'FD', color: '#16a34a', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)' },
}
const PHASE_KEYS = ['TitleDefense', 'ProposalDefense', 'FinalDefense']

function PhaseTag({ phase, size = 'sm' }) {
  const p = PHASES[phase]
  if (!p) return null
  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg font-semibold ${pad}`}
      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
      {p.short} {p.label}
    </span>
  )
}

function PhasePicker({ value, onChange, disabled }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PHASE_KEYS.map(key => {
        const p = PHASES[key]
        const active = value === key
        return (
          <button key={key} type="button" disabled={disabled}
            onClick={() => onChange(key)}
            className="flex-1 min-w-0 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150"
            style={{
              background: active ? p.color : 'var(--bg-subtle)',
              color:      active ? '#fff'    : 'var(--text-secondary)',
              border:     `1px solid ${active ? p.color : 'var(--border-light)'}`,
            }}>
            <span className="block font-bold">{p.short}</span>
            <span className="block" style={{ fontSize: 10 }}>{p.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function DurationPicker({ value, onChange, phaseKey }) {
  const color = PHASES[phaseKey]?.color ?? '#c9a84c'
  return (
    <div className="flex gap-2">
      {[30, 45, 60, 90, 120].map(m => (
        <button key={m} type="button"
          onClick={() => onChange(m)}
          className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-150"
          style={{
            background: value === m ? color : 'var(--bg-subtle)',
            color:      value === m ? '#fff'  : 'var(--text-secondary)',
            border:     `1px solid ${value === m ? color : 'var(--border-light)'}`,
          }}>
          {m < 60 ? `${m}m` : `${m / 60}h`}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Defenses() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [defenses,    setDefenses]    = useState([])
  const [groups,      setGroups]      = useState([])
  const [panelUsers,  setPanelUsers]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState(null)
  const [togglingId,  setTogglingId]  = useState(null)
  const [phaseFilter, setPhaseFilter] = useState('All')

  // Create modal
  const [showCreate,  setShowCreate]  = useState(false)
  const [createError, setCreateError] = useState('')
  const [creating,    setCreating]    = useState(false)
  const [form, setForm] = useState({
    groupId: '', date: '', time: '', venue: '',
    phase: 'TitleDefense', durationMinutes: 60, panelistIds: [],
  })

  // Edit modal
  const [showEdit,   setShowEdit]   = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm,   setEditForm]   = useState({
    date: '', time: '', venue: '',
    phase: 'TitleDefense', durationMinutes: 60, panelistIds: [],
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState('')

  // Cancel confirm
  const [cancelTarget,  setCancelTarget]  = useState(null)
  const [cancelling,    setCancelling]    = useState(false)

  // Criteria panel
  const [showCriteria, setShowCriteria] = useState(false)
  const [criteriaList, setCriteriaList] = useState([])
  const [newCrit, setNewCrit] = useState({ name: '', description: '', weight: '', maxScore: '100' })
  const [critSaving, setCritSaving] = useState(false)
  const [critError,  setCritError]  = useState('')

  const isAdmin   = ['Admin', 'SuperAdmin'].includes(user?.role)
  const isFaculty = user?.role === 'Faculty'

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        let defs = []
        if (isAdmin) {
          defs = await defenseService.list()
        } else if (isFaculty) {
          const [panelDefs, grps] = await Promise.all([
            defenseService.mySchedules().catch(() => []),
            groupService.list().catch(() => []),
          ])
          const adviserDefs = (await Promise.all(
            grps.map(g => defenseService.byGroup(g.id).catch(() => []))
          )).flat()
          const seen = new Set()
          defs = [...panelDefs, ...adviserDefs].filter(d => {
            if (seen.has(d.id)) return false
            seen.add(d.id); return true
          })
        } else {
          const grp = await groupService.myGroup().catch(() => null)
          if (grp) defs = await defenseService.byGroup(grp.id).catch(() => [])
        }
        setDefenses(defs ?? [])

        if (isAdmin) {
          const [grps, allUsers, crit] = await Promise.all([
            groupService.list().catch(() => []),
            authService.allUsers().catch(() => []),
            defenseService.criteria().catch(() => []),
          ])
          setGroups(grps.filter(g => g.status === 'Active'))
          setPanelUsers(allUsers.filter(u => u.role === 'Faculty'))
          setCriteriaList(crit)
        } else if (isFaculty) {
          const crit = await defenseService.criteria().catch(() => [])
          setCriteriaList(crit)
        }
      } catch {
        setDefenses([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin, isFaculty, user?.role])

  // ── Filtered view ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const base = phaseFilter === 'All' ? defenses : defenses.filter(d => d.phase === phaseFilter)
    const active = base.filter(d => d.status === 'Scheduled' || d.status === 'Rescheduled')
    const past   = base.filter(d => d.status !== 'Scheduled' && d.status !== 'Rescheduled')
    return { active, past }
  }, [defenses, phaseFilter])

  const phaseCounts = useMemo(() => {
    const counts = { All: defenses.length }
    PHASE_KEYS.forEach(k => { counts[k] = defenses.filter(d => d.phase === k).length })
    return counts
  }, [defenses])

  // ── Create ────────────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault()
    if (!form.groupId || !form.date || !form.venue) {
      setCreateError('Group, date, and venue are required.')
      return
    }
    setCreating(true); setCreateError('')
    try {
      const created = await defenseService.create({
        capstoneGroupId:   parseInt(form.groupId),
        scheduledDateTime: `${form.date}T${form.time || '08:00'}:00`,
        venue:             form.venue,
        phase:             form.phase,
        durationMinutes:   form.durationMinutes,
        panelistIds:       form.panelistIds,
      })
      setDefenses(prev => [...prev, created])
      setShowCreate(false)
      setForm({ groupId: '', date: '', time: '', venue: '', phase: 'TitleDefense', durationMinutes: 60, panelistIds: [] })
      toast.success('Defense scheduled.')
    } catch (err) {
      setCreateError(err.message || 'Failed to schedule defense.')
      toast.error(err.message || 'Failed to schedule defense.')
    } finally {
      setCreating(false)
    }
  }

  // ── Edit ──────────────────────────────────────────────────────────────────
  function openEdit(defense, e) {
    e.stopPropagation()
    const dt = defense.scheduledDateTime ? new Date(defense.scheduledDateTime) : null
    setEditTarget(defense)
    setEditForm({
      date:            dt ? dt.toLocaleDateString('en-CA') : '',
      time:            dt ? dt.toTimeString().slice(0, 5)  : '',
      venue:           defense.venue ?? '',
      phase:           defense.phase ?? 'TitleDefense',
      durationMinutes: defense.durationMinutes ?? 60,
      panelistIds:     (defense.panelists ?? []).map(p => p.id),
    })
    setEditError('')
    setShowEdit(true)
  }

  async function handleEdit(e) {
    e.preventDefault()
    if (!editForm.date || !editForm.venue) {
      setEditError('Date and venue are required.')
      return
    }
    setEditSaving(true); setEditError('')
    try {
      const updated = await defenseService.update(editTarget.id, {
        scheduledDateTime: `${editForm.date}T${editForm.time || '08:00'}:00`,
        venue:             editForm.venue,
        phase:             editForm.phase,
        durationMinutes:   editForm.durationMinutes,
        panelistIds:       editForm.panelistIds,
      })
      setDefenses(prev => prev.map(d => d.id === updated.id ? updated : d))
      setShowEdit(false)
      toast.success('Defense updated.')
    } catch (err) {
      setEditError(err.message || 'Failed to update.')
      toast.error(err.message || 'Failed to update defense.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────────────
  async function handleCancel() {
    if (!cancelTarget) return
    setCancelling(true)
    try {
      await defenseService.cancel(cancelTarget.id)
      setDefenses(prev => prev.map(d => d.id === cancelTarget.id ? { ...d, status: 'Cancelled' } : d))
      if (selected?.id === cancelTarget.id) setSelected(s => ({ ...s, status: 'Cancelled' }))
      setCancelTarget(null)
      toast.success('Defense cancelled.')
    } catch (err) {
      toast.error(err?.message || 'Failed to cancel defense.')
    } finally {
      setCancelling(false)
    }
  }

  // ── Rating toggle ─────────────────────────────────────────────────────────
  async function toggleRating(defense, e) {
    e.stopPropagation()
    setTogglingId(defense.id)
    const wasOpen = defense.isRatingOpen
    try {
      await defenseService.setRatingStatus(defense.id, !wasOpen)
      setDefenses(prev => prev.map(d => d.id === defense.id ? { ...d, isRatingOpen: !d.isRatingOpen } : d))
      if (selected?.id === defense.id) setSelected(s => ({ ...s, isRatingOpen: !s.isRatingOpen }))
      toast.success(wasOpen ? 'Rating locked.' : 'Rating opened.')
    } catch (err) {
      toast.error(err?.message || 'Failed to toggle rating status.')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Criteria ──────────────────────────────────────────────────────────────
  async function handleAddCriterion(e) {
    e.preventDefault()
    const w  = parseFloat(newCrit.weight)
    const ms = parseInt(newCrit.maxScore)
    if (!newCrit.name.trim())                          { setCritError('Name is required.');          return }
    if (!newCrit.weight || isNaN(w) || w <= 0 || w > 100) { setCritError('Weight must be 0.01–100.'); return }
    if (!newCrit.maxScore || isNaN(ms) || ms < 1)     { setCritError('Max score must be ≥ 1.');    return }
    setCritSaving(true); setCritError('')
    try {
      const created = await defenseService.createCriterion({
        name:        newCrit.name.trim(),
        description: newCrit.description.trim() || null,
        weight:      w,
        maxScore:    ms,
      })
      setCriteriaList(prev => [...prev, created])
      setNewCrit({ name: '', description: '', weight: '', maxScore: '100' })
      toast.success('Criterion added.')
    } catch (err) {
      setCritError(err.message || 'Failed to create criterion.')
      toast.error(err.message || 'Failed to add criterion.')
    } finally {
      setCritSaving(false)
    }
  }

  function togglePanelist(id, setFormFn) {
    setFormFn(f => ({
      ...f,
      panelistIds: f.panelistIds.includes(id)
        ? f.panelistIds.filter(x => x !== id)
        : [...f.panelistIds, id],
    }))
  }

  if (loading) return <><TopBar title="Defense Schedules" /><PageLoader /></>

  const totalWeight = criteriaList.reduce((s, c) => s + Number(c.weight), 0)

  return (
    <div>
      <TopBar
        title="Defense Schedules"
        subtitle={`${filtered.active.length} upcoming · ${filtered.past.length} completed`}
      />
      <div className="p-4 sm:p-8">

        {/* ── Admin info banner ─────────────────────────────────────────── */}
        {isAdmin && (
          <div className="mb-5 p-4 rounded-xl text-sm flex items-start gap-3"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <ToggleRight size={16} style={{ color: '#c9a84c', marginTop: 2, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Schedule defenses for each phase, assign panelists, and toggle the rating lock.
              When open, faculty panelists can submit scores. When locked, grades are immutable.
            </span>
          </div>
        )}

        {/* ── Criteria panel ────────────────────────────────────────────── */}
        {isAdmin && (
          <div className="mb-6 rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)' }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left"
              onClick={() => setShowCriteria(s => !s)}>
              <div className="flex items-center gap-2.5">
                <Scale size={15} style={{ color: '#c9a84c' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
                  Rating Criteria
                </span>
                {criteriaList.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                    {criteriaList.length} · {totalWeight.toFixed(0)}% total
                  </span>
                )}
                {totalWeight > 0 && totalWeight !== 100 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
                    weights ≠ 100%
                  </span>
                )}
              </div>
              {showCriteria
                ? <ChevronUp  size={15} style={{ color: 'var(--text-muted)' }} />
                : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />}
            </button>

            {showCriteria && (
              <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-main)' }}>
                {criteriaList.length === 0 ? (
                  <p className="text-sm italic py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No criteria yet — add one so panelists can rate defenses.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2 mb-5">
                    {criteriaList.map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{c.name}</p>
                          {c.description && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-3 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                            {Number(c.weight).toFixed(0)}% weight
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {c.maxScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4" style={{ borderTop: '1px dashed var(--border-main)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Add Criterion
                  </p>
                  {critError && (
                    <div className="mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
                      style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                      <AlertCircle size={13} /> {critError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Name *</label>
                      <input type="text" className="form-input" placeholder="e.g. Technical Depth"
                        value={newCrit.name}
                        onChange={e => setNewCrit(n => ({ ...n, name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Description</label>
                      <input type="text" className="form-input" placeholder="Optional"
                        value={newCrit.description}
                        onChange={e => setNewCrit(n => ({ ...n, description: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        Weight (%) * — remaining: {Math.max(0, 100 - totalWeight).toFixed(0)}%
                      </label>
                      <input type="number" className="form-input" placeholder="e.g. 25"
                        min="0.01" max="100" step="0.5"
                        value={newCrit.weight}
                        onChange={e => setNewCrit(n => ({ ...n, weight: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Max Score *</label>
                      <input type="number" className="form-input" placeholder="100"
                        min="1" max="100"
                        value={newCrit.maxScore}
                        onChange={e => setNewCrit(n => ({ ...n, maxScore: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn-primary text-sm" onClick={handleAddCriterion} disabled={critSaving}>
                    <Plus size={13} /> {critSaving ? 'Adding…' : 'Add Criterion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Phase filter + action row ─────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {['All', ...PHASE_KEYS].map(key => {
            const p   = key !== 'All' ? PHASES[key] : null
            const cnt = phaseCounts[key] ?? 0
            const active = phaseFilter === key
            return (
              <button
                key={key}
                onClick={() => setPhaseFilter(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{
                  background: active ? (p?.color ?? 'var(--text-primary)') : 'var(--bg-subtle)',
                  color:      active ? '#fff' : 'var(--text-secondary)',
                  border:     `1px solid ${active ? (p?.color ?? 'var(--text-primary)') : 'var(--border-light)'}`,
                }}>
                {p && (
                  <span className="text-xs font-bold opacity-80">{p.short}</span>
                )}
                {key === 'All' ? 'All Phases' : p?.label}
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg-card)', color: active ? '#fff' : 'var(--text-muted)' }}>
                  {cnt}
                </span>
              </button>
            )
          })}

          {isAdmin && (
            <button className="btn-primary ml-auto" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> Schedule Defense
            </button>
          )}
        </div>

        {/* ── Faculty criteria info ─────────────────────────────────────── */}
        {isFaculty && criteriaList.length > 0 && (
          <div className="mb-5 text-xs flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
            <Scale size={12} />
            {criteriaList.length} rating criteria · {totalWeight.toFixed(0)}% total weight
          </div>
        )}

        {/* ── Defense list ──────────────────────────────────────────────── */}
        {defenses.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No defenses scheduled"
            description="Defense schedules will appear here once they are created."
            action={isAdmin && (
              <button className="btn-primary" onClick={() => setShowCreate(true)}>
                <Plus size={15} /> Schedule Defense
              </button>
            )}
          />
        ) : filtered.active.length === 0 && filtered.past.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={`No ${phaseFilter === 'All' ? '' : PHASES[phaseFilter]?.label + ' '}defenses`}
            description="No defense schedules match this phase filter."
          />
        ) : (
          <>
            {filtered.active.length > 0 && (
              <section className="mb-8">
                <h2 className="font-display font-semibold text-lg mb-4"
                  style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
                  Upcoming
                </h2>
                <div className="space-y-3">
                  {filtered.active.map(d => (
                    <DefenseCard
                      key={d.id}
                      defense={d}
                      isFaculty={isFaculty}
                      isAdmin={isAdmin}
                      toggling={togglingId === d.id}
                      onView={() => setSelected(d)}
                      onToggleRating={e => toggleRating(d, e)}
                      onRate={() => navigate('/ratings')}
                      onEdit={e => openEdit(d, e)}
                      onCancel={e => { e.stopPropagation(); setCancelTarget(d) }}
                    />
                  ))}
                </div>
              </section>
            )}

            {filtered.past.length > 0 && (
              <section>
                <h2 className="font-display font-semibold text-lg mb-4"
                  style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
                  Completed / Cancelled
                </h2>
                <div className="space-y-3">
                  {filtered.past.map(d => (
                    <DefenseCard
                      key={d.id}
                      defense={d}
                      isFaculty={isFaculty}
                      isAdmin={isAdmin}
                      toggling={togglingId === d.id}
                      onView={() => setSelected(d)}
                      onToggleRating={e => toggleRating(d, e)}
                      onRate={() => navigate('/ratings')}
                      onEdit={e => openEdit(d, e)}
                      onCancel={null}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ── Detail modal ─────────────────────────────────────────────────── */}
      <Modal
        open={!!selected && !showCreate && !showEdit}
        onClose={() => setSelected(null)}
        title="Defense Details"
        size="md"
        footer={
          <>
            {isAdmin && selected && (selected.status === 'Scheduled' || selected.status === 'Rescheduled') && (
              <button
                className="mr-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{ color: '#dc2626', background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}
                onClick={() => { setCancelTarget(selected); setSelected(null) }}>
                <Trash2 size={12} /> Cancel Defense
              </button>
            )}
            <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: PHASES[selected.phase]?.bg ?? 'var(--bg-subtle)', border: `1px solid ${PHASES[selected.phase]?.border ?? 'var(--border-light)'}` }}>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base" style={{ color: 'var(--text-heading)' }}>{selected.groupName}</p>
                {selected.academicYear && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.academicYear}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <PhaseTag phase={selected.phase} />
                  <Badge variant={statusVariant(selected.status)} size="sm">{selected.status}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoBox icon={<Calendar size={14} />} label="Date & Time"
                value={new Date(selected.scheduledDateTime).toLocaleString('en-PH', {
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })} />
              <InfoBox icon={<MapPin size={14} />} label="Venue" value={selected.venue} />
              <InfoBox icon={<Clock size={14} />} label="Duration" value={`${selected.durationMinutes ?? 60} minutes`} />
              <InfoBox icon={<Users size={14} />} label="Panelists" value={`${selected.panelists?.length ?? 0} assigned`} />
            </div>

            <div className="rounded-xl p-3.5 flex items-center justify-between"
              style={{
                background: selected.isRatingOpen ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${selected.isRatingOpen ? '#bbf7d0' : '#fecaca'}`,
              }}>
              <div className="flex items-center gap-2">
                {selected.isRatingOpen
                  ? <Unlock size={14} style={{ color: '#16a34a' }} />
                  : <Lock   size={14} style={{ color: '#dc2626' }} />}
                <span className="text-sm font-medium" style={{ color: selected.isRatingOpen ? '#16a34a' : '#dc2626' }}>
                  {selected.isRatingOpen ? 'Rating open — panelists can submit grades' : 'Rating locked — grades are immutable'}
                </span>
              </div>
              {isAdmin && (selected.status === 'Scheduled' || selected.status === 'Rescheduled') && (
                <button
                  onClick={e => toggleRating(selected, e)}
                  disabled={togglingId === selected.id}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{
                    background: selected.isRatingOpen ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                    color: selected.isRatingOpen ? '#dc2626' : '#16a34a',
                    border: `1px solid ${selected.isRatingOpen ? '#fecaca' : '#bbf7d0'}`,
                  }}>
                  {selected.isRatingOpen ? <><Lock size={11} /> Lock</> : <><Unlock size={11} /> Open</>}
                </button>
              )}
            </div>

            {selected.panelists?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Panel Members
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.panelists.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}>
                      <Users size={11} style={{ color: 'var(--text-muted)' }} />
                      {p.fullName ?? p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isFaculty && selected.isRatingOpen && (
              <div className="pt-2 flex justify-end">
                <button className="btn-primary" onClick={() => { setSelected(null); navigate('/ratings') }}>
                  <Star size={14} /> Rate This Defense
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Create modal ─────────────────────────────────────────────────── */}
      <Modal
        open={showCreate}
        onClose={() => { if (!creating) { setShowCreate(false); setCreateError('') } }}
        title="Schedule Defense"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowCreate(false); setCreateError('') }} disabled={creating}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Scheduling…' : 'Schedule Defense'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && (
            <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
              style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertCircle size={13} /> {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Defense Phase *</label>
            <PhasePicker value={form.phase} onChange={v => setForm(f => ({ ...f, phase: v }))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group *</label>
            <select className="form-input" value={form.groupId}
              onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}>
              <option value="">Select a capstone group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.groupName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date *</label>
              <input type="date" className="form-input" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Start Time</label>
              <input type="time" className="form-input" value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Venue / Room *</label>
            <input type="text" className="form-input" placeholder="e.g. Room 301, Conference Hall"
              value={form.venue}
              onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Duration</label>
            <DurationPicker value={form.durationMinutes} phaseKey={form.phase}
              onChange={v => setForm(f => ({ ...f, durationMinutes: v }))} />
          </div>

          {panelUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Panelists
                {form.panelistIds.length > 0 && (
                  <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-md"
                    style={{ background: PHASES[form.phase]?.bg, color: PHASES[form.phase]?.color }}>
                    {form.panelistIds.length} selected
                  </span>
                )}
              </label>
              <PanelistPicker users={panelUsers} selected={form.panelistIds}
                onToggle={id => togglePanelist(id, setForm)}
                accent={PHASES[form.phase]?.color} />
            </div>
          )}
        </div>
      </Modal>

      {/* ── Edit modal ───────────────────────────────────────────────────── */}
      <Modal
        open={showEdit}
        onClose={() => { if (!editSaving) { setShowEdit(false); setEditError('') } }}
        title={`Edit — ${editTarget?.groupName ?? ''}`}
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowEdit(false); setEditError('') }} disabled={editSaving}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleEdit} disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-4">
            {editError && (
              <div className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                <AlertCircle size={13} /> {editError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Defense Phase</label>
              <PhasePicker value={editForm.phase} onChange={v => setEditForm(f => ({ ...f, phase: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date *</label>
                <input type="date" className="form-input" value={editForm.date}
                  onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Start Time</label>
                <input type="time" className="form-input" value={editForm.time}
                  onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Venue / Room *</label>
              <input type="text" className="form-input" placeholder="e.g. Room 301"
                value={editForm.venue}
                onChange={e => setEditForm(f => ({ ...f, venue: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Duration</label>
              <DurationPicker value={editForm.durationMinutes} phaseKey={editForm.phase}
                onChange={v => setEditForm(f => ({ ...f, durationMinutes: v }))} />
            </div>

            {panelUsers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Panelists
                  {editForm.panelistIds.length > 0 && (
                    <span className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-md"
                      style={{ background: PHASES[editForm.phase]?.bg, color: PHASES[editForm.phase]?.color }}>
                      {editForm.panelistIds.length} selected
                    </span>
                  )}
                </label>
                <PanelistPicker users={panelUsers} selected={editForm.panelistIds}
                  onToggle={id => togglePanelist(id, setEditForm)}
                  accent={PHASES[editForm.phase]?.color} />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Cancel confirm modal ─────────────────────────────────────────── */}
      <Modal
        open={!!cancelTarget}
        onClose={() => { if (!cancelling) setCancelTarget(null) }}
        title="Cancel Defense?"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCancelTarget(null)} disabled={cancelling}>Keep</button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#dc2626', color: '#fff' }}>
              {cancelling ? 'Cancelling…' : 'Yes, Cancel It'}
            </button>
          </>
        }
      >
        {cancelTarget && (
          <div className="space-y-3">
            <div className="rounded-xl p-3.5"
              style={{ background: PHASES[cancelTarget.phase]?.bg ?? 'var(--bg-subtle)', border: `1px solid ${PHASES[cancelTarget.phase]?.border ?? 'var(--border-light)'}` }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{cancelTarget.groupName}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {PHASES[cancelTarget.phase]?.label} · {new Date(cancelTarget.scheduledDateTime).toLocaleString('en-PH', {
                  weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This defense will be marked as cancelled. The group, adviser, and panelists will be notified.
              You can reschedule it afterwards if needed.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── DefenseCard ───────────────────────────────────────────────────────────────
function DefenseCard({ defense, isFaculty, isAdmin, toggling, onView, onToggleRating, onRate, onEdit, onCancel }) {
  const isActive    = defense.status === 'Scheduled' || defense.status === 'Rescheduled'
  const isCancelled = defense.status === 'Cancelled'
  const p = PHASES[defense.phase]

  const dateStr = defense.scheduledDateTime
    ? new Date(defense.scheduledDateTime).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const timeStr = defense.scheduledDateTime
    ? new Date(defense.scheduledDateTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    : '—'
  const day = defense.scheduledDateTime ? new Date(defense.scheduledDateTime).getDate() : '—'
  const mon = defense.scheduledDateTime
    ? new Date(defense.scheduledDateTime).toLocaleString('en-PH', { month: 'short' }).toUpperCase()
    : '—'

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-150"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isActive && p ? p.border : 'var(--border-light)'}`,
        opacity: isCancelled ? 0.6 : 1,
      }}
      onClick={onView}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Date badge + info */}
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center shrink-0"
            style={{ background: isActive && p ? p.bg : 'var(--bg-subtle)', border: `1px solid ${isActive && p ? p.border : 'var(--border-light)'}` }}
          >
            <p className="text-xs font-bold leading-none" style={{ color: isActive && p ? p.color : 'var(--text-muted)', fontSize: 9 }}>{mon}</p>
            <p className="text-xl font-display font-semibold leading-none mt-0.5"
              style={{ color: isActive && p ? p.color : 'var(--text-secondary)' }}>{day}</p>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{defense.groupName}</p>
              {p && <PhaseTag phase={defense.phase} />}
              <Badge variant={statusVariant(defense.status)} size="sm">{defense.status}</Badge>
              {isActive && (
                defense.isRatingOpen
                  ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                      <Unlock size={10} /> Open
                    </span>
                  : <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}>
                      <Lock size={10} /> Locked
                    </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-3 sm:gap-4">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} /> {timeStr} · {defense.durationMinutes ?? 60}min
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={11} /> {defense.venue}
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Users size={11} /> {defense.panelists?.length ?? 0} panelist{defense.panelists?.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
          {isAdmin && isActive && (
            <>
              <button
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}
                onClick={onEdit}
                onMouseEnter={e => { e.currentTarget.style.color = p?.color ?? '#c9a84c'; e.currentTarget.style.borderColor = p?.border ?? 'rgba(201,168,76,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-main)' }}>
                <Pencil size={11} /> Edit
              </button>
              <button
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                style={{ background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)' }}
                onClick={onCancel}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}>
                <Trash2 size={11} /> Cancel
              </button>
              <button
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5"
                style={{
                  background: defense.isRatingOpen ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)',
                  color:      defense.isRatingOpen ? '#dc2626' : '#16a34a',
                  border: `1px solid ${defense.isRatingOpen ? '#fecaca' : '#bbf7d0'}`,
                  opacity: toggling ? 0.5 : 1,
                }}
                onClick={onToggleRating}
                disabled={toggling}>
                {defense.isRatingOpen ? <><Lock size={12} /> Lock</> : <><Unlock size={12} /> Open Rating</>}
              </button>
            </>
          )}
          {isFaculty && isActive && (
            defense.isRatingOpen
              ? <button className="btn-primary text-xs px-3 py-1.5"
                  onClick={e => { e.stopPropagation(); onRate() }}>
                  <Star size={13} /> Rate
                </button>
              : <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Rating locked</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function InfoBox({ icon, label, value }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
      <div className="flex items-center gap-1.5 mb-1">
        <span style={{ color: '#c9a84c' }}>{icon}</span>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

function PanelistPicker({ users, selected, onToggle, accent = '#c9a84c' }) {
  return (
    <div className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-light)', maxHeight: 180, overflowY: 'auto' }}>
      {users.map((u, i) => {
        const checked = selected.includes(u.id)
        return (
          <label key={u.id}
            className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
            style={{
              borderTop: i > 0 ? '1px solid var(--border-light)' : 'none',
              background: checked ? `color-mix(in srgb, ${accent} 8%, transparent)` : 'transparent',
              transition: 'background 0.1s',
            }}>
            <input type="checkbox" checked={checked} onChange={() => onToggle(u.id)}
              style={{ accentColor: accent }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.fullName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
            </div>
          </label>
        )
      })}
    </div>
  )
}
