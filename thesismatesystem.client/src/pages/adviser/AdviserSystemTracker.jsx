import { useState, useEffect } from 'react'
import { Cpu, Plus, MessageSquare, ChevronDown, ChevronUp, Send, Edit2, Trash2 } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { systemFeatureService, groupService } from '../../services/api'

const statusOptions = ['NotStarted', 'InProgress', 'Completed', 'NeedsRevision']
const statusColors = {
  NotStarted: { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' },
  InProgress: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  Completed: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  NeedsRevision: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
}

function CommentPanel({ featureId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    systemFeatureService.comments(featureId).then(setComments).finally(() => setLoading(false))
  }, [featureId])

  async function handleSend() {
    if (!text.trim()) return
    const comment = await systemFeatureService.addComment(featureId, { content: text.trim() })
    setComments(prev => [...prev, comment])
    setText('')
  }

  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
      {loading ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        : comments.length === 0 ? <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>
        : (
          <ul className="space-y-2 mb-3">
            {comments.map(c => (
              <li key={c.id} className="flex gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
                  {c.author?.fullName?.[0] ?? '?'}
                </div>
                <div className="flex-1 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.author?.fullName}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      <div className="flex gap-2">
        <input className="form-input py-2 text-sm" placeholder="Add a comment..." value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <button onClick={handleSend} className="btn-primary px-3" disabled={!text.trim()}><Send size={14} /></button>
      </div>
    </div>
  )
}

export default function AdviserSystemTracker() {
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [features, setFeatures] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('All')
  const [editingStatus, setEditingStatus] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', featureType: 'Functional', sortOrder: 0 })

  useEffect(() => {
    groupService.list().then(gs => {
      setGroups(gs)
      if (gs.length > 0) {
        setSelectedGroup(gs[0])
        systemFeatureService.byGroup(gs[0].id).then(setFeatures)
      }
    }).finally(() => setLoading(false))
  }, [])

  async function loadFeatures(group) {
    setSelectedGroup(group)
    const data = await systemFeatureService.byGroup(group.id)
    setFeatures(data)
  }

  async function handleAdd(e) {
    e.preventDefault()
    const feature = await systemFeatureService.create({ ...form, capstoneGroupId: selectedGroup.id, sortOrder: Number(form.sortOrder) })
    setFeatures(prev => [...prev, feature])
    setForm({ name: '', description: '', featureType: 'Functional', sortOrder: 0 })
    setShowAdd(false)
  }

  async function handleStatusChange(featureId, status) {
    const updated = await systemFeatureService.update(featureId, { status })
    setFeatures(prev => prev.map(f => f.id === featureId ? updated : f))
    setEditingStatus(null)
  }

  async function handleDelete(featureId) {
    if (!confirm('Delete this feature?')) return
    await systemFeatureService.delete(featureId)
    setFeatures(prev => prev.filter(f => f.id !== featureId))
  }

  const functional = features.filter(f => f.featureType === 'Functional')
  const nonFunctional = features.filter(f => f.featureType === 'NonFunctional')
  const displayed = filter === 'All' ? features : filter === 'Functional' ? functional : nonFunctional

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div></div>
  }

  return (
    <>
      <TopBar title="System Tracker" subtitle="Manage capstone system features and comments" />
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">System Feature Tracker</h2>
            <p className="page-subtitle">Descriptive-Developmental capstone monitoring</p>
          </div>
          {selectedGroup && <button className="btn-primary" onClick={() => setShowAdd(s => !s)}><Plus size={16} />Add Feature</button>}
        </div>

        {groups.length > 1 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            {groups.map(g => (
              <button key={g.id} onClick={() => loadFeatures(g)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: selectedGroup?.id === g.id ? '#c9a84c' : 'var(--bg-subtle)', color: selectedGroup?.id === g.id ? '#0a1628' : 'var(--text-secondary)' }}>
                {g.groupName}
              </button>
            ))}
          </div>
        )}

        {showAdd && (
          <div className="card mb-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Add System Feature</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name *</label>
                  <input className="form-input" placeholder="Feature name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select className="form-input" value={form.featureType} onChange={e => setForm(f => ({...f, featureType: e.target.value}))}>
                    <option value="Functional">Functional</option>
                    <option value="NonFunctional">Non-Functional</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea className="form-input" rows={2} placeholder="Describe this feature..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary">Add Feature</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
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
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(feature => {
              const sc = statusColors[feature.status] ?? statusColors.NotStarted
              return (
                <div key={feature.id} className="card">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: feature.featureType === 'Functional' ? 'rgba(59,130,246,0.1)' : 'rgba(139,92,246,0.1)',
                                   color: feature.featureType === 'Functional' ? '#3b82f6' : '#8b5cf6' }}>
                          {feature.featureTypeLabel}
                        </span>
                        {editingStatus === feature.id ? (
                          <select className="text-xs px-2 py-0.5 rounded-lg border outline-none"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: '#c9a84c' }}
                            value={feature.status} onChange={e => handleStatusChange(feature.id, e.target.value)}>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer" style={{ background: sc.bg, color: sc.text }} onClick={() => setEditingStatus(feature.id)}>
                            {feature.statusLabel}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold mt-1" style={{ color: 'var(--text-heading)' }}>{feature.name}</h3>
                      {feature.description && <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>}
                      <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}><MessageSquare size={11} className="inline mr-1" />{feature.commentCount} comments</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button className="btn-ghost px-2" onClick={() => setExpanded(expanded === feature.id ? null : feature.id)}>
                        {expanded === feature.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                      <button className="btn-ghost px-2" onClick={() => handleDelete(feature.id)}><Trash2 size={14} style={{ color: '#dc2626' }} /></button>
                    </div>
                  </div>
                  {expanded === feature.id && <CommentPanel featureId={feature.id} />}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
