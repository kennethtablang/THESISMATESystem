import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, MessageSquare, Download, Trash2, Clock, ChevronDown, ChevronUp, Send } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { documentService, groupService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function CommentThread({ docId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

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
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
      {loading ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {comments.map(c => (
            <li key={c.id} className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
                {c.author?.fullName?.[0] ?? '?'}
              </div>
              <div className="flex-1">
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
      <div className="flex gap-2">
        <input
          className="form-input py-2 text-sm"
          placeholder="Add a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <button onClick={handleSend} className="btn-primary px-3" disabled={!text.trim()}>
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

export default function DocumentUpload() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [expandedDoc, setExpandedDoc] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', file: null })
  const fileRef = useRef()

  useEffect(() => {
    groupService.myGroup().then(g => {
      setGroup(g)
      return documentService.byGroup(g.id)
    }).then(setDocs).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleUpload(e) {
    e.preventDefault()
    if (!form.file || !form.title) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('CapstoneGroupId', group.id)
      fd.append('Title', form.title)
      fd.append('Description', form.description)
      fd.append('File', form.file)
      const doc = await documentService.upload(fd)
      setDocs(prev => [doc, ...prev])
      setForm({ title: '', description: '', file: null })
      setShowUpload(false)
      fileRef.current.value = ''
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div>
      </div>
    )
  }

  if (!group) {
    return (
      <>
        <TopBar title="Upload Documents" subtitle="Document & Manuscript Management" />
        <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
          You are not assigned to a group yet. Please contact your Admin.
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Upload Documents" subtitle={`Group: ${group.groupName}`} />
      <div className="p-4 sm:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">Manuscripts & Documents</h2>
            <p className="page-subtitle">Upload your capstone manuscripts for adviser review</p>
          </div>
          <button className="btn-primary" onClick={() => setShowUpload(s => !s)}>
            <Upload size={16} />
            Upload Document
          </button>
        </div>

        {showUpload && (
          <div className="card mb-6">
            <h3 className="font-semibold text-base mb-4" style={{ color: 'var(--text-heading)' }}>Upload New Document</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title *</label>
                <input className="form-input" placeholder="e.g. Chapter 1 - Introduction" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
                <textarea className="form-input" rows={3} placeholder="Brief description of this document..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>File * <span className="font-normal text-xs">(PDF, DOC, DOCX)</span></label>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="form-input" required onChange={e => setForm(f => ({...f, file: e.target.files[0]}))} />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowUpload(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {docs.length === 0 ? (
          <div className="card text-center py-12">
            <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No documents uploaded yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Upload your first manuscript to get feedback from your adviser</p>
          </div>
        ) : (
          <div className="space-y-4">
            {docs.map(doc => (
              <div key={doc.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(201,168,76,0.1)' }}>
                      <FileText size={18} style={{ color: '#c9a84c' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-heading)' }}>{doc.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {doc.fileName} • {formatSize(doc.fileSize)} • v{doc.version}
                      </p>
                      {doc.description && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{doc.description}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <Clock size={11} />
                          {new Date(doc.submittedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                          <MessageSquare size={11} />
                          {doc.commentCount} comment{doc.commentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={documentService.download(doc.id)} target="_blank" rel="noreferrer" className="btn-ghost px-2">
                      <Download size={15} />
                    </a>
                    <button className="btn-ghost px-2" onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}>
                      {expandedDoc === doc.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>
                {expandedDoc === doc.id && <CommentThread docId={doc.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
