import { useState, useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, FileText, Download, MessageSquare, Users,
  CheckCircle, AlertCircle, Clock, Eye, Send, History,
  ChevronDown, ChevronUp, ArrowLeftRight, Search, User,
  File as FileIcon,
} from 'lucide-react'
import { renderAsync } from 'docx-preview'
import { toast } from '../../utils/toast'
import TopBar from '../../components/layout/TopBar'
import { PageLoader } from '../../components/ui/Spinner'
import { documentService, groupService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import DocumentCompare from '../student/DocumentCompare'

// ── Section definitions (matches student's DOCUMENT_SECTIONS) ─────────────────
const DOCUMENT_SECTIONS = [
  { key: 1,  label: 'Title Page',        enumKey: 'TitlePage'       },
  { key: 2,  label: 'Approval Sheet',    enumKey: 'ApprovalSheet'   },
  { key: 3,  label: 'Abstract',          enumKey: 'Abstract'        },
  { key: 4,  label: 'Acknowledgement',   enumKey: 'Acknowledgement' },
  { key: 5,  label: 'Dedication',        enumKey: 'Dedication'      },
  { key: 6,  label: 'Table of Contents', enumKey: 'TableOfContents' },
  { key: 7,  label: 'List of Tables',    enumKey: 'ListOfTables'    },
  { key: 8,  label: 'List of Figures',   enumKey: 'ListOfFigures'   },
  { key: 9,  label: 'Chapter 1',         enumKey: 'Chapter1'        },
  { key: 10, label: 'Chapter 2',         enumKey: 'Chapter2'        },
  { key: 11, label: 'Chapter 3',         enumKey: 'Chapter3'        },
  { key: 12, label: 'Chapter 4',         enumKey: 'Chapter4'        },
  { key: 13, label: 'Chapter 5',         enumKey: 'Chapter5'        },
  { key: 14, label: 'References',        enumKey: 'References'      },
  { key: 15, label: 'Appendices',        enumKey: 'Appendices'      },
]

const SECTION_ENUM_TO_KEY = {
  TitlePage: 1, ApprovalSheet: 2, Abstract: 3, Acknowledgement: 4,
  Dedication: 5, TableOfContents: 6, ListOfTables: 7, ListOfFigures: 8,
  Chapter1: 9, Chapter2: 10, Chapter3: 11, Chapter4: 12,
  Chapter5: 13, References: 14, Appendices: 15,
}

function normalizeDoc(doc) {
  if (!doc) return doc
  const s = doc.section
  const section = s == null ? null : typeof s === 'number' ? s : (SECTION_ENUM_TO_KEY[s] ?? null)
  return { ...doc, section }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function Initials({ name, size = 22 }) {
  const letters = (name ?? 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="rounded-full flex items-center justify-center text-xs font-bold shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
      {letters}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (!status || status === 'Draft') return null
  const cfg = {
    SubmittedForReview: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: Clock,       label: 'Submitted for Review' },
    NeedsRevision:      { color: '#d97706', bg: 'rgba(245,158,11,0.1)',  icon: AlertCircle, label: 'Needs Revision' },
    Approved:           { color: '#16a34a', bg: 'rgba(34,197,94,0.1)',   icon: CheckCircle, label: 'Approved' },
  }[status]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
      <Icon size={9} />{cfg.label}
    </span>
  )
}

// ── Group logo ────────────────────────────────────────────────────────────────
function GroupLogo({ groupId, groupName, size = 32 }) {
  const [err, setErr] = useState(false)
  const initials = (groupName ?? 'G').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  if (!err) return (
    <img src={`/api/groups/${groupId}/logo`} alt={groupName} onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border-light)' }} />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(135deg,rgba(201,168,76,0.18),rgba(201,168,76,0.06))',
      border: '1px solid rgba(201,168,76,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 700, color: '#c9a84c',
    }}>{initials}</div>
  )
}

// ── Document preview pane (inline DOCX / PDF) ─────────────────────────────────
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
function isDocx(m, n) { return m === DOCX_MIME || m === 'application/msword' || n?.toLowerCase().endsWith('.docx') || n?.toLowerCase().endsWith('.doc') }
function isPdf(m, n)  { return m === 'application/pdf' || n?.toLowerCase().endsWith('.pdf') }

