import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cpu, MessageSquare, ChevronDown, ChevronUp, BarChart2, List, Users } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import GanttChart from '../../components/ui/GanttChart'
import { PageLoader } from '../../components/ui/Spinner'
import { systemFeatureService, groupService } from '../../services/api'

const statusColors = {
  NotStarted: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' },
  InProgress: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  Completed: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  NeedsRevision: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
}

function FeatureCard({ feature }) {
  const [expanded, setExpanded] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentError, setCommentError] = useState('')
  const sc = statusColors[feature.status] ?? statusColors.NotStarted

  async function loadComments() {
    if (expanded) {
      setExpanded(false)
      return
    }
    if (!commentsLoaded) {
      try {
        const data = await systemFeatureService.comments(feature.id)
        setComments(data)
        setCommentsLoaded(true)
        setCommentError('')
      } catch (err) {
        setCommentError(err.message ?? 'Failed to load comments')
        setExpanded(true)
        return
      }
    }
    setExpanded(true)
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: feature.featureType === 'Functional' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                       color: feature.featureType === 'Functional' ? '#3b82f6' : '#8b5cf6' }}>
              {feature.featureTypeLabel}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: sc.bg, color: sc.text }}>
              {feature.statusLabel}
            </span>
          </div>
          <h3 className="font-semibold mt-1" style={{ color: 'var(--text-heading)' }}>{feature.name}</h3>
          {feature.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>}
          <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <MessageSquare size={11} />
            {feature.commentCount} comment{feature.commentCount !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={loadComments} className="btn-ghost px-2">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
          {commentError ? (
            <p className="text-xs px-3 py-2 rounded-lg" style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}>
              {commentError}
            </p>
          ) : comments.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map(c => (
                <li key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
                    {c.author?.fullName?.[0] ?? '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.author?.fullName}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>{c.authorRole}</span>
                    </div>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{c.content}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default function StudentSystemTracker() {
  const navigate = useNavigate()
  const [features, setFeatures] = useState([])
  const [group, setGroup] = useState(undefined) // undefined=loading, null=no group
  const [filter, setFilter] = useState('All')
  const [view, setView] = useState('list')

  useEffect(() => {
    groupService.myGroup()
      .then(g => {
        setGroup(g)
        return systemFeatureService.byGroup(g.id)
      })
      .then(setFeatures)
      .catch(() => {
        setGroup(prev => prev === undefined ? null : prev)
      })
  }, [])

  const functional = features.filter(f => f.featureType === 'Functional')
  const nonFunctional = features.filter(f => f.featureType === 'NonFunctional')
  const displayed = filter === 'All' ? features : filter === 'Functional' ? functional : nonFunctional

  if (group === undefined) {
    return <><TopBar title="System Tracker" /><PageLoader /></>
  }

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
            <h2 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--text-heading)' }}>
              No Group Yet
            </h2>
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
      <TopBar title="System Tracker" subtitle="Monitor your capstone system features" />
      <div className="p-4 sm:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">System Feature Tracker</h2>
            <p className="page-subtitle">{group?.projectTitle ?? group?.groupName} — Descriptive-Developmental Progress</p>
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
                { label: 'Total', value: features.length, color: '#c9a84c' },
                { label: 'Functional', value: functional.length, color: '#3b82f6' },
                { label: 'Non-Functional', value: nonFunctional.length, color: '#8b5cf6' },
                { label: 'Completed', value: features.filter(f => f.status === 'Completed').length, color: '#16a34a' },
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
                {displayed.map(f => <FeatureCard key={f.id} feature={f} />)}
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
