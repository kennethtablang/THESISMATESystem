import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { defenseService, groupService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusVariant } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { Calendar, Clock, MapPin, Users, Plus, Star, Lock, Unlock, ToggleLeft, ToggleRight } from 'lucide-react'

export default function Defenses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [defenses, setDefenses] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [createError, setCreateError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ groupId: '', date: '', time: '', venue: '' })

  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)
  const isFacultyIC = user?.role === 'FacultyIC'
  const isPanel = user?.role === 'Panel'

  useEffect(() => {
    async function load() {
      try {
        let defs = []
        if (isAdmin || isFacultyIC) {
          defs = await defenseService.list()
        } else if (isPanel) {
          defs = await defenseService.mySchedules()
        } else if (user?.role === 'Adviser') {
          const grps = await groupService.list().catch(() => [])
          const nested = await Promise.all(grps.map(g => defenseService.byGroup(g.id).catch(() => [])))
          defs = nested.flat()
        } else {
          // Student
          const grp = await groupService.myGroup().catch(() => null)
          if (grp) defs = await defenseService.byGroup(grp.id).catch(() => [])
        }
        setDefenses(defs ?? [])
        if (isAdmin) {
          const grps = await groupService.list().catch(() => [])
          setGroups(grps)
        }
      } catch {
        setDefenses([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [isAdmin, isFacultyIC, isPanel, user?.role])

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
      })
      setDefenses((prev) => [...prev, created])
      setShowCreate(false)
      setForm({ groupId: '', date: '', time: '', venue: '' })
    } catch (err) {
      setCreateError(err.message || 'Failed to schedule defense.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleRating(defense, e) {
    e.stopPropagation()
    setTogglingId(defense.id)
    try {
      await defenseService.setRatingStatus(defense.id, !defense.isRatingOpen)
      setDefenses((prev) => prev.map((d) => d.id === defense.id ? { ...d, isRatingOpen: !d.isRatingOpen } : d))
      if (selected?.id === defense.id) setSelected((s) => ({ ...s, isRatingOpen: !s.isRatingOpen }))
    } catch {
      // silent
    } finally {
      setTogglingId(null)
    }
  }

  const upcoming = defenses.filter((d) => d.status === 'Scheduled' || d.status === 'Rescheduled')
  const past = defenses.filter((d) => d.status !== 'Scheduled' && d.status !== 'Rescheduled')

  if (loading) return <><TopBar title="Defense Schedule" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title="Defense Schedule"
        subtitle={`${upcoming.length} upcoming · ${past.length} completed`}
      />
      <div className="p-4 sm:p-8">
        {(isAdmin || isFacultyIC) && (
          <div className="mb-5 p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <ToggleRight size={16} style={{ color: '#c9a84c', marginTop: 2, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {isFacultyIC
                ? 'Toggle the rating lock on each defense. When open, Panel members can submit/edit ratings. When locked, all submitted grades are immutable.'
                : 'Admins can view and manage all defense schedules.'}
            </span>
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
                  {upcoming.map((d) => (
                    <DefenseCard
                      key={d.id}
                      defense={d}
                      isPanel={isPanel}
                      isFacultyIC={isFacultyIC || isAdmin}
                      toggling={togglingId === d.id}
                      onView={() => setSelected(d)}
                      onToggleRating={(e) => toggleRating(d, e)}
                      onRate={() => navigate('/ratings')}
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
                  {past.map((d) => (
                    <DefenseCard
                      key={d.id}
                      defense={d}
                      isPanel={isPanel}
                      isFacultyIC={isFacultyIC || isAdmin}
                      toggling={togglingId === d.id}
                      onView={() => setSelected(d)}
                      onToggleRating={(e) => toggleRating(d, e)}
                      onRate={() => navigate('/ratings')}
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
        open={!!selected && !showCreate}
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

            <div className="rounded-xl p-4 flex items-center justify-between" style={{ background: selected.isRatingOpen ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.06)', border: `1px solid ${selected.isRatingOpen ? '#bbf7d0' : '#fecaca'}` }}>
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
              {isPanel && selected.isRatingOpen && (
                <button className="btn-primary" onClick={() => { setSelected(null); navigate('/ratings') }}>
                  <Star size={14} /> Rate Defense
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Create Modal (Admin only) */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateError('') }}
        title="Schedule Defense"
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group</label>
            <select className="form-input" value={form.groupId} onChange={(e) => setForm({ ...form, groupId: e.target.value })}>
              <option value="">Select a group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.groupName ?? g.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date</label>
              <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Time</label>
              <input type="time" className="form-input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Venue</label>
            <input type="text" className="form-input" placeholder="e.g. Room 201" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DefenseCard({ defense, isPanel, isFacultyIC, toggling, onView, onToggleRating, onRate }) {
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
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
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
                <Users size={11} /> {defense.panelists?.length ?? 0} panelists
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
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
          {isPanel && !isCompleted && (
            defense.isRatingOpen
              ? <button className="btn-primary text-xs px-3 py-1.5" onClick={(e) => { e.stopPropagation(); onRate() }}><Star size={13} /> Rate</button>
              : <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Locked</span>
          )}
        </div>
      </div>
    </div>
  )
}