function PreviewPanel({ docId, fileName, mimeType, onClose }) {
  const containerRef = useRef(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [pdfUrl, setPdfUrl]     = useState(null)

  useEffect(() => {
    let revokeUrl = null
    setLoading(true); setError(null); setPdfUrl(null)
    const token = sessionStorage.getItem('tm_token')
    fetch(`/api/documents/${docId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Failed to load document (${res.status})`)
        const blob = await res.blob()
        if (isDocx(mimeType, fileName)) {
          const arrayBuffer = await blob.arrayBuffer()
          if (containerRef.current) {
            containerRef.current.replaceChildren()
            await renderAsync(arrayBuffer, containerRef.current, null, {
              className: 'docx-render', inWrapper: false, ignoreWidth: true, ignoreHeight: true,
            })
          }
        } else if (isPdf(mimeType, fileName)) {
          const url = URL.createObjectURL(blob)
          revokeUrl = url; setPdfUrl(url)
        } else {
          setError('Preview not available for this file type.')
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
    return () => { if (revokeUrl) URL.revokeObjectURL(revokeUrl) }
  }, [docId])

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden h-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <FileIcon size={14} style={{ color: '#c9a84c', flexShrink: 0 }} />
        <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{fileName}</span>
        <button onClick={onClose} className="btn-ghost p-1.5 shrink-0"><span style={{ fontSize: 18, lineHeight: 1 }}>×</span></button>
      </div>
      <div className="flex-1 overflow-auto relative" style={{ background: '#f0f0f0' }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3" style={{ background: '#f0f0f0' }}>
            <div className="flex gap-1">{[0,1,2].map(i => (
              <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
            ))}</div>
            <p className="text-xs" style={{ color: '#666' }}>Loading preview…</p>
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center" style={{ background: '#f0f0f0' }}>
            <FileText size={32} style={{ color: '#999' }} />
            <p className="text-sm" style={{ color: '#555' }}>{error}</p>
          </div>
        )}
        {!loading && !error && pdfUrl && (
          <embed src={pdfUrl} type="application/pdf" className="w-full h-full" style={{ minHeight: 500 }} />
        )}
        {!loading && !error && !pdfUrl && (
          <div ref={containerRef} style={{ minHeight: 400, padding: 24, colorScheme: 'light', background: '#f0f0f0', color: '#1a1a1a', fontSize: 13, lineHeight: 1.6 }} />
        )}
      </div>
    </div>
  )
}

