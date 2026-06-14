import { useState, useEffect } from 'react'
import { BookOpen, FileText, Download, MessageSquare, ChevronDown, ChevronUp, Send, Users } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { documentService } from '../../services/api'

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</p>
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
        <textarea
          className="form-input text-sm"
          rows={2}
          placeholder="Write your feedback or revision notes..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button onClick={handleSend} className="btn-primary px-4 self-end" disabled={!text.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ManuscriptReview() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [groupFilter, setGroupFilter] = useState('All')

  useEffect(() => {
    documentService.forAdviser().then(setDocs).finally(() => setLoading(false))
  }, [])

  const groups = [...new Set(docs.map(d => d.groupName))]
  const displayed = groupFilter === 'All' ? docs : docs.filter(d => d.groupName === groupFilter)

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Manuscript Review" subtitle="Review and comment on student submissions" />
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">Student Manuscripts</h2>
            <p className="page-subtitle">{docs.length} document{docs.length !== 1 ? 's' : ''} from your advisees</p>
          </div>
        </div>

        {groups.length > 1 && (
          <div className="flex gap-2 mb-5 flex-wrap">
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
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your advisees haven't uploaded any documents</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayed.map(doc => (
              <div key={doc.id} className="card">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
                    <FileText size={18} style={{ color: '#c9a84c' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold" style={{ color: 'var(--text-heading)' }}>{doc.title}</h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {doc.submittedBy?.fullName} • {doc.groupName}
                        </p>
                        {doc.description && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{doc.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.fileName} • {formatSize(doc.fileSize)}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>v{doc.version}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {new Date(doc.submittedAt).toLocaleDateString('en', { dateStyle: 'medium' })}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: doc.commentCount > 0 ? '#c9a84c' : 'var(--text-muted)' }}>
                            <MessageSquare size={11} />
                            {doc.commentCount}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a href={`/api/documents/${doc.id}/download`} target="_blank" rel="noreferrer" className="btn-ghost px-2" title="Download">
                          <Download size={15} />
                        </a>
                        <button className="btn-ghost px-2" onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}>
                          {expandedDoc === doc.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {expandedDoc === doc.id && <CommentPanel docId={doc.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
