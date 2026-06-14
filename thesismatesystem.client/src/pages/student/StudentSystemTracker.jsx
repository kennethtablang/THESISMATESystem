import { useState, useEffect } from 'react'
import { Cpu, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
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
  const sc = statusColors[feature.status] ?? statusColors.NotStarted

  async function loadComments() {
    if (!expanded) {
      const data = await systemFeatureService.comments(feature.id)
      setComments(data)
    }
    setExpanded(e => !e)
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
          {comments.length === 0 ? (
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
  const [features, setFeatures] = useState([])
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    groupService.myGroup().then(g => {
      setGroup(g)
      return systemFeatureService.byGroup(g.id)
    }).then(setFeatures).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const functional = features.filter(f => f.featureType === 'Functional')
  const nonFunctional = features.filter(f => f.featureType === 'NonFunctional')
  const displayed = filter === 'All' ? features : filter === 'Functional' ? functional : nonFunctional

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="System Tracker" subtitle="Monitor your capstone system features" />
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">System Feature Tracker</h2>
            <p className="page-subtitle">{group?.groupName} — Descriptive-Developmental Progress</p>
          </div>
        </div>

        {/* Stats */}
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

        {/* Filter */}
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
      </div>
    </>
  )
}
