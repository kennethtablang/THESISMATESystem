import { useState, useEffect } from 'react'
import { Calendar, Plus, CheckCircle, XCircle, Clock, MapPin, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from '../../utils/toast'
import TopBar from '../../components/layout/TopBar'
import { consultationScheduleService } from '../../services/api'

const statusColors = {
  Open: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  Full: { bg: 'rgba(245,158,11,0.1)', text: '#d97706' },
  Closed: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' },
  Cancelled: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
}

const requestStatusColors = {
  Pending: { bg: 'rgba(245,158,11,0.1)', text: '#d97706' },
  Approved: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  Rejected: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
}

function RequestList({ scheduleId, onRespond }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    consultationScheduleService.getRequests(scheduleId).then(setRequests).finally(() => setLoading(false))
  }, [scheduleId])

  async function respond(requestId, status, notes) {
    try {
      const updated = await consultationScheduleService.respond(requestId, { status, responseNotes: notes })
      setRequests(prev => prev.map(r => r.id === requestId ? updated : r))
      onRespond()
      toast.success(status === 'Approved' ? 'Request approved.' : 'Request rejected.')
    } catch (err) {
      toast.error(err?.message || 'Failed to respond to request.')
    }
  }

  if (loading) return <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Loading requests...</p>
  if (requests.length === 0) return <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No requests yet.</p>

  return (
    <ul className="space-y-2 mt-3">
      {requests.map(r => {
        const sc = requestStatusColors[r.status] ?? requestStatusColors.Pending
        return (
          <li key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{r.groupName}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>By {r.requestedBy?.fullName} • {new Date(r.requestedAt).toLocaleDateString()}</p>
              {r.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Note: {r.notes}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>{r.statusLabel}</span>
              {r.status === 'Pending' && (
                <>
                  <button className="btn-ghost px-2 py-1" style={{ color: '#16a34a' }} onClick={() => respond(r.id, 'Approved', '')}>
                    <CheckCircle size={15} />
                  </button>
                  <button className="btn-ghost px-2 py-1" style={{ color: '#dc2626' }} onClick={() => respond(r.id, 'Rejected', '')}>
                    <XCircle size={15} />
                  </button>
                </>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default function ConsultationManager() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', location: '', mode: 'InPerson',
    scheduledStartAt: '', scheduledEndAt: '', maxGroups: 5,
  })

  useEffect(() => {
    consultationScheduleService.mySchedules().then(setSchedules).finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const schedule = await consultationScheduleService.create({
        ...form, maxGroups: Number(form.maxGroups),
        scheduledStartAt: new Date(form.scheduledStartAt).toISOString(),
        scheduledEndAt: new Date(form.scheduledEndAt).toISOString(),
      })
      setSchedules(prev => [schedule, ...prev])
      setForm({ title: '', description: '', location: '', mode: 'InPerson', scheduledStartAt: '', scheduledEndAt: '', maxGroups: 5 })
      setShowForm(false)
      toast.success('Consultation schedule created.')
    } catch (err) {
      toast.error(err?.message || 'Failed to create schedule.')
    } finally { setSubmitting(false) }
  }

  async function reload() {
    const fresh = await consultationScheduleService.mySchedules()
    setSchedules(fresh)
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div></div>
  }

  return (
    <>
      <TopBar title="Consultation Manager" subtitle="Create and manage consultation slots" />
      <div className="p-4 sm:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">Consultation Schedules</h2>
            <p className="page-subtitle">Manage consultation slots and respond to student requests</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}><Plus size={16} />New Schedule</button>
        </div>

        {showForm && (
          <div className="card mb-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Create Consultation Schedule</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title *</label>
                  <input className="form-input" placeholder="e.g. Weekly Consultation – Group A & B" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                  <textarea className="form-input" rows={2} placeholder="Additional details..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Start *</label>
                  <input type="datetime-local" className="form-input" value={form.scheduledStartAt} onChange={e => setForm(f => ({...f, scheduledStartAt: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>End *</label>
                  <input type="datetime-local" className="form-input" value={form.scheduledEndAt} onChange={e => setForm(f => ({...f, scheduledEndAt: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Location *</label>
                  <input className="form-input" placeholder="e.g. Room 205 / Google Meet" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Mode</label>
                  <select className="form-input" value={form.mode} onChange={e => setForm(f => ({...f, mode: e.target.value}))}>
                    <option value="InPerson">In-Person</option>
                    <option value="Online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Max Groups</label>
                  <input type="number" min={1} max={20} className="form-input" value={form.maxGroups} onChange={e => setForm(f => ({...f, maxGroups: e.target.value}))} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Schedule'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {schedules.length === 0 ? (
          <div className="card text-center py-12">
            <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No schedules created yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {schedules.map(s => {
              const sc = statusColors[s.status] ?? statusColors.Open
              return (
                <div key={s.id} className="card">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)' }}>
                        <span className="text-xs font-bold" style={{ color: '#0a1628' }}>{new Date(s.scheduledStartAt).toLocaleDateString('en', { month: 'short' })}</span>
                        <span className="text-lg font-bold" style={{ color: '#0a1628' }}>{new Date(s.scheduledStartAt).getDate()}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>{s.title}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>{s.statusLabel}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={11} />{new Date(s.scheduledStartAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })} – {new Date(s.scheduledEndAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><MapPin size={11} />{s.location}</span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}><Users size={11} />{s.approvedCount}/{s.maxGroups} groups</span>
                        </div>
                      </div>
                    </div>
                    <button className="btn-ghost px-2" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                      {expanded === s.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                  {expanded === s.id && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>Group Requests</p>
                      <RequestList scheduleId={s.id} onRespond={reload} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
