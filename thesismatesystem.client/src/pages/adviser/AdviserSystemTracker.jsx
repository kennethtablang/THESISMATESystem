import { useState, useEffect } from 'react'
import {
  Cpu, Plus, MessageSquare, ChevronDown, ChevronUp, Send, Trash2,
  BarChart2, List, X, CheckCircle2, XCircle, Clock, Bot, ArrowUpDown,
} from 'lucide-react'
import { toast } from '../../utils/toast'
import TopBar from '../../components/layout/TopBar'
import GanttChart from '../../components/ui/GanttChart'
import ImagePreviewPanel from '../../components/ui/ImagePreviewPanel'
import { systemFeatureService, groupService } from '../../services/api'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const statusColors = {
  NotStarted:    { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', label: 'Not Started' },
  InProgress:    { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6', label: 'In Progress' },
  Completed:     { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a', label: 'Approved' },
  NeedsRevision: { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626', label: 'Needs Revision' },
}

const urgencyConfig = {
  Low:      { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a', border: '#16a34a', label: 'Low' },
  Medium:   { bg: 'rgba(234,179,8,0.12)',   text: '#ca8a04', border: '#ca8a04', label: 'Medium' },
  High:     { bg: 'rgba(234,88,12,0.12)',   text: '#ea580c', border: '#ea580c', label: 'High' },
  Critical: { bg: 'rgba(239,68,68,0.15)',   text: '#dc2626', border: '#dc2626', label: 'Critical' },
}

const testBadge = {
  NotTested: { bg: 'rgba(107,114,128,0.10)', text: '#6b7280', label: 'Not Tested' },
  Passed:    { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a', label: 'Student: Working' },
  Failed:    { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626', label: 'Student: Not Working' },
}

function CommentPanel({ featureId, currentUserId, refreshKey }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [sortDesc, setSortDesc] = useState(false)

  useEffect(() => {
    systemFeatureService.comments(featureId)
      .then(setComments)
      .finally(() => setLoading(false))
  }, [featureId, refreshKey])

  async function handleSend() {
    if (!text.trim()) return
    setSending(true)
    try {
      const c = await systemFeatureService.addComment(featureId, { content: text.trim() })
      setComments(prev => [...prev, c])
      setText('')
    } catch {
      toast.error('Failed to post comment.')
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(commentId) {
    setDeletingId(commentId)
    try {
      await systemFeatureService.deleteComment(featureId, commentId)
      setComments(prev => prev.filter(c => c.id !== commentId))
    } catch {
      toast.error('Failed to delete comment.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Loading...</p>

  const sorted = sortDesc ? [...comments].reverse() : comments

  return (
    <div className="space-y-3">
      {comments.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setSortDesc(v => !v)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}>
            <ArrowUpDown size={11} />
            {sortDesc ? 'Newest first' : 'Oldest first'}
          </button>
        </div>
      )}
      {comments.length === 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>
      )}
      {sorted.map(c => (
        <div key={c.id}>
          {c.isSystemComment ? (
            <div className="flex items-center gap-2 py-1.5 px-3 rounded-lg"
              style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
              <Bot size={13} style={{ color: '#c9a84c', flexShrink: 0 }} />
              <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>{c.content}</span>
              <span className="text-[10px] ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>
                {new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: c.authorRole === 'Faculty' ? 'linear-gradient(135deg,#c9a84c,#d4b565)' : 'linear-gradient(135deg,#3b82f6,#60a5fa)', color: c.authorRole === 'Faculty' ? '#0a1628' : '#fff' }}>
                {c.author?.fullName?.[0] ?? '?'}
              </div>
              <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.author?.fullName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                    style={{ background: c.authorRole === 'Faculty' ? 'rgba(201,168,76,0.15)' : 'rgba(59,130,246,0.12)',
                             color: c.authorRole === 'Faculty' ? '#c9a84c' : '#3b82f6' }}>
                    {c.authorRole}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</span>
                  {c.author?.id === currentUserId && (
                    <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id}
                      className="ml-auto p-1 rounded hover:bg-red-50 transition-colors"
                      title="Delete comment">
                      <Trash2 size={12} style={{ color: '#dc2626' }} />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input className="form-input py-2 text-sm flex-1" placeholder="Leave a comment..."
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend} disabled={!text.trim() || sending} className="btn-primary px-3">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

function GanttDateModal({ feature, onClose, onSave }) {
  const fmt = d => d ? new Date(d).toISOString().slice(0, 10) : ''
  const [form, setForm] = useState({
    plannedStartDate: fmt(feature.plannedStartDate),
    plannedEndDate:   fmt(feature.plannedEndDate),
    actualStartDate:  fmt(feature.actualStartDate),
    actualEndDate:    fmt(feature.actualEndDate),
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {}
      if (form.plannedStartDate) payload.plannedStartDate = form.plannedStartDate
      if (form.plannedEndDate)   payload.plannedEndDate   = form.plannedEndDate
      if (form.actualStartDate)  payload.actualStartDate  = form.actualStartDate
      if (form.actualEndDate)    payload.actualEndDate    = form.actualEndDate
      onSave(await systemFeatureService.updateDates(feature.id, payload))
      onClose()
      toast.success('Dates saved.')
    } catch {
      toast.error('Failed to save dates.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>Gantt Dates — {feature.name}</h3>
          <button onClick={onClose} className="btn-ghost px-2"><X size={16} /></button>
        </div>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Planned</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Start</label>
                <input type="date" className="form-input" value={form.plannedStartDate} onChange={e => setForm(f => ({ ...f, plannedStartDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>End</label>
                <input type="date" className="form-input" value={form.plannedEndDate} onChange={e => setForm(f => ({ ...f, plannedEndDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actual</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Start</label>
                <input type="date" className="form-input" value={form.actualStartDate} onChange={e => setForm(f => ({ ...f, actualStartDate: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>End</label>
                <input type="date" className="form-input" value={form.actualEndDate} onChange={e => setForm(f => ({ ...f, actualEndDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Dates'}</button>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FeatureCard({ feature: initial, onUpdate, onDelete, currentUserId, isPanelView = false }) {
  const [feature, setFeature] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(null)
  const [urgencyLoading, setUrgencyLoading] = useState(null)
  const [ganttOpen, setGanttOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [commentRefreshKey, setCommentRefreshKey] = useState(0)

  useEffect(() => setFeature(initial), [initial])

  const sc        = statusColors[feature.status] ?? statusColors.NotStarted
  const tb        = testBadge[feature.studentTestStatus] ?? testBadge.NotTested
  const uc        = urgencyConfig[feature.urgency] ?? urgencyConfig.Low
  const hasTested = feature.studentTestStatus !== 'NotTested'

  async function setStatus(status) {
    setReviewLoading(status)
    try {
      const updated = await systemFeatureService.update(feature.id, { status })
      setFeature(updated)
      onUpdate?.(updated)
      setCommentRefreshKey(k => k + 1)
      toast.success(status === 'Completed' ? 'Feature approved.' : status === 'NeedsRevision' ? 'Revision requested.' : 'Status updated.')
    } catch {
      toast.error('Failed to update status.')
    } finally {
      setReviewLoading(null)
    }
  }

  async function handleSetUrgency(urgency) {
    setUrgencyLoading(urgency)
    try {
      const updated = await systemFeatureService.update(feature.id, { urgency })
      setFeature(updated)
      onUpdate?.(updated)
      toast.success(`Urgency set to ${urgency}.`)
    } catch {
      toast.error('Failed to update urgency.')
    } finally {
      setUrgencyLoading(null)
    }
  }

  function handleGanttSave(updated) {
    setFeature(updated)
    onUpdate?.(updated)
  }

  const screenshotUrls = (feature.screenshots ?? []).map(s => `${API_BASE}${s.path}`)

  return (
    <>
      {ganttOpen && (
        <GanttDateModal feature={feature} onClose={() => setGanttOpen(false)} onSave={handleGanttSave} />
      )}
      {preview !== null && (
        <ImagePreviewPanel
          images={screenshotUrls}
          startIndex={preview}
          onClose={() => setPreview(null)}
        />
      )}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: feature.featureType === 'Functional' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                         color: feature.featureType === 'Functional' ? '#3b82f6' : '#8b5cf6' }}>
                {feature.featureTypeLabel}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>
                {sc.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: uc.bg, color: uc.text }}>
                {uc.label}
              </span>
              {hasTested && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: tb.bg, color: tb.text }}>
                  {feature.studentTestStatus === 'Passed' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                  {tb.label}
                </span>
              )}
              {hasTested && feature.status === 'NotStarted' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
                  style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>
                  Awaiting Review
                </span>
              )}
            </div>
            <h3 className="font-semibold mt-1.5" style={{ color: 'var(--text-heading)' }}>{feature.name}</h3>
            {feature.description && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <MessageSquare size={11} />{feature.commentCount} comment{feature.commentCount !== 1 ? 's' : ''}
              </span>
              {feature.studentTestedAt && (
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock size={11} />Student tested {new Date(feature.studentTestedAt).toLocaleDateString()}
                </span>
              )}
              {(feature.plannedStartDate || feature.plannedEndDate) && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Planned: {feature.plannedStartDate ? new Date(feature.plannedStartDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '?'}
                  {' – '}
                  {feature.plannedEndDate ? new Date(feature.plannedEndDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '?'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!isPanelView && (
              <button className="btn-ghost px-2" title="Set Gantt dates" onClick={() => setGanttOpen(true)}>
                <BarChart2 size={14} style={{ color: '#c9a84c' }} />
              </button>
            )}
            <button className="btn-ghost px-2" onClick={() => setExpanded(v => !v)}>
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {!isPanelView && (
              <button className="btn-ghost px-2" onClick={() => onDelete?.(feature.id)}>
                <Trash2 size={14} style={{ color: '#dc2626' }} />
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 space-y-5" style={{ borderTop: '1px solid var(--border-light)' }}>

            {/* ── Student Test Report ── */}
            <div className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Student Test Report
              </p>
              {!hasTested ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Student has not submitted a test report yet.</p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {feature.studentTestStatus === 'Passed'
                      ? <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                      : <XCircle size={16} style={{ color: '#dc2626' }} />}
                    <span className="text-sm font-medium" style={{ color: feature.studentTestStatus === 'Passed' ? '#16a34a' : '#dc2626' }}>
                      {feature.studentTestStatus === 'Passed' ? 'Feature is Working' : 'Feature is Not Working'}
                    </span>
                  </div>
                  {feature.studentTestNote && (
                    <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-main)' }}>
                      {feature.studentTestNote}
                    </p>
                  )}
                  {feature.screenshots?.length > 0 && (
                    <div>
                      <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                        Screenshots ({feature.screenshots.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {feature.screenshots.map((s, idx) => (
                          <img
                            key={s.id}
                            src={`${API_BASE}${s.path}`}
                            alt="Student screenshot"
                            className="h-24 w-auto rounded-xl object-contain cursor-pointer transition-opacity hover:opacity-80"
                            style={{ border: '1px solid var(--border-main)', maxWidth: 200 }}
                            onClick={() => setPreview(idx)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Urgency Level ── */}
            {!isPanelView && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Urgency Level
                </p>
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(urgencyConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => handleSetUrgency(key)}
                      disabled={urgencyLoading !== null || feature.urgency === key}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: feature.urgency === key ? cfg.bg : 'var(--bg-card)',
                        color: feature.urgency === key ? cfg.text : 'var(--text-secondary)',
                        border: `1px solid ${feature.urgency === key ? cfg.border : 'var(--border-main)'}`,
                        opacity: urgencyLoading !== null && urgencyLoading !== key ? 0.5 : 1,
                      }}>
                      {urgencyLoading === key ? 'Saving...' : cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Adviser Review Actions ── */}
            {!isPanelView && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                  Review Decision
                </p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { status: 'Completed',     label: 'Approve',          color: '#16a34a', bg: 'rgba(34,197,94,0.12)',    border: '#16a34a', icon: CheckCircle2 },
                    { status: 'NeedsRevision', label: 'Request Revision',  color: '#dc2626', bg: 'rgba(239,68,68,0.12)',   border: '#dc2626', icon: XCircle },
                    { status: 'NotStarted',    label: 'Reset',             color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: '#6b7280', icon: null },
                  ].map(({ status, label, color, bg, border, icon: Icon }) => (
                    <button
                      key={status}
                      onClick={() => setStatus(status)}
                      disabled={reviewLoading !== null || feature.status === status}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: feature.status === status ? bg : 'var(--bg-card)',
                        color: feature.status === status ? color : 'var(--text-secondary)',
                        border: `1px solid ${feature.status === status ? border : 'var(--border-main)'}`,
                        opacity: reviewLoading !== null && reviewLoading !== status ? 0.5 : 1,
                      }}>
                      {Icon && <Icon size={14} />}
                      {reviewLoading === status ? 'Saving...' : label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Panel Recommendations label (panel view only) ── */}
            {isPanelView && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <p className="text-xs" style={{ color: '#c9a84c' }}>
                  You are viewing this as a <strong>Panel Member</strong>. Use the comments below to write recommendations and solutions.
                </p>
              </div>
            )}

            {/* ── Comments ── */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Comments
              </p>
              <CommentPanel featureId={feature.id} currentUserId={currentUserId} refreshKey={commentRefreshKey} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function AdviserSystemTracker() {
  const [groups, setGroups] = useState([])
  const [panelGroupIds, setPanelGroupIds] = useState(new Set())
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('list')
  const [form, setForm] = useState({ name: '', description: '', featureType: 'Functional', sortOrder: 0 })
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('tm_user') ?? 'null')
    setCurrentUserId(user?.id ?? null)

    const isAdviserRole = user?.role === 'Faculty'

    groupService.list().then(async gs => {
      let allGroups = Array.isArray(gs) ? gs : []
      const advisedIds = new Set(allGroups.map(g => g.id))
      let panelIds = new Set()

      if (isAdviserRole) {
        try {
          const panelGs = await groupService.panelGroups()
          const panelOnly = (Array.isArray(panelGs) ? panelGs : []).filter(g => !advisedIds.has(g.id))
          panelIds = new Set(panelOnly.map(g => g.id))
          allGroups = [...allGroups, ...panelOnly]
        } catch { /* panel groups optional */ }
      }

      setPanelGroupIds(panelIds)
      setGroups(allGroups)
      if (allGroups.length > 0) {
        setSelectedGroup(allGroups[0])
        systemFeatureService.byGroup(allGroups[0].id).then(setFeatures)
      }
    }).finally(() => setLoading(false))
  }, [])

  async function loadFeatures(group) {
    setSelectedGroup(group)
    setFeatures(await systemFeatureService.byGroup(group.id))
  }

  async function handleAdd(e) {
    e.preventDefault()
    try {
      const feature = await systemFeatureService.create({
        ...form,
        capstoneGroupId: selectedGroup.id,
        sortOrder: Number(form.sortOrder),
      })
      setFeatures(prev => [...prev, feature])
      setForm({ name: '', description: '', featureType: 'Functional', sortOrder: 0 })
      setShowAdd(false)
      toast.success('Feature added.')
    } catch {
      toast.error('Failed to add feature.')
    }
  }

  function handleUpdate(updated) {
    setFeatures(prev => prev.map(f => f.id === updated.id ? updated : f))
  }

  async function handleDelete(featureId) {
    if (!confirm('Delete this feature?')) return
    try {
      await systemFeatureService.delete(featureId)
      setFeatures(prev => prev.filter(f => f.id !== featureId))
      toast.success('Feature deleted.')
    } catch {
      toast.error('Failed to delete feature.')
    }
  }

  const functional    = features.filter(f => f.featureType === 'Functional')
  const nonFunctional = features.filter(f => f.featureType === 'NonFunctional')
  const displayed     = filter === 'All' ? features : filter === 'Functional' ? functional : nonFunctional
  const pendingReview = features.filter(f => f.studentTestStatus !== 'NotTested' && f.status === 'NotStarted').length

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#c9a84c', animationDelay: `${i*0.15}s` }} />)}</div></div>
  }

  return (
    <>
      <TopBar title="System Tracker" subtitle="Manage and review capstone system features" />
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="page-title">System Feature Tracker</h2>
            <p className="page-subtitle">
              {selectedGroup ? selectedGroup.groupName : 'Select a group'}
              {pendingReview > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(201,168,76,0.2)', color: '#c9a84c' }}>
                  {pendingReview} pending review
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
              <button onClick={() => setView('list')} className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-all"
                style={{ background: view === 'list' ? 'var(--bg-card)' : 'transparent', color: view === 'list' ? 'var(--text-heading)' : 'var(--text-muted)' }}>
                <List size={14} /> List
              </button>
              <button onClick={() => setView('gantt')} className="px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-all"
                style={{ background: view === 'gantt' ? 'var(--bg-card)' : 'transparent', color: view === 'gantt' ? 'var(--text-heading)' : 'var(--text-muted)' }}>
                <BarChart2 size={14} /> Gantt
              </button>
            </div>
            {selectedGroup && view === 'list' && !panelGroupIds.has(selectedGroup?.id) && (
              <button className="btn-primary" onClick={() => setShowAdd(s => !s)}>
                <Plus size={16} />Add Feature
              </button>
            )}
          </div>
        </div>

        {/* Group selector */}
        {groups.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {groups.map(g => (
              <button key={g.id} onClick={() => loadFeatures(g)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
                style={{ background: selectedGroup?.id === g.id ? '#c9a84c' : 'var(--bg-subtle)', color: selectedGroup?.id === g.id ? '#0a1628' : 'var(--text-secondary)' }}>
                {g.groupName}
                {panelGroupIds.has(g.id) && (
                  <span className="text-[10px] px-1 rounded font-semibold"
                    style={{ background: selectedGroup?.id === g.id ? 'rgba(0,0,0,0.15)' : 'rgba(201,168,76,0.2)', color: selectedGroup?.id === g.id ? '#0a1628' : '#c9a84c' }}>
                    Panel
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {view === 'list' && (
          <>
            {showAdd && (
              <div className="card mb-6">
                <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Add System Feature</h3>
                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name *</label>
                      <input className="form-input" placeholder="Feature name" value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
                      <select className="form-input" value={form.featureType}
                        onChange={e => setForm(f => ({ ...f, featureType: e.target.value }))}>
                        <option value="Functional">Functional</option>
                        <option value="NonFunctional">Non-Functional</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                    <textarea className="form-input" rows={2} placeholder="Describe this feature..."
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary">Add Feature</button>
                    <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total',          value: features.length,                                            color: '#c9a84c' },
                { label: 'Pending Review', value: pendingReview,                                              color: '#f59e0b' },
                { label: 'Approved',       value: features.filter(f => f.status === 'Completed').length,      color: '#16a34a' },
                { label: 'Need Revision',  value: features.filter(f => f.status === 'NeedsRevision').length,  color: '#dc2626' },
              ].map(stat => (
                <div key={stat.label} className="stat-card">
                  <p className="text-2xl font-bold font-display" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2 mb-5">
              {['All', 'Functional', 'NonFunctional'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: filter === f ? '#c9a84c' : 'var(--bg-subtle)', color: filter === f ? '#0a1628' : 'var(--text-secondary)' }}>
                  {f === 'NonFunctional' ? 'Non-Functional' : f}
                </button>
              ))}
            </div>

            {displayed.length === 0 ? (
              <div className="card text-center py-12">
                <Cpu size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No features added yet</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Add features for this group to start tracking</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayed.map(feature => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    currentUserId={currentUserId}
                    isPanelView={panelGroupIds.has(selectedGroup?.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {view === 'gantt' && (
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Click any feature row to edit its planned/actual dates.
            </p>
            <GanttChart features={features} canEdit onEditDates={() => {}} />
          </div>
        )}
      </div>
    </>
  )
}
