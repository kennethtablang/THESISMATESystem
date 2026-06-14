import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, Clock, CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { consultationScheduleService, groupService } from '../../services/api'

const statusColors = {
  Open: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', label: 'Open' },
  Full: { bg: 'rgba(245,158,11,0.1)', text: '#d97706', label: 'Full' },
  Closed: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', label: 'Closed' },
  Cancelled: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', label: 'Cancelled' },
}

const requestStatusColors = {
  Pending: { bg: 'rgba(245,158,11,0.1)', text: '#d97706', icon: AlertCircle },
  Approved: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', icon: CheckCircle },
  Rejected: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', icon: XCircle },
}

export default function ConsultationCalendar() {
  const [schedules, setSchedules] = useState([])
  const [myRequests, setMyRequests] = useState([])
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(null)
  const [notes, setNotes] = useState('')
  const [tab, setTab] = useState('calendar')

  useEffect(() => {
    async function load() {
      try {
        const g = await groupService.myGroup()
        setGroup(g)
        const [all, reqs] = await Promise.all([
          consultationScheduleService.all(),
          consultationScheduleService.myGroupRequests(g.id),
        ])
        setSchedules(all)
        setMyRequests(reqs)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function handleRequest(scheduleId) {
    if (!group) return
    setRequesting(scheduleId)
    try {
      const req = await consultationScheduleService.requestSlot({
        consultationScheduleId: scheduleId,
        capstoneGroupId: group.id,
        notes,
      })
      setMyRequests(prev => [req, ...prev])
      setNotes('')
      alert('Request submitted successfully!')
    } catch (err) {
      alert(err.message)
    } finally {
      setRequesting(null)
    }
  }

  function alreadyRequested(scheduleId) {
    return myRequests.some(r => r.consultationScheduleId === scheduleId)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Consultation Calendar" subtitle="View schedules and request a consultation slot" />
      <div className="p-8 max-w-5xl">
        <div className="flex gap-2 mb-6">
          {['calendar', 'my-requests'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: tab === t ? '#c9a84c' : 'var(--bg-subtle)',
                color: tab === t ? '#0a1628' : 'var(--text-secondary)',
              }}>
              {t === 'calendar' ? 'Consultation Schedule' : 'My Requests'}
              {t === 'my-requests' && myRequests.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.3)' }}>
                  {myRequests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'calendar' && (
          <div className="space-y-4">
            {schedules.length === 0 ? (
              <div className="card text-center py-12">
                <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No consultation slots available</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Check back later for upcoming schedules</p>
              </div>
            ) : schedules.map(s => {
              const sc = statusColors[s.status] ?? statusColors.Open
              const hasReq = alreadyRequested(s.id)
              return (
                <div key={s.id} className="card">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)' }}>
                      <span className="text-xs font-bold text-navy-900" style={{ color: '#0a1628' }}>
                        {new Date(s.scheduledStartAt).toLocaleDateString('en', { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold" style={{ color: '#0a1628' }}>
                        {new Date(s.scheduledStartAt).getDate()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>{s.title}</h3>
                          {s.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.description}</p>}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0" style={{ background: sc.bg, color: sc.text }}>
                          {s.statusLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={12} />
                          {new Date(s.scheduledStartAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                          {' - '}
                          {new Date(s.scheduledEndAt).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <MapPin size={12} />
                          {s.location} ({s.modeLabel})
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Users size={12} />
                          {s.approvedCount} / {s.maxGroups} groups
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Organized by {s.facultyIC?.fullName}
                      </p>
                    </div>
                  </div>
                  {s.status === 'Open' && !hasReq && group && (
                    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Request a slot for your group</p>
                      <div className="flex gap-2">
                        <input className="form-input py-2 text-sm" placeholder="Optional notes for the faculty..."
                          value={requesting === s.id ? notes : ''} onChange={e => { setRequesting(s.id); setNotes(e.target.value) }} />
                        <button className="btn-primary shrink-0" onClick={() => handleRequest(s.id)} disabled={requesting === s.id && !group}>
                          <Send size={14} />
                          Request
                        </button>
                      </div>
                    </div>
                  )}
                  {hasReq && (
                    <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#16a34a' }}>
                      <CheckCircle size={14} />
                      You have already submitted a request for this slot
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'my-requests' && (
          <div className="space-y-3">
            {myRequests.length === 0 ? (
              <div className="card text-center py-12">
                <Send size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No requests yet</p>
              </div>
            ) : myRequests.map(r => {
              const sc = requestStatusColors[r.status] ?? requestStatusColors.Pending
              const Icon = sc.icon
              return (
                <div key={r.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{r.scheduleTitle}</h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(r.scheduledStartAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      {r.notes && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Note: {r.notes}</p>}
                      {r.responseNotes && (
                        <p className="text-sm mt-1 p-2 rounded-lg" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                          Response: {r.responseNotes}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Requested {new Date(r.requestedAt).toLocaleDateString()}
                        {r.respondedAt && ` • Responded ${new Date(r.respondedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0" style={{ background: sc.bg, color: sc.text }}>
                      <Icon size={12} />
                      {r.statusLabel}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
