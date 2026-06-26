import { useState, useEffect } from 'react'
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
  ToggleRight, Pencil, ChevronDown, ChevronUp, Scale,
} from 'lucide-react'

export default function Defenses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [defenses, setDefenses] = useState([])
  const [groups, setGroups] = useState([])
  const [panelUsers, setPanelUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  // Create
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ groupId: '', date: '', time: '', venue: '', panelistIds: [] })

  // Edit
  const [showEdit, setShowEdit] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', time: '', venue: '', panelistIds: [] })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  // Criteria
  const [showCriteria, setShowCriteria] = useState(false)
  const [criteriaList, setCriteriaList] = useState([])
  const [newCrit, setNewCrit] = useState({ name: '', description: '', weight: '', maxScore: '100' })
  const [critSaving, setCritSaving] = useState(false)
  const [critError, setCritError] = useState('')

  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)
  const isFaculty = user?.role === 'Faculty'

  useEffect(() => {
    async function load() {
      try {
        let defs = []
        if (isAdmin) {
          defs = await defenseService.list()
        } else if (isFaculty) {
          // Faculty may be panelist AND/OR adviser — load both and deduplicate
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
            seen.add(d.id)
            return true
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
          setGroups(grps)
          setPanelUsers(allUsers.filter(u => u.role === 'Faculty'))
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

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.groupId || !form.date || !form.venue) {
      setCreateError('Group, date, and venue are required.')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      const created = await defenseService.create({
        capstoneGroupId: parseInt(form.groupId),
        scheduledDateTime: `${form.date}T${form.time || '00:00'}:00`,
        venue: form.venue,
        panelistIds: form.panelistIds,
      })
      setDefenses(prev => [...prev, created])
      setShowCreate(false)
      setForm({ groupId: '', date: '', time: '', venue: '', panelistIds: [] })
    } catch (err) {
      setCreateError(err.message || 'Failed to schedule defense.')
    } finally {
      setCreating(false)
    }
  }

  function openEdit(defense, e) {
    e.stopPropagation()
    const dt = defense.scheduledDateTime ? new Date(defense.scheduledDateTime) : null
    setEditTarget(defense)
    setEditForm({
      date: dt ? dt.toISOString().slice(0, 10) : '',
      time: dt ? dt.toTimeString().slice(0, 5) : '',
      venue: defense.venue ?? '',
      panelistIds: (defense.panelists ?? []).map(p => p.id),
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
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await defenseService.update(editTarget.id, {
        scheduledDateTime: `${editForm.date}T${editForm.time || '00:00'}:00`,
        venue: editForm.venue,
        panelistIds: editForm.panelistIds,
      })
      setDefenses(prev => prev.map(d => d.id === updated.id ? updated : d))
      setShowEdit(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update.')
    } finally {
      setEditSaving(false)
    }
  }

  async function toggleRating(defense, e) {
    e.stopPropagation()
    setTogglingId(defense.id)
    try {
      await defenseService.setRatingStatus(defense.id, !defense.isRatingOpen)
      setDefenses(prev => prev.map(d => d.id === defense.id ? { ...d, isRatingOpen: !d.isRatingOpen } : d))
      if (selected?.id === defense.id) setSelected(s => ({ ...s, isRatingOpen: !s.isRatingOpen }))
    } catch {
      // silent
    } finally {
      setTogglingId(null)
    }
  }

  async function handleAddCriterion(e) {
    e.preventDefault()
    const w = parseFloat(newCrit.weight)
    const ms = parseInt(newCrit.maxScore)
    if (!newCrit.name.trim()) { setCritError('Name is required.'); return }
    if (!newCrit.weight || isNaN(w) || w <= 0 || w > 100) { setCritError('Weight must be 0.01–100.'); return }
    if (!newCrit.maxScore || isNaN(ms) || ms < 1) { setCritError('Max score must be at least 1.'); return }
    setCritSaving(true)
    setCritError('')
    try {
      const created = await defenseService.createCriterion({
        name: newCrit.name.trim(),
        description: newCrit.description.trim() || null,
        weight: w,
        maxScore: ms,
      })
      setCriteriaList(prev => [...prev, created])
      setNewCrit({ name: '', description: '', weight: '', maxScore: '100' })
    } catch (err) {
      setCritError(err.message || 'Failed to create criterion.')
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

  const upcoming = defenses.filter(d => d.status === 'Scheduled' || d.status === 'Rescheduled')
  const past = defenses.filter(d => d.status !== 'Scheduled' && d.status !== 'Rescheduled')

  if (loading) return <><TopBar title="Defense Schedule" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title="Defense Schedule"
        subtitle={`${upcoming.length} upcoming · ${past.length} completed`}
      />
      <div className="p-4 sm:p-8">

        {/* Admin info banner */}
        {isAdmin && (
          <div className="mb-5 p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <ToggleRight size={16} style={{ color: '#c9a84c', marginTop: 2, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Admins can schedule defenses, assign panelists, and toggle the rating lock. When open, Faculty panelists can submit ratings. When locked, submitted grades are immutable.
            </span>
          </div>
        )}

        {/* Criteria management (Admin/SuperAdmin) */}
        {isAdmin && (
          <div className="mb-6 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)' }}>
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
              style={{ background: showCriteria ? 'var(--bg-subtle)' : 'transparent' }}
              onClick={() => setShowCriteria(s => !s)}
            >
              <div className="flex items-center gap-2.5">
                <Scale size={15} style={{ color: '#c9a84c' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
                  Rating Criteria
                </span>
                {criteriaList.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                    {criteriaList.length}
                  </span>
                )}
              </div>
              {showCriteria ? <ChevronUp size={15} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={15} style={{ color: 'var(--text-muted)' }} />}
            </button>

            {showCriteria && (
              <div className="px-5 pb-5 border-t" style={{ borderColor: 'var(--border-main)' }}>
                {criteriaList.length === 0 ? (
                  <p className="text-sm italic py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                    No criteria yet — add one below so panel members can rate defenses.
                  </p>
                ) : (
                  <div className="mt-4 space-y-2 mb-5">
                    {criteriaList.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{c.name}</p>
                          {c.description && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-3 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                            {Number(c.weight).toFixed(0)}% weight
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {c.maxScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new criterion */}
                <div className="pt-4" style={{ borderTop: '1px dashed var(--border-main)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Add Criterion</p>
                  {critError && (
                    <div className="mb-3 px-3 py-2 rounded-lg text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                      {critError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Technical Depth"
                        value={newCrit.name}
                        onChange={e => setNewCrit(n => ({ ...n, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Description</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Optional description"
                        value={newCrit.description}
                        onChange={e => setNewCrit(n => ({ ...n, description: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Weight (%) *</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="e.g. 25"
                        min="0.01"
                        max="100"
                        step="0.5"
                        value={newCrit.weight}
                        onChange={e => setNewCrit(n => ({ ...n, weight: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Max Score *</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="100"
                        min="1"
                        max="100"
                        value={newCrit.maxScore}
                        onChange={e => setNewCrit(n => ({ ...n, maxScore: e.target.value }))}
                      />
                    </div>
                  </div>
                  <button
                    className="btn-primary text-sm"
                    onClick={handleAddCriterion}
                    disabled={critSaving}
                  >
                    <Plus size={13} /> {critSaving ? 'Adding…' : 'Add Criterion'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Criteria summary for Faculty */}
        {isFaculty && criteriaList.length > 0 && (
          <div className="mb-5 text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
            <Scale size={12} />
            {criteriaList.length} rating criteria configured · total weight {(criteriaList.reduce((s, c) => s + Number(c.weight), 0)).toFixed(0)}%
          </div>
        )}

        {isAdmin && (
          <div className="flex justify-end mb-6">
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus size={15} /> Schedule Defense
            </button>
          </div>
        )}

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
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="font-display font-semibold text-lg mb-4" style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
                  Upcoming Defenses
                </h2>
                <div className="space-y-4">
                  {upcoming.map(d => (
                    <DefenseCard
                      key={d.id}
                      defense={d}
                      isFaculty={isFaculty}
                      isFacultyIC={isAdmin}
                      isAdmin={isAdmin}
                      toggling={togglingId === d.id}
                      onView={() => setSelected(d)}
                      onToggleRating={e => toggleRating(d, e)}
                      onRate={() => navigate('/ratings')}
                      onEdit={e => openEdit(d, e)}
                    />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="font-display font-semibold text-lg mb-4" style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
                  Completed
                </h2>
                <div className="space-y-4">
                  {past.map(d => (
                    <DefenseCard
                      key={d.id}
                      defense={d}
                      isFaculty={isFaculty}
                      isFacultyIC={isAdmin}
                      isAdmin={isAdmin}
                      toggling={togglingId === d.id}
                      onView={() => setSelected(d)}
                      onToggleRating={e => toggleRating(d, e)}
                      onRate={() => navigate('/ratings')}
                      onEdit={e => openEdit(d, e)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selected && !showCreate && !showEdit}
        onClose={() => setSelected(null)}
        title="Defense Details"
        size="md"
        footer={<button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>}
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                Capstone Group
              </p>
              <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{selected.groupName}</p>
              {selected.academicYear && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.academicYear}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={14} style={{ color: '#c9a84c' }} />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Date & Time</p>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {new Date(selected.scheduledDateTime).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} style={{ color: '#c9a84c' }} />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Venue</p>
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.venue}</p>
              </div>
            </div>

            <div className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: selected.isRatingOpen ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.06)', border: `1px solid ${selected.isRatingOpen ? '#bbf7d0' : '#fecaca'}` }}>
              <div className="flex items-center gap-2">
                {selected.isRatingOpen ? <Unlock size={15} style={{ color: '#16a34a' }} /> : <Lock size={15} style={{ color: '#dc2626' }} />}
                <span className="text-sm font-medium" style={{ color: selected.isRatingOpen ? '#16a34a' : '#dc2626' }}>
                  {selected.isRatingOpen ? 'Rating Open — Panel can submit grades' : 'Rating Locked — Grades are immutable'}
                </span>
              </div>
            </div>

            {selected.panelists?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Panel Members
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.panelists.map((p, i) => (
                    <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                      <Users size={12} style={{ color: 'var(--text-muted)' }} />
                      {p.fullName ?? p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Badge variant={statusVariant(selected.status)} size="md">{selected.status}</Badge>
              {isFaculty && selected.isRatingOpen && (
                <button className="btn-primary" onClick={() => { setSelected(null); navigate('/ratings') }}>
                  <Star size={14} /> Rate Defense
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateError('') }}
        title="Schedule Defense"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowCreate(false); setCreateError('') }}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>{creating ? 'Scheduling...' : 'Schedule'}</button>
          </>
        }
      >
        <div className="space-y-4">
          {createError && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {createError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group *</label>
            <select className="form-input" value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}>
              <option value="">Select a group</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.groupName ?? g.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date *</label>
              <input type="date" className="form-input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Time</label>
              <input type="time" className="form-input" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Venue *</label>
            <input type="text" className="form-input" placeholder="e.g. Room 201" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
          </div>
          {panelUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Panel Members <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({form.panelistIds.length} selected)</span>
              </label>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-main)', maxHeight: 180, overflowY: 'auto' }}>
                {panelUsers.map((p, i) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                    style={{
                      borderTop: i > 0 ? '1px solid var(--border-main)' : 'none',
                      background: form.panelistIds.includes(p.id) ? 'rgba(201,168,76,0.06)' : 'var(--bg-card)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.panelistIds.includes(p.id)}
                      onChange={() => togglePanelist(p.id, setForm)}
                      className="rounded"
                      style={{ accentColor: '#c9a84c' }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.fullName}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={() => { setShowEdit(false); setEditError('') }}
        title="Edit Defense"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowEdit(false); setEditError('') }}>Cancel</button>
            <button className="btn-primary" onClick={handleEdit} disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</button>
          </>
        }
      >
        {editTarget && (
          <div className="space-y-4">
            <div className="px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
              {editTarget.groupName}
            </div>
            {editError && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {editError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date *</label>
                <input type="date" className="form-input" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Time</label>
                <input type="time" className="form-input" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Venue *</label>
              <input type="text" className="form-input" placeholder="e.g. Room 201" value={editForm.venue} onChange={e => setEditForm(f => ({ ...f, venue: e.target.value }))} />
            </div>
            {panelUsers.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Panel Members <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({editForm.panelistIds.length} selected)</span>
                </label>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-main)', maxHeight: 180, overflowY: 'auto' }}>
                  {panelUsers.map((p, i) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                      style={{
                        borderTop: i > 0 ? '1px solid var(--border-main)' : 'none',
                        background: editForm.panelistIds.includes(p.id) ? 'rgba(201,168,76,0.06)' : 'var(--bg-card)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editForm.panelistIds.includes(p.id)}
                        onChange={() => togglePanelist(p.id, setEditForm)}
                        className="rounded"
                        style={{ accentColor: '#c9a84c' }}
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{p.fullName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function DefenseCard({ defense, isFaculty, isFacultyIC, isAdmin, toggling, onView, onToggleRating, onRate, onEdit }) {
  const isCompleted = !['Scheduled', 'Rescheduled'].includes(defense.status)
  const dateStr = defense.scheduledDateTime
    ? new Date(defense.scheduledDateTime).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '—'
  const timeStr = defense.scheduledDateTime
    ? new Date(defense.scheduledDateTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 cursor-pointer transition-all duration-150"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        opacity: isCompleted ? 0.8 : 1,
      }}
      onClick={onView}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-center"
            style={{ background: isCompleted ? 'var(--bg-subtle)' : 'linear-gradient(135deg, #0a1628 0%, #1e3350 100%)' }}
          >
            <p className="text-xs font-medium leading-none mb-0.5" style={{ color: isCompleted ? 'var(--text-muted)' : '#c9a84c', fontSize: '10px' }}>
              {defense.scheduledDateTime ? new Date(defense.scheduledDateTime).toLocaleString('en-PH', { month: 'short' }).toUpperCase() : '—'}
            </p>
            <p className="text-xl sm:text-2xl font-display font-semibold leading-none" style={{ color: isCompleted ? 'var(--text-secondary)' : '#ffffff' }}>
              {defense.scheduledDateTime ? new Date(defense.scheduledDateTime).getDate() : '—'}
            </p>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{defense.groupName}</p>
              <Badge variant={statusVariant(defense.status)} size="sm">{defense.status}</Badge>
              {!isCompleted && (
                defense.isRatingOpen
                  ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}><Unlock size={10} /> Open</span>
                  : <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626' }}><Lock size={10} /> Locked</span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-3 sm:gap-4 mt-1">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} /> {timeStr}
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={11} /> {defense.venue}
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Users size={11} /> {defense.panelists?.length ?? 0} panel
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
          {isAdmin && !isCompleted && (
            <button
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}
              onClick={onEdit}
              onMouseEnter={e => { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-main)' }}
            >
              <Pencil size={11} /> Edit
            </button>
          )}
          {isFacultyIC && !isCompleted && (
            <button
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5"
              style={{
                background: defense.isRatingOpen ? 'rgba(239,68,68,0.08)' : 'rgba(22,163,74,0.08)',
                color: defense.isRatingOpen ? '#dc2626' : '#16a34a',
                border: `1px solid ${defense.isRatingOpen ? '#fecaca' : '#bbf7d0'}`,
                opacity: toggling ? 0.5 : 1,
              }}
              onClick={onToggleRating}
              disabled={toggling}
            >
              {defense.isRatingOpen ? <><Lock size={12} /> Lock</> : <><Unlock size={12} /> Open Rating</>}
            </button>
          )}
          {isFaculty && !isCompleted && (
            defense.isRatingOpen
              ? <button className="btn-primary text-xs px-3 py-1.5" onClick={e => { e.stopPropagation(); onRate() }}><Star size={13} /> Rate</button>
              : <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Locked</span>
          )}
        </div>
      </div>
    </div>
  )
}
