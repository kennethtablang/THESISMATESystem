import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Cpu, MessageSquare, ChevronDown, ChevronUp, BarChart2, List,
  Users, CheckCircle2, XCircle, Clock, Send, Paperclip, Trash2, Bot, ArrowUpDown,
} from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import GanttChart from '../../components/ui/GanttChart'
import { PageLoader } from '../../components/ui/Spinner'
import ImagePreviewPanel from '../../components/ui/ImagePreviewPanel'
import { systemFeatureService, groupService } from '../../services/api'
import { toast } from '../../utils/toast'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const statusColors = {
  NotStarted:    { bg: 'rgba(107,114,128,0.12)', text: '#6b7280', label: 'Not Started' },
  InProgress:    { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6', label: 'In Progress' },
  Completed:     { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a', label: 'Approved' },
  NeedsRevision: { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626', label: 'Needs Revision' },
}

const testColors = {
  NotTested: { bg: 'rgba(107,114,128,0.10)', text: '#6b7280' },
  Passed:    { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a' },
  Failed:    { bg: 'rgba(239,68,68,0.12)',   text: '#dc2626' },
}

const urgencyConfig = {
  Low:      { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a', label: 'Low' },
  Medium:   { bg: 'rgba(234,179,8,0.12)',  text: '#ca8a04', label: 'Medium' },
  High:     { bg: 'rgba(234,88,12,0.12)',  text: '#ea580c', label: 'High' },
  Critical: { bg: 'rgba(239,68,68,0.15)', text: '#dc2626', label: 'Critical' },
}

function CommentThread({ featureId, currentUserId, refreshKey }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [sortDesc, setSortDesc] = useState(false)

  useEffect(() => {
    systemFeatureService.comments(featureId)
      .then(setComments)
      .finally(() => setLoaded(true))
  }, [featureId, refreshKey])

  async function send() {
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

  if (!loaded) return <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>Loading...</p>

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
                style={{ background: c.authorRole === 'Faculty' ? 'linear-gradient(135deg,#c9a84c,#d4b565)' : 'linear-gradient(135deg,#3b82f6,#60a5fa)', color: '#fff' }}>
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
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} />
        <button onClick={send} disabled={!text.trim() || sending} className="btn-primary px-3">
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

function FeatureCard({ feature: initial, onUpdate, currentUserId }) {
  const [feature, setFeature] = useState(initial)
  const [expanded, setExpanded] = useState(false)
  const [testStatus, setTestStatus] = useState(initial.studentTestStatus ?? 'NotTested')
  const [note, setNote] = useState(initial.studentTestNote ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [markingInProgress, setMarkingInProgress] = useState(false)
  const [preview, setPreview] = useState(null)
  const [commentRefreshKey, setCommentRefreshKey] = useState(0)
  const fileRef = useRef()

  useEffect(() => {
    setFeature(initial)
    // note and testStatus are user-input — do not reset on server sync
  }, [initial])

  const sc = statusColors[feature.status] ?? statusColors.NotStarted
  const tc = testColors[feature.studentTestStatus] ?? testColors.NotTested
  const uc = urgencyConfig[feature.urgency] ?? urgencyConfig.Low
  const hasTested = feature.studentTestStatus !== 'NotTested'

  async function submitTest() {
    if (testStatus === 'NotTested') return
    setSubmitting(true)
    try {
      const updated = await systemFeatureService.submitStudentTest(feature.id, {
        testStatus,
        note: note.trim() || null,
      })
      setFeature(updated)
      onUpdate?.(updated)
      setCommentRefreshKey(k => k + 1)
      toast.success('Test result submitted.')
    } catch {
      toast.error('Failed to submit test result.')
    } finally {
      setSubmitting(false)
    }
  }

  async function markInProgress() {
    setMarkingInProgress(true)
    try {
      const updated = await systemFeatureService.update(feature.id, { status: 'InProgress' })
      setFeature(updated)
      onUpdate?.(updated)
      setCommentRefreshKey(k => k + 1)
      toast.success('Feature marked as In Progress.')
    } catch {
      toast.error('Failed to update status.')
    } finally {
      setMarkingInProgress(false)
    }
  }

  async function handleScreenshot(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const updated = await systemFeatureService.uploadScreenshot(feature.id, file)
      setFeature(updated)
      onUpdate?.(updated)
      toast.success('Screenshot uploaded.')
    } catch {
      toast.error('Failed to upload screenshot.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const screenshotUrls = (feature.screenshots ?? []).map(s => `${API_BASE}${s.path}`)

  return (
    <>
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
              <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: tc.bg, color: tc.text }}>
                {feature.studentTestStatus === 'Passed' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {feature.studentTestStatus === 'Passed' ? 'Tested — Working' : 'Tested — Not Working'}
              </span>
            )}
          </div>
          <h3 className="font-semibold mt-1.5" style={{ color: 'var(--text-heading)' }}>{feature.name}</h3>
          {feature.description && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <MessageSquare size={11} />{feature.commentCount} comment{feature.commentCount !== 1 ? 's' : ''}
            </span>
            {feature.studentTestedAt && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Clock size={11} />Tested {new Date(feature.studentTestedAt).toLocaleDateString()}
              </span>
            )}
            {feature.screenshots?.length > 0 && (
              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                <Paperclip size={11} />{feature.screenshots.length} screenshot{feature.screenshots.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setExpanded(v => !v)} className="btn-ghost px-2 shrink-0">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 space-y-5" style={{ borderTop: '1px solid var(--border-light)' }}>

          {/* ── Mark In Progress ── */}
          {feature.status !== 'InProgress' && feature.status !== 'Completed' && (
            <div>
              <button
                onClick={markInProgress}
                disabled={markingInProgress}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: '1px solid #3b82f6' }}>
                <Clock size={14} />
                {markingInProgress ? 'Updating...' : 'Mark In Progress'}
              </button>
            </div>
          )}

          {/* ── Student Test Submission ── */}
          <div className="rounded-xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Your Test Report
            </p>

            <div className="flex gap-2 mb-3">
              {[
                { value: 'Passed',  label: 'Working',     icon: CheckCircle2, active: '#16a34a', activeBg: 'rgba(34,197,94,0.12)' },
                { value: 'Failed',  label: 'Not Working', icon: XCircle,      active: '#dc2626', activeBg: 'rgba(239,68,68,0.12)' },
              ].map(({ value, label, icon: Icon, active, activeBg }) => (
                <button key={value} onClick={() => setTestStatus(value)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: testStatus === value ? activeBg : 'var(--bg-card)',
                    color: testStatus === value ? active : 'var(--text-secondary)',
                    border: `1px solid ${testStatus === value ? active : 'var(--border-main)'}`,
                  }}>
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <textarea
              className="form-input text-sm mb-3"
              rows={2}
              placeholder="Describe what you tested and what you observed..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            {/* Screenshots */}
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-2">
                <input type="file" accept="image/*" ref={fileRef} className="hidden" onChange={handleScreenshot} />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}>
                  <Paperclip size={13} />
                  {uploading ? 'Uploading...' : 'Attach Screenshot'}
                </button>
                {feature.screenshots?.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {feature.screenshots.length} uploaded
                  </span>
                )}
              </div>
              {feature.screenshots?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {feature.screenshots.map((s, idx) => (
                    <img
                      key={s.id}
                      src={`${API_BASE}${s.path}`}
                      alt="Screenshot"
                      className="h-16 w-auto rounded-lg object-cover cursor-pointer transition-opacity hover:opacity-80"
                      style={{ border: '1px solid var(--border-main)' }}
                      onClick={() => setPreview(idx)}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={submitTest}
              disabled={testStatus === 'NotTested' || submitting}
              className="btn-primary text-sm">
              {submitting ? 'Submitting...' : hasTested ? 'Update Test Result' : 'Submit Test Result'}
            </button>

            {feature.status === 'Completed' && (
              <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#16a34a' }}>
                <CheckCircle2 size={15} />
                <span>Adviser approved this feature.</span>
              </div>
            )}
            {feature.status === 'NeedsRevision' && (
              <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#dc2626' }}>
                <XCircle size={15} />
                <span>Adviser requested revision — check the comments below.</span>
              </div>
            )}
          </div>

          {/* ── Comments ── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              Comments
            </p>
            <CommentThread featureId={feature.id} currentUserId={currentUserId} refreshKey={commentRefreshKey} />
          </div>
        </div>
      )}
    </div>
    </>
  )
}

export default function StudentSystemTracker() {
  const navigate = useNavigate()
  const [features, setFeatures] = useState([])
  const [group, setGroup] = useState(undefined)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('list')

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('tm_user') ?? 'null')
    setCurrentUserId(user?.id ?? null)

    groupService.myGroup()
      .then(g => {
        setGroup(g)
        return systemFeatureService.byGroup(g.id)
      })
      .then(setFeatures)
      .catch(() => setGroup(prev => prev === undefined ? null : prev))
  }, [])

  function handleUpdate(updated) {
    setFeatures(prev => prev.map(f => f.id === updated.id ? updated : f))
  }

  const functional = features.filter(f => f.featureType === 'Functional')
  const nonFunctional = features.filter(f => f.featureType === 'NonFunctional')
  const displayed = filter === 'All' ? features : filter === 'Functional' ? functional : nonFunctional

  const testedCount   = features.filter(f => f.studentTestStatus !== 'NotTested').length
  const approvedCount = features.filter(f => f.status === 'Completed').length

  if (group === undefined) return <><TopBar title="System Tracker" /><PageLoader /></>

  if (group === null) {
    return (
      <div>
        <TopBar title="System Tracker" />
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="rounded-2xl p-10 text-center max-w-md"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(201,168,76,0.1)' }}>
              <Users size={28} style={{ color: '#c9a84c' }} />
            </div>
            <h2 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--text-heading)' }}>No Group Yet</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              You need to be part of a capstone group before you can access the System Tracker.
            </p>
            <button className="btn-primary" onClick={() => navigate('/groups')}>View Groups</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="System Tracker" subtitle="Test and report on your capstone system features" />
      <div className="p-4 sm:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">System Feature Tracker</h2>
            <p className="page-subtitle">{group?.projectTitle ?? group?.groupName}</p>
          </div>
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
        </div>

        {view === 'list' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Features', value: features.length,    color: '#c9a84c' },
                { label: 'Tested',         value: testedCount,        color: '#3b82f6' },
                { label: 'Approved',       value: approvedCount,      color: '#16a34a' },
                { label: 'Need Revision',  value: features.filter(f => f.status === 'NeedsRevision').length, color: '#dc2626' },
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
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your adviser will add system features to track</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayed.map(f => (
                  <FeatureCard key={f.id} feature={f} onUpdate={handleUpdate} currentUserId={currentUserId} />
                ))}
              </div>
            )}
          </>
        )}

        {view === 'gantt' && (
          features.length === 0 ? (
            <div className="card text-center py-12">
              <BarChart2 size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No features to display</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your adviser will add system features to track</p>
            </div>
          ) : (
            <GanttChart features={features} canEdit={false} />
          )
        )}
      </div>
    </>
  )
}