// ── Comment thread ────────────────────────────────────────────────────────────
function CommentThread({ docId }) {
  const [comments, setComments] = useState([])
  const [text, setText]         = useState('')
  const [loadingC, setLoadingC] = useState(true)
  const [sending, setSending]   = useState(false)

  useEffect(() => {
    documentService.comments(docId).then(setComments).catch(() => {}).finally(() => setLoadingC(false))
  }, [docId])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const comment = await documentService.addComment(docId, { content: text.trim() })
      setComments(prev => [...prev, comment]); setText('')
    } catch (err) { toast.error(err.message || 'Failed to post comment.') }
    finally { setSending(false) }
  }

  return (
    <div>
      <p className="text-xs font-semibold mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
        <MessageSquare size={12} /> Comments
        {comments.length > 0 && <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({comments.length})</span>}
      </p>
      {loadingC ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>No comments yet.</p>
      ) : (
        <ul className="space-y-3 mb-4">
          {comments.map(c => (
            <li key={c.id} className="flex gap-2.5">
              <Initials name={c.author?.fullName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.author?.fullName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>{c.authorRole}</span>
                  <span className="text-[10px] ml-auto shrink-0" style={{ color: 'var(--text-muted)' }}>{formatDateTime(c.createdAt)}</span>
                </div>
                <div
                  className="text-sm leading-relaxed prose prose-sm max-w-none [&_p]:m-0 [&_p+p]:mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.content) }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input className="form-input py-2 text-sm flex-1" placeholder="Leave a comment…" value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={sending} />
        <button onClick={handleSend} className="btn-primary px-3" disabled={!text.trim() || sending}>
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ManuscriptReview() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const isAdmin   = user?.role === 'Admin' || user?.role === 'SuperAdmin'

  const [docs,            setDocs]            = useState([])
  const [loading,         setLoading]         = useState(true)
  const [error,           setError]           = useState(null)
  const [search,          setSearch]          = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [groupDetail,     setGroupDetail]     = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)
  const [versions,        setVersions]        = useState({})   // { [docId]: [...] }
  const [preview,         setPreview]         = useState(null) // { id, fileName, mimeType }
  const [compareModal,    setCompareModal]     = useState(null)

  useEffect(() => {
    const fetch = isAdmin ? documentService.all() : documentService.forAdviser()
    fetch
      .then(raw => setDocs(raw.map(normalizeDoc)))
      .catch(err => setError(err.message ?? 'Failed to load documents'))
      .finally(() => setLoading(false))
  }, [isAdmin])

  useEffect(() => {
    if (!selectedGroupId) { setGroupDetail(null); return }
    setGroupDetail(null)
    groupService.get(selectedGroupId).then(setGroupDetail).catch(() => {})
  }, [selectedGroupId])

  // Unique groups derived from docs
  const allGroups = (() => {
    const seen = new Map()
    for (const d of docs) {
      if (d.capstoneGroupId && !seen.has(d.capstoneGroupId))
        seen.set(d.capstoneGroupId, { id: d.capstoneGroupId, name: d.groupName ?? 'Unknown' })
    }
    return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
  })()

  const filteredGroups = allGroups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  // Docs for the selected group, deduplicated by section so that if the same
  // section has multiple chain roots (e.g. one from a regular upload, one from
  // ManuscriptEditor finalize), we always surface the best one.
  const STATUS_RANK = { SubmittedForReview: 0, NeedsRevision: 1, Approved: 2, Draft: 3 }
  const groupDocs = (() => {
    if (!selectedGroupId) return []
    const raw = docs.filter(d => d.capstoneGroupId === selectedGroupId)
    const bySection = new Map()
    for (const d of raw) {
      if (d.section == null) continue
      const cur = bySection.get(d.section)
      if (!cur) { bySection.set(d.section, d); continue }
      const rankDiff = (STATUS_RANK[d.submissionStatus] ?? 4) - (STATUS_RANK[cur.submissionStatus] ?? 4)
      if (rankDiff < 0 || (rankDiff === 0 && (d.version ?? 0) > (cur.version ?? 0))) {
        bySection.set(d.section, d)
      }
    }
    // Also keep docs with no section (they won't match any section card but
    // should still appear in the pending count if SubmittedForReview).
    const noSection = raw.filter(d => d.section == null)
    return [...bySection.values(), ...noSection]
  })()

  function getDocBySection(sectionKey) {
    return groupDocs.find(d => d.section === sectionKey) ?? null
  }

  const uploadedCount = DOCUMENT_SECTIONS.filter(s => getDocBySection(s.key)).length
  const pendingCount  = groupDocs.filter(d => d.submissionStatus === 'SubmittedForReview').length
  const selectedGroup = allGroups.find(g => g.id === selectedGroupId)

  async function toggleExpand(sectionKey) {
    const doc = getDocBySection(sectionKey)
    if (!doc) return
    if (expandedSection === sectionKey) { setExpandedSection(null); return }
    setExpandedSection(sectionKey)
    if (!versions[doc.id]) {
      try {
        const v = await documentService.versions(doc.id)
        setVersions(prev => ({ ...prev, [doc.id]: v }))
      } catch {}
    }
  }

  function openPreview(doc) {
    setPreview({ id: doc.id, fileName: doc.fileName, mimeType: doc.mimeType })
  }

  if (loading) return (
    <><TopBar title="Submitted Documents" subtitle="Review and comment on student submissions" /><PageLoader /></>
  )

  if (error) return (
    <>
      <TopBar title="Submitted Documents" subtitle="Review and comment on student submissions" />
      <div className="p-8">
        <div className="card text-center py-12">
          <BookOpen size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Could not load documents</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      <TopBar title="Submitted Documents" subtitle="Review and comment on student submissions" />

      <div className="p-4 sm:p-6 flex gap-4 items-start">

        {/* ── Group selector sidebar ──────────────────────────────────────── */}
        <aside
          className="w-56 shrink-0 rounded-2xl flex flex-col overflow-hidden"
          style={{
            border: '1px solid var(--border-main)',
            background: 'var(--bg-card)',
            maxHeight: 'calc(100vh - 120px)',
            position: 'sticky',
            top: 16,
          }}
        >
          <div className="px-3 pt-3 pb-2.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide px-1 mb-2" style={{ color: 'var(--text-muted)' }}>
              Groups
            </p>
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
              <input type="text" className="form-input pl-7 text-xs py-1.5" placeholder="Search…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {allGroups.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No documents yet.</p>
            ) : filteredGroups.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>No groups match.</p>
            ) : filteredGroups.map(g => {
              const sel = selectedGroupId === g.id
              const groupPending = docs.filter(d => d.capstoneGroupId === g.id && d.submissionStatus === 'SubmittedForReview').length
              return (
                <button key={g.id} onClick={() => { setSelectedGroupId(g.id); setExpandedSection(null) }}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: sel ? 'rgba(201,168,76,0.10)' : 'transparent',
                    border: sel ? '1px solid rgba(201,168,76,0.22)' : '1px solid transparent',
                  }}>
                  <div className="flex items-center gap-2">
                    <GroupLogo groupId={g.id} groupName={g.name} size={26} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: sel ? '#c9a84c' : 'var(--text-primary)' }}>
                        {g.name}
                      </p>
                      {groupPending > 0 && (
                        <span className="text-[10px] font-semibold" style={{ color: '#6366f1' }}>
                          {groupPending} pending
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        {!selectedGroupId ? (
          <div className="flex-1 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 180px)' }}>
            <div className="text-center">
              <BookOpen size={48} className="mx-auto mb-3" style={{ color: 'var(--border-main)' }} strokeWidth={1.2} />
              <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Select a group</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Choose a group from the left to view their submitted documents.
              </p>
            </div>
          </div>
        ) : (
          <div className={`flex gap-5 items-start flex-1 min-w-0 ${preview ? '' : ''}`}>

            {/* Section cards */}
            <div className={`space-y-3 ${preview ? 'w-[460px] shrink-0' : 'flex-1 min-w-0'}`}>

              {/* Group header */}
              <div className="rounded-2xl p-4"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>

                {/* Top row: logo + name + progress */}
                <div className="flex items-center gap-4 mb-3">
                  <GroupLogo groupId={selectedGroupId} groupName={selectedGroup?.name} size={44} />
                  <div className="flex-1 min-w-0">
                    <h2 className="font-display font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
                      {selectedGroup?.name}
                    </h2>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {uploadedCount}/{DOCUMENT_SECTIONS.length} sections uploaded
                      {pendingCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                          {pendingCount} pending review
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="w-28 shrink-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Progress</span>
                      <span className="text-[10px] font-semibold" style={{ color: '#c9a84c' }}>
                        {Math.round((uploadedCount / DOCUMENT_SECTIONS.length) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                      <div className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(uploadedCount / DOCUMENT_SECTIONS.length) * 100}%`, background: 'linear-gradient(90deg,#c9a84c,#d4b565)' }} />
                    </div>
                  </div>
                </div>

                {/* Full thesis title */}
                {groupDetail?.projectTitle && (
                  <div className="mb-3 px-3 py-2.5 rounded-xl"
                    style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.18)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5"
                      style={{ color: 'rgba(201,168,76,0.7)' }}>
                      <BookOpen size={10} /> Full Thesis Title
                    </p>
                    <p className="text-sm font-medium italic leading-snug"
                      style={{ color: 'var(--text-heading)', lineHeight: 1.5 }}>
                      "{groupDetail.projectTitle}"
                    </p>
                  </div>
                )}

                {/* Group members */}
                {groupDetail?.members && groupDetail.members.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"
                      style={{ color: 'var(--text-muted)' }}>
                      <Users size={10} /> Group Members
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {groupDetail.members.map(m => (
                        <div key={m.id ?? m.email} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl"
                          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                            style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
                            {m.fullName?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="text-xs font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
                              {m.fullName}
                            </p>
                            {m.studentId && (
                              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                                {m.studentId}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section cards */}
              {DOCUMENT_SECTIONS.map(section => {
                const doc        = getDocBySection(section.key)
                const isUploaded = !!doc
                const isExpanded = expandedSection === section.key
                const docVersions = doc ? (versions[doc.id] ?? null) : null
                const isPreviewing = preview?.id === doc?.id
                const isPending  = doc?.submissionStatus === 'SubmittedForReview'

                return (
                  <div key={section.key} className="rounded-2xl overflow-hidden transition-all"
                    style={{
                      background: 'var(--bg-card)',
                      border: isPreviewing
                        ? '1px solid rgba(201,168,76,0.5)'
                        : isPending
                          ? '1px solid rgba(99,102,241,0.3)'
                          : '1px solid var(--border-light)',
                      borderLeft: isUploaded ? '4px solid #c9a84c' : '4px solid var(--border-light)',
                      boxShadow: isPreviewing
                        ? '0 0 0 2px rgba(201,168,76,0.15)'
                        : isPending
                          ? '0 0 0 1px rgba(99,102,241,0.08)'
                          : '0 1px 3px rgba(0,0,0,0.04)',
                    }}>

                    {/* Pending banner */}
                    {isPending && (
                      <div className="px-4 py-1.5 flex items-center gap-2"
                        style={{ background: 'rgba(99,102,241,0.07)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                        <Clock size={10} style={{ color: '#6366f1' }} />
                        <span className="text-[10px] font-semibold" style={{ color: '#6366f1' }}>Awaiting your review</span>
                      </div>
                    )}

                    <div className="p-4">
                      <div className="flex items-start gap-3">

                        {/* Section badge */}
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                          style={isUploaded
                            ? { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }
                            : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                          {isUploaded ? <CheckCircle size={16} style={{ color: '#c9a84c' }} /> : section.key}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-sm" style={{ color: isUploaded ? 'var(--text-heading)' : 'var(--text-secondary)' }}>
                              {section.label}
                            </p>
                            {isUploaded && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                style={doc.version > 1
                                  ? { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }
                                  : { background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                                v{doc.version}{doc.totalVersions > 1 ? ` / ${doc.totalVersions}` : ''}
                              </span>
                            )}
                            {isUploaded && <StatusBadge status={doc.submissionStatus} />}
                          </div>

                          {isUploaded ? (
                            <>
                              {/* File chip */}
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg mb-1.5 w-fit"
                                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                                <FileIcon size={10} style={{ color: '#c9a84c', flexShrink: 0 }} />
                                <span className="text-xs font-medium truncate max-w-[180px]" style={{ color: 'var(--text-primary)' }}>
                                  {doc.fileName}
                                </span>
                                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>· {formatSize(doc.fileSize)}</span>
                              </div>
                              {/* Meta */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <Initials name={doc.submittedBy?.fullName} size={16} />
                                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{doc.submittedBy?.fullName ?? '—'}</span>
                                </div>
                                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                  <Clock size={10} />{formatDate(doc.submittedAt)}
                                </span>
                                {doc.totalVersions > 1 && (
                                  <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                    <History size={10} />{doc.totalVersions} versions
                                  </span>
                                )}
                                {doc.commentCount > 0 && (
                                  <span className="text-xs flex items-center gap-1" style={{ color: '#c9a84c' }}>
                                    <MessageSquare size={10} />{doc.commentCount}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Not yet uploaded by the group.</p>
                          )}
                        </div>

                        {/* Actions */}
                        {isUploaded && (
                          <div className="flex items-center gap-1 shrink-0 mt-0.5">
                            <button
                              onClick={() => openPreview(doc)}
                              title="Quick preview"
                              className="btn-ghost px-2 py-1.5 text-xs flex items-center gap-1"
                              style={isPreviewing ? { color: '#c9a84c' } : {}}>
                              <Eye size={13} />
                            </button>
                            <button
                              onClick={() => documentService.downloadFile(doc.id, doc.fileName)}
                              title="Download"
                              className="btn-ghost px-2 py-1.5 text-xs">
                              <Download size={13} />
                            </button>
                            <button
                              onClick={() => navigate(`/documents/review/${doc.id}`)}
                              title={isPending ? 'Review Now' : 'View & Comment'}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                              style={{
                                background: isPending ? 'rgba(99,102,241,0.12)' : 'var(--bg-subtle)',
                                color: isPending ? '#6366f1' : 'var(--text-secondary)',
                                border: `1px solid ${isPending ? 'rgba(99,102,241,0.25)' : 'var(--border-main)'}`,
                              }}>
                              {isPending ? <><Send size={11} /> Review Now</> : <><Eye size={11} /> View</>}
                            </button>
                            <button className="btn-ghost px-2 py-1.5" onClick={() => toggleExpand(section.key)}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Expanded panel ── */}
                    {isExpanded && doc && (
                      <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                        <div className="pt-4 space-y-5">

                          {/* Version history */}
                          {docVersions && docVersions.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                                <History size={12} /> Version History
                                {docVersions.length >= 2 && (
                                  <button
                                    onClick={() => {
                                      const sv = [...docVersions].sort((a, b) => a.version - b.version)
                                      setCompareModal({ versions: sv, sectionLabel: section.label })
                                    }}
                                    className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                                    style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer', fontWeight: 600 }}>
                                    <ArrowLeftRight size={10} /> Compare Versions
                                  </button>
                                )}
                              </p>
                              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
                                {[...docVersions].sort((a, b) => b.version - a.version).map((v, i, arr) => (
                                  <div key={v.id} className="flex items-center gap-3 px-3 py-2.5"
                                    style={{
                                      background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-subtle)',
                                      borderTop: i > 0 ? '1px solid var(--border-light)' : 'none',
                                    }}>
                                    <span className="text-xs font-bold w-8 shrink-0" style={{ color: v.version > 1 ? '#c9a84c' : 'var(--text-muted)' }}>
                                      v{v.version}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{v.fileName}</p>
                                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatSize(v.fileSize)}</span>
                                        {v.submittedBy?.fullName && (
                                          <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                            <User size={10} />{v.submittedBy.fullName}
                                          </span>
                                        )}
                                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatDate(v.submittedAt)}</span>
                                      </div>
                                    </div>
                                    {/* Compare with previous */}
                                    {arr[i + 1] && (
                                      <button
                                        onClick={() => {
                                          const sv = [...docVersions].sort((a, b) => a.version - b.version)
                                          setCompareModal({ versions: sv, initialIdA: arr[i + 1].id, initialIdB: v.id, sectionLabel: section.label })
                                        }}
                                        title={`Compare v${arr[i + 1].version} → v${v.version}`}
                                        className="shrink-0 flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                                        style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', cursor: 'pointer' }}>
                                        <ArrowLeftRight size={10} />
                                      </button>
                                    )}
                                    {/* Quick preview (this version) */}
                                    <button onClick={() => openPreview(v)}
                                      className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                                      style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}>
                                      <Eye size={11} />
                                    </button>
                                    {/* Download (this version) */}
                                    <button onClick={() => documentService.downloadFile(v.id, v.fileName)}
                                      className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                                      style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer' }}>
                                      <Download size={11} />
                                    </button>
                                    {/* Review Now (this version) */}
                                    <button onClick={() => navigate(`/documents/review/${v.id}`)}
                                      className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg"
                                      style={{ color: v.submissionStatus === 'SubmittedForReview' ? '#6366f1' : 'var(--text-secondary)', background: v.submissionStatus === 'SubmittedForReview' ? 'rgba(99,102,241,0.1)' : 'var(--bg-subtle)', border: `1px solid ${v.submissionStatus === 'SubmittedForReview' ? 'rgba(99,102,241,0.25)' : 'var(--border-main)'}`, cursor: 'pointer' }}>
                                      {v.submissionStatus === 'SubmittedForReview' ? <Send size={10} /> : <Eye size={10} />}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Comments */}
                          <div className="pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                            <CommentThread docId={doc.id} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Right: preview panel ── */}
            {preview && (
              <div className="flex-1 min-w-0 sticky top-4" style={{ height: 'calc(100vh - 120px)' }}>
                <PreviewPanel
                  key={preview.id}
                  docId={preview.id}
                  fileName={preview.fileName}
                  mimeType={preview.mimeType}
                  onClose={() => setPreview(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Compare modal ── */}
      {compareModal && (
        <DocumentCompare
          versions={compareModal.versions}
          initialIdA={compareModal.initialIdA}
          initialIdB={compareModal.initialIdB}
          sectionLabel={compareModal.sectionLabel}
          onClose={() => setCompareModal(null)}
        />
      )}
    </>
  )
}
