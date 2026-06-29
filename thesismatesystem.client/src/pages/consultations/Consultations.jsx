import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService, groupService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { MessageSquare, Plus, Clock, User, FileText } from 'lucide-react'
import { toast } from '../../utils/toast'

export default function Consultations() {
  const { user } = useAuth()
  const [consultations, setConsultations] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showLog, setShowLog] = useState(false)
  const [form, setForm] = useState({ groupId: '', date: '', time: '', mode: 'InPerson', discussionContent: '', outcome: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canLog = user?.role === 'Faculty'

  useEffect(() => {
    const loads = [consultationService.list().catch(() => [])]
    if (canLog) loads.push(groupService.list().catch(() => []))
    Promise.all(loads).then(([cons, grps = []]) => {
      setConsultations(cons ?? [])
      setGroups(grps)
    }).finally(() => setLoading(false))
  }, [canLog])

  async function handleLog(e) {
    e.preventDefault()
    if (!form.groupId) { setError('Please select a group.'); return }
    if (!form.date) { setError('Please enter a consultation date.'); return }
    if (!form.discussionContent.trim()) { setError('Discussion content is required.'); return }
    setSaving(true)
    setError('')
    try {
      const consultationDate = `${form.date}T${form.time || '00:00'}:00`
      const created = await consultationService.create({
        capstoneGroupId: parseInt(form.groupId),
        consultationDate,
        mode: form.mode,
        discussionContent: form.discussionContent,
        outcome: form.outcome,
      })
      setConsultations((prev) => [created, ...prev])
      setShowLog(false)
      setForm({ groupId: '', date: '', time: '', mode: 'InPerson', discussionContent: '', outcome: '' })
      toast.success('Consultation logged.')
    } catch (err) {
      setError(err.message || 'Failed to log consultation.')
      toast.error(err.message || 'Failed to log consultation.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <><TopBar title="Consultations" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title="Consultations"
        subtitle={`${consultations.length} session${consultations.length !== 1 ? 's' : ''} recorded`}
      />
      <div className="p-4 sm:p-8">
        {canLog && (
          <div className="flex justify-end mb-6">
            <button className="btn-primary" onClick={() => setShowLog(true)}>
              <Plus size={15} /> Log Consultation
            </button>
          </div>
        )}

        {consultations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No consultations yet"
            description="Consultation sessions will appear here once your adviser logs them."
          />
        ) : (
          <div className="space-y-4">
            {consultations.map((c, idx) => {
              const isFirst = idx === 0
              const dateObj = new Date(c.consultationDate)
              return (
                <div
                  key={c.id}
                  className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-150"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                  onClick={() => setSelected(c)}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div className="h-1" style={{ background: isFirst ? 'linear-gradient(90deg, #c9a84c, #d4b565)' : 'var(--border-light)' }} />
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0"
                        style={{ background: isFirst ? 'rgba(201,168,76,0.12)' : 'var(--bg-subtle)' }}
                      >
                        <p className="font-bold" style={{ color: isFirst ? '#c9a84c' : 'var(--text-muted)', fontSize: '10px' }}>
                          {dateObj.toLocaleString('en-PH', { month: 'short' }).toUpperCase()}
                        </p>
                        <p className="text-xl font-display font-bold" style={{ color: isFirst ? '#c9a84c' : 'var(--text-secondary)' }}>
                          {dateObj.getDate()}
                        </p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>{c.discussionContent}</p>
                        <div className="flex items-center flex-wrap gap-4 mb-2">
                          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Clock size={12} /> {dateObj.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {c.adviser?.fullName && (
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <User size={12} /> {c.adviser.fullName}
                            </span>
                          )}
                          {c.groupName && (
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <FileText size={12} /> {c.groupName}
                            </span>
                          )}
                        </div>
                        {c.outcome && (
                          <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            {c.outcome}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Consultation Log"
        size="md"
        footer={<button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>}
      >
        {selected && (() => {
          const selDate = new Date(selected.consultationDate)
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <p className="font-display font-semibold text-lg" style={{ color: '#c9a84c', letterSpacing: '-0.3px' }}>
                  {selected.discussionContent}
                </p>
                {selected.groupName && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{selected.groupName}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Date</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selDate.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>Time</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {selDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {selected.adviser?.fullName && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Adviser</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.adviser.fullName}</p>
                </div>
              )}

              {selected.outcome && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Session Outcome</p>
                  <div className="p-4 rounded-xl text-sm" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)', color: 'var(--text-primary)', lineHeight: '1.7' }}>
                    {selected.outcome}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </Modal>

      {/* Log Consultation Modal */}
      <Modal
        open={showLog}
        onClose={() => { setShowLog(false); setError('') }}
        title="Log Consultation"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowLog(false); setError('') }}>Cancel</button>
            <button className="btn-primary" onClick={handleLog} disabled={saving}>{saving ? 'Saving...' : 'Save Log'}</button>
          </>
        }
      >
        <div className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Mode</label>
            <select className="form-input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              <option value="InPerson">In Person</option>
              <option value="Online">Online</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Discussion Content</label>
            <input type="text" className="form-input" placeholder="What was discussed?" value={form.discussionContent} onChange={(e) => setForm({ ...form, discussionContent: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Outcome / Notes</label>
            <textarea className="form-input" rows={4} placeholder="Detailed notes and outcomes from the consultation..." value={form.outcome} onChange={(e) => setForm({ ...form, outcome: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
