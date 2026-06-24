import { useState, useEffect, useRef } from 'react'
import { BookOpen, FileText, Download, MessageSquare, ChevronDown, ChevronUp, Send, Users, Image } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { documentService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { useSort, SortIcon } from '../../hooks/useSort.jsx'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function GroupLogo({ groupId, groupName, size = 56 }) {
  const [errored, setErrored] = useState(false)
  const initials = (groupName ?? 'G').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  if (!errored) {
    return (
      <img
        src={`/api/groups/${groupId}/logo`}
        alt={groupName}
        onError={() => setErrored(true)}
        style={{
          width: size, height: size, borderRadius: 12,
          objectFit: 'cover', flexShrink: 0,
          border: '1px solid var(--border-light)',
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: 'linear-gradient(135deg,rgba(201,168,76,0.18),rgba(201,168,76,0.06))',
      border: '1px solid rgba(201,168,76,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display, Georgia, serif)',
      fontSize: size * 0.3, fontWeight: 700, color: '#c9a84c',
    }}>
      {initials}
    </div>
  )
}

function CommentPanel({ docId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    documentService.comments(docId).then(setComments).finally(() => setLoading(false))
  }, [docId])

  async function handleSend() {
    if (!text.trim()) return
    const comment = await documentService.addComment(docId, { content: text.trim() })
    setComments(prev => [...prev, comment])
    setText('')
  }

  return (
    <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
      <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
        <MessageSquare size={14} className="inline mr-1" />Comments & Feedback
      </p>
      {loading ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>No comments yet. Be the first to leave feedback.</p>
      ) : (
        <ul className="space-y-3 mb-3">
          {comments.map(c => (
            <li key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: c.authorRole === 'Adviser' ? 'linear-gradient(135deg,#c9a84c,#d4b565)' : 'linear-gradient(135deg,#0a1628,#162238)', color: c.authorRole === 'Adviser' ? '#0a1628' : '#c9a84c' }}>
                {c.author?.fullName?.[0] ?? '?'}
              </div>
              <div className="flex-1 p-3 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.author?.fullName}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>{c.authorRole}</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <textarea className="form-input text-sm" rows={2}
          placeholder="Write your feedback or revision notes…"
          value={text} onChange={e => setText(e.target.value)} />
        <button onClick={handleSend} className="btn-primary px-4 self-end" disabled={!text.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ManuscriptReview() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin'
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [groupFilter, setGroupFilter] = useState('All')

  useEffect(() => {
    const fetch = isAdmin ? documentService.all() : documentService.forAdviser()
    fetch
      .then(setDocs)
      .catch(err => setError(err.message ?? 'Failed to load documents'))
      .finally(() => setLoading(false))
  }, [isAdmin])

  const groups = [...new Set(docs.map(d => d.groupName))]

  const baseList = groupFilter === 'All' ? docs : docs.filter(d => d.groupName === groupFilter)
  const { sorted: displayed, sortKey, sortDir, toggle } = useSort(baseList, 'submittedAt', 'desc')

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div>
      </div>
    )
  }

  if (error) {
    return (
      <>
        <TopBar title="Manuscript Review" subtitle="Review and comment on student submissions" />
        <div className="p-8">
          <div className="card text-center py-12">
            <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Could not load documents</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Manuscript Review" subtitle="Review and comment on student submissions" />
      <div className="p-4 sm:p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h2 className="page-title">Student Manuscripts</h2>
            <p className="page-subtitle">
              {docs.length} document{docs.length !== 1 ? 's' : ''}{isAdmin ? ' across all groups' : ' from your advisees'}
            </p>
          </div>

          {/* Sort controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Sort by:</span>
            {[
              { key: 'submittedAt', label: 'Date' },
              { key: 'title',       label: 'Title' },
              { key: 'groupName',   label: 'Group' },
              { key: 'version',     label: 'Version' },
              { key: 'commentCount',label: 'Comments' },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => toggle(key)}
                className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: sortKey === key ? 'rgba(201,168,76,0.15)' : 'var(--bg-subtle)',
                  color: sortKey === key ? '#c9a84c' : 'var(--text-secondary)',
                  border: `1px solid ${sortKey === key ? 'rgba(201,168,76,0.3)' : 'var(--border-main)'}`,
                }}>
                {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
              </button>
            ))}
          </div>
        </div>

        {/* Group filter */}
        {groups.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {['All', ...groups].map(g => (
              <button key={g} onClick={() => setGroupFilter(g)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{ background: groupFilter === g ? '#c9a84c' : 'var(--bg-subtle)', color: groupFilter === g ? '#0a1628' : 'var(--text-secondary)' }}>
                {g !== 'All' && <Users size={12} />}
                {g}
              </button>
            ))}
          </div>
        )}

        {displayed.length === 0 ? (
          <div className="card text-center py-12">
            <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No manuscripts submitted yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {isAdmin ? 'No documents have been uploaded by any group yet.' : "Your advisees haven't uploaded any documents yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayed.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                expanded={expandedDoc === doc.id}
                onToggleExpand={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function DocumentCard({ doc, expanded, onToggleExpand }) {
  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        boxShadow: expanded ? '0 4px 24px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}>

      {/* Card header with logo */}
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <GroupLogo groupId={doc.capstoneGroupId} groupName={doc.groupName} size={52} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold leading-snug line-clamp-2 mb-0.5" style={{ color: 'var(--text-heading)' }}>
              {doc.title}
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {doc.groupName}
            </p>
          </div>
        </div>

        {doc.description && (
          <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{doc.description}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {doc.fileName} · {formatSize(doc.fileSize)}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
            style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
            v{doc.version}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {new Date(doc.submittedAt).toLocaleDateString('en', { dateStyle: 'medium' })}
          </span>
          <span className="flex items-center gap-1 text-xs ml-auto"
            style={{ color: doc.commentCount > 0 ? '#c9a84c' : 'var(--text-muted)' }}>
            <MessageSquare size={11} />{doc.commentCount}
          </span>
        </div>

        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          Submitted by {doc.submittedBy?.fullName}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noreferrer"
            className="btn-ghost text-xs flex items-center gap-1.5 px-3 py-1.5 flex-1 justify-center"
            onClick={e => e.stopPropagation()}>
            <Download size={13} /> Download
          </a>
          <button
            className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium flex-1 justify-center transition-all"
            style={{
              background: expanded ? 'rgba(201,168,76,0.12)' : 'var(--bg-subtle)',
              color: expanded ? '#c9a84c' : 'var(--text-secondary)',
              border: `1px solid ${expanded ? 'rgba(201,168,76,0.25)' : 'var(--border-main)'}`,
            }}
            onClick={onToggleExpand}>
            <MessageSquare size={13} />
            {expanded ? 'Hide' : 'Comments'}
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Expandable comment panel */}
      {expanded && (
        <div className="px-5 pb-5" style={{ borderTop: '1px solid var(--border-light)' }}>
          <CommentPanel docId={doc.id} />
        </div>
      )}
    </div>
  )
}
