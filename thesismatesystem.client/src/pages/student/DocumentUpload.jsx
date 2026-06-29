import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import {
  Upload, MessageSquare, Download, Clock, ChevronDown, ChevronUp,
  Send, History, RefreshCw, CheckCircle, Zap, User,
  File as FileIcon, Eye, X, AlertCircle, ArrowLeftRight,
} from 'lucide-react'
import { renderAsync } from 'docx-preview'
import TopBar from '../../components/layout/TopBar'
import { PageLoader } from '../../components/ui/Spinner'
import { documentService, groupService, manuscriptService } from '../../services/api'
import { generateDocxBlob } from '../../lib/exportDocx'
import { toast } from '../../utils/toast'
import DocumentCompare from './DocumentCompare'

const DOCUMENT_SECTIONS = [
  { key: 1,  label: 'Title Page',        hint: 'Cover page with thesis title, authors, and institution' },
  { key: 2,  label: 'Approval Sheet',    hint: 'Signed approval page from the committee' },
  { key: 3,  label: 'Abstract',          hint: 'Brief summary of the research' },
  { key: 4,  label: 'Acknowledgement',   hint: 'Recognition of contributions and support' },
  { key: 5,  label: 'Dedication',        hint: 'Dedication page' },
  { key: 6,  label: 'Table of Contents', hint: 'Chapter and section listing with page numbers' },
  { key: 7,  label: 'List of Tables',    hint: 'Index of all tables in the document' },
  { key: 8,  label: 'List of Figures',   hint: 'Index of all figures in the document' },
  { key: 9,  label: 'Chapter 1',         hint: 'Introduction' },
  { key: 10, label: 'Chapter 2',         hint: 'Review of Related Literature' },
  { key: 11, label: 'Chapter 3',         hint: 'Research Methodology' },
  { key: 12, label: 'Chapter 4',         hint: 'Results and Discussion' },
  { key: 13, label: 'Chapter 5',         hint: 'Conclusion and Recommendations' },
  { key: 14, label: 'References',        hint: 'Bibliography and citations' },
  { key: 15, label: 'Appendices',        hint: 'Supporting materials and attachments' },
]

const SECTION_ENUM_TO_KEY = {
  TitlePage: 1, ApprovalSheet: 2, Abstract: 3, Acknowledgement: 4,
  Dedication: 5, TableOfContents: 6, ListOfTables: 7, ListOfFigures: 8,
  Chapter1: 9, Chapter2: 10, Chapter3: 11, Chapter4: 12,
  Chapter5: 13, References: 14, Appendices: 15,
}

// Sections that have corresponding manuscript editor content (Chapters 1-5 + References)
const MANUSCRIPT_KEY_MAP = {
  9:  'chapter1',
  10: 'chapter2',
  11: 'chapter3',
  12: 'chapter4',
  13: 'chapter5',
  14: 'references',
}

function normalizeDoc(doc) {
  if (!doc) return doc
  const s = doc.section
  const section = s == null ? null : typeof s === 'number' ? s : (SECTION_ENUM_TO_KEY[s] ?? null)
  return { ...doc, section }
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function isDocx(mimeType, fileName) {
  if (!mimeType && !fileName) return false
  return (
    mimeType === DOCX_MIME ||
    mimeType === 'application/msword' ||
    fileName?.toLowerCase().endsWith('.docx') ||
    fileName?.toLowerCase().endsWith('.doc')
  )
}

function isPdf(mimeType, fileName) {
  return mimeType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')
}

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

// ── Preview Panel ──────────────────────────────────────────────────────────────
function PreviewPanel({ docId, fileName, mimeType, onClose }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)

  useEffect(() => {
    let revokeUrl = null
    setLoading(true)
    setError(null)
    setPdfUrl(null)

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
              className: 'docx-render',
              inWrapper: false,
              ignoreWidth: true,
              ignoreHeight: true,
            })
          }
        } else if (isPdf(mimeType, fileName)) {
          const url = URL.createObjectURL(blob)
          revokeUrl = url
          setPdfUrl(url)
        } else {
          setError('Preview not available for this file type. Use Download instead.')
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))

    return () => { if (revokeUrl) URL.revokeObjectURL(revokeUrl) }
  }, [docId, fileName, mimeType])

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden h-full"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-light)' }}>
        <FileIcon size={14} style={{ color: '#c9a84c', flexShrink: 0 }} />
        <span className="flex-1 min-w-0 text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
          {fileName}
        </span>
        <button onClick={onClose} className="btn-ghost p-1.5 shrink-0">
          <X size={14} />
        </button>
      </div>

      {/* Body — always light background so the document page reads like paper */}
      <div className="flex-1 overflow-auto relative" style={{ background: '#f0f0f0' }}>
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: '#f0f0f0' }}>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-xs" style={{ color: '#666' }}>Loading preview…</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center"
            style={{ background: '#f0f0f0' }}>
            <AlertCircle size={32} style={{ color: '#999' }} />
            <p className="text-sm" style={{ color: '#555' }}>{error}</p>
          </div>
        )}

        {!loading && !error && pdfUrl && (
          <embed src={pdfUrl} type="application/pdf" className="w-full h-full" style={{ minHeight: '500px' }} />
        )}

        {!loading && !error && !pdfUrl && (
          <div
            ref={containerRef}
            className="docx-preview-wrapper"
            style={{
              minHeight: '400px',
              padding: '24px',
              colorScheme: 'light',
              background: '#f0f0f0',
              color: '#1a1a1a',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          />
        )}
      </div>
    </div>
  )
}

// ── Comment Thread ─────────────────────────────────────────────────────────────
function CommentThread({ docId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [loadingC, setLoadingC] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    documentService.comments(docId).then(setComments).finally(() => setLoadingC(false))
  }, [docId])

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true); setSendError('')
    try {
      const comment = await documentService.addComment(docId, { content: text.trim() })
      setComments(prev => [...prev, comment]); setText('')
    } catch (err) { setSendError(err.message) }
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
                <div className="flex items-center gap-2 mb-0.5">
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
      {sendError && <p className="text-xs mb-2 px-3 py-1.5 rounded-lg" style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}>{sendError}</p>}
      <div className="flex gap-2">
        <input className="form-input py-2 text-sm" placeholder="Leave a comment…" value={text}
          onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()} disabled={sending} />
        <button onClick={handleSend} className="btn-primary px-3" disabled={!text.trim() || sending}><Send size={14} /></button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function DocumentUpload() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState(null)
  const [expandedSection, setExpandedSection] = useState(null)
  const [uploadingSection, setUploadingSection] = useState(null)
  const [versions, setVersions] = useState({})
  const [uploadingVersionFor, setUploadingVersionFor] = useState(null)
  const [versionFiles, setVersionFiles] = useState({})
  const [versionErrors, setVersionErrors] = useState({})
  const [preview, setPreview] = useState(null) // { id, fileName, mimeType }
  const [submittingId, setSubmittingId] = useState(null)
  const [compareModal, setCompareModal] = useState(null) // { versions, initialIdA, initialIdB, sectionLabel }
  const fileInputRefs = useRef({})
  const versionFileRefs = useRef({})

  useEffect(() => {
    groupService.myGroup()
      .then(g => { setGroup(g); return documentService.byGroup(g.id) })
      .then(docs => setDocs(docs.map(normalizeDoc)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // If multiple chain-roots exist for the same section (e.g. one from a manual
  // upload and one from ManuscriptEditor finalize), pick the best one: prefer
  // SubmittedForReview → NeedsRevision → Approved → Draft, then highest version.
  const docsBySection = (() => {
    const STATUS_RANK = { SubmittedForReview: 0, NeedsRevision: 1, Approved: 2, Draft: 3 }
    const m = new Map()
    for (const d of docs) {
      if (d.section == null) continue
      const cur = m.get(d.section)
      if (!cur) { m.set(d.section, d); continue }
      const rd = (STATUS_RANK[d.submissionStatus] ?? 4) - (STATUS_RANK[cur.submissionStatus] ?? 4)
      if (rd < 0 || (rd === 0 && (d.version ?? 0) > (cur.version ?? 0))) m.set(d.section, d)
    }
    return m
  })()

  function getDocBySection(sectionKey) {
    return docsBySection.get(sectionKey) ?? null
  }

  function openPreview(doc) {
    setPreview({ id: doc.id, fileName: doc.fileName, mimeType: doc.mimeType })
  }

  async function handleSectionUpload(sectionKey, file) {
    if (!file || !group?.id) return
    const section = DOCUMENT_SECTIONS.find(s => s.key === sectionKey)
    setUploadingSection(sectionKey)
    try {
      const fd = new FormData()
      fd.append('CapstoneGroupId', group.id)
      fd.append('Title', section.label)
      fd.append('File', file)
      fd.append('Section', sectionKey)
      const doc = normalizeDoc(await documentService.upload(fd))
      setDocs(prev => [...prev.filter(d => d.section !== sectionKey), doc])
      toast.success(`${section.label} uploaded successfully.`)
    } catch (err) {
      toast.error(err.message || 'Upload failed.')
    } finally {
      setUploadingSection(null)
      if (fileInputRefs.current[sectionKey]) fileInputRefs.current[sectionKey].value = ''
    }
  }

  async function toggleExpandSection(sectionKey) {
    const doc = getDocBySection(sectionKey)
    if (!doc) return
    if (expandedSection === sectionKey) { setExpandedSection(null); return }
    setExpandedSection(sectionKey)
    if (!versions[doc.id]) {
      try {
        const v = await documentService.versions(doc.id)
        setVersions(prev => ({ ...prev, [doc.id]: v }))
      } catch { /* ignore */ }
    }
  }

  async function handleSubmitForReview(docId, sectionKey) {
    const mKey = MANUSCRIPT_KEY_MAP[sectionKey]
    setSubmittingId(docId)
    try {
      let finalDocId = docId

      if (mKey) {
        // For manuscript sections: regenerate a proper DOCX from the latest TipTap content
        const allSections = await manuscriptService.myGroup()
        const sectionData = allSections.find(s => s.sectionKey === mKey)
        if (sectionData?.content) {
          const label = DOCUMENT_SECTIONS.find(s => s.key === sectionKey)?.label ?? mKey
          const blob = await generateDocxBlob({
            sections: [{ label, html: sectionData.content }],
            title: label,
          })
          const fd = new FormData()
          fd.append('file', blob, `${mKey}.docx`)
          // Re-finalize: uploads the fresh DOCX and creates a new tracked version
          const finalized = normalizeDoc(await documentService.finalizeSection(group.id, mKey, fd))
          finalDocId = finalized.id
        }
      }

      await documentService.submit(finalDocId)
      // Reload the full doc list so version numbers and ids are up to date
      const freshDocs = await documentService.byGroup(group.id)
      setDocs(freshDocs.map(normalizeDoc))
      toast.success('Submitted to your adviser for review.')
    } catch (err) {
      toast.error(err.message || 'Failed to submit.')
    } finally {
      setSubmittingId(null)
    }
  }

  async function handleUploadNewVersion(sectionKey, docId) {
    const file = versionFiles[sectionKey]
    if (!file) return
    setVersionErrors(prev => ({ ...prev, [sectionKey]: '' }))
    setUploadingVersionFor(docId)
    try {
      const updated = normalizeDoc(await documentService.uploadNewVersion(docId, file))
      setDocs(prev => prev.map(d =>
        d.id === docId || d.id === updated.originalDocumentId
          ? { ...updated, section: d.section ?? updated.section }
          : d
      ))
      const v = await documentService.versions(updated.id)
      setVersions(prev => ({ ...prev, [updated.id]: v }))
      setVersionFiles(prev => ({ ...prev, [sectionKey]: null }))
      if (versionFileRefs.current[sectionKey]) versionFileRefs.current[sectionKey].value = ''
      toast.success('New version uploaded.')
    } catch (err) {
      setVersionErrors(prev => ({ ...prev, [sectionKey]: err.message }))
    } finally {
      setUploadingVersionFor(null) }
  }

  if (loading) return <><TopBar title="Upload Documents" subtitle="Document & Manuscript Management" /><PageLoader /></>

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

  const uploadedCount = DOCUMENT_SECTIONS.filter(s => getDocBySection(s.key)).length

  return (
    <>
      <TopBar title="Upload Documents" subtitle={group.projectTitle ?? group.groupName} />

      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="page-title">Manuscript Documents</h2>
            <p className="page-subtitle">Upload each section for your adviser to review in order</p>
          </div>
          <div className="text-right shrink-0 ml-4">
            <p className="text-2xl font-bold tabular-nums" style={{ color: '#c9a84c' }}>
              {uploadedCount}<span className="text-base font-normal" style={{ color: 'var(--text-muted)' }}>/{DOCUMENT_SECTIONS.length}</span>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>sections uploaded</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(uploadedCount / DOCUMENT_SECTIONS.length) * 100}%`, background: 'linear-gradient(90deg,#c9a84c,#d4b565)' }} />
        </div>

        {/* Two-column layout when preview is open */}
        <div className={`flex gap-5 items-start ${preview ? '' : 'max-w-3xl'}`}>

          {/* ── Left: section cards ── */}
          <div className={`space-y-3 ${preview ? 'w-[420px] shrink-0' : 'flex-1'}`}>
            {DOCUMENT_SECTIONS.map((section) => {
              const doc = getDocBySection(section.key)
              const isUploaded = !!doc
              const isExpanded = expandedSection === section.key
              const isUploading = uploadingSection === section.key
              const docVersions = doc ? (versions[doc.id] ?? null) : null
              const isPreviewing = preview?.id === doc?.id

              return (
                <div key={section.key} className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: 'var(--bg-card)',
                    border: isPreviewing ? '1px solid rgba(201,168,76,0.5)' : '1px solid var(--border-light)',
                    borderLeft: isUploaded ? '4px solid #c9a84c' : '4px solid var(--border-light)',
                    boxShadow: isPreviewing ? '0 0 0 2px rgba(201,168,76,0.15)' : isExpanded ? '0 4px 20px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                  }}>

                  {/* Card face */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">

                      {/* Badge */}
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                        style={isUploaded
                          ? { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }
                          : { background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        {isUploaded ? <CheckCircle size={16} style={{ color: '#c9a84c' }} /> : section.key}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Title + badges */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm" style={{ color: isUploaded ? 'var(--text-heading)' : 'var(--text-secondary)' }}>
                            {section.label}
                          </p>
                          {isUploaded && doc.isAutoFinalized && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                              style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1' }}>
                              <Zap size={9} /> Auto-finalized
                            </span>
                          )}
                          {isUploaded && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                              style={doc.version > 1
                                ? { background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }
                                : { background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                              v{doc.version}
                            </span>
                          )}
                        </div>

                        {isUploaded ? (
                          <>
                            {/* File info */}
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg mb-1.5 w-fit"
                              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                              <FileIcon size={10} style={{ color: '#c9a84c', flexShrink: 0 }} />
                              <span className="text-xs font-medium truncate max-w-[150px]" style={{ color: 'var(--text-primary)' }}>
                                {doc.fileName}
                              </span>
                              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>· {formatSize(doc.fileSize)}</span>
                            </div>
                            {/* Uploader + meta */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Initials name={doc.submittedBy?.fullName} size={18} />
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{doc.submittedBy?.fullName ?? '—'}</span>
                              </div>
                              <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                <Clock size={10} />{formatDate(doc.submittedAt)}
                              </span>
                              {doc.totalVersions > 1 && (
                                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                                  <History size={10} />{doc.totalVersions}v
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
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{section.hint}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {isUploaded ? (
                          <>
                            <button
                              onClick={() => openPreview(doc)}
                              className="btn-ghost px-2 py-1.5 text-xs flex items-center gap-1"
                              title="Preview document"
                              style={isPreviewing ? { color: '#c9a84c' } : {}}>
                              <Eye size={13} />
                            </button>
                            <button onClick={() => documentService.downloadFile(doc.id, doc.fileName)}
                              className="btn-ghost px-2 py-1.5 text-xs" title="Download">
                              <Download size={13} />
                            </button>
                            <button className="btn-ghost px-2 py-1.5" onClick={() => toggleExpandSection(section.key)}>
                              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </>
                        ) : (
                          <>
                            <input ref={el => fileInputRefs.current[section.key] = el} type="file" className="hidden"
                              accept=".pdf,.doc,.docx"
                              onChange={e => { const f = e.target.files[0]; if (f) handleSectionUpload(section.key, f) }} />
                            <button className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                              disabled={isUploading}
                              onClick={() => fileInputRefs.current[section.key]?.click()}>
                              {isUploading
                                ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />Uploading…</>
                                : <><Upload size={12} />Upload</>}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Submit status / action — right-aligned below the main row */}
                    {isUploaded && (() => {
                      const st = doc.submissionStatus
                      if (st === 'SubmittedForReview') return (
                        <div className="flex justify-end mt-2">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}>
                            <Send size={10} /> Submitted for Review
                          </div>
                        </div>
                      )
                      if (st === 'Approved') return (
                        <div className="flex justify-end mt-2">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <CheckCircle size={10} /> Approved
                          </div>
                        </div>
                      )
                      if (st === 'NeedsRevision') return (
                        <div className="flex justify-end mt-2">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <AlertCircle size={10} /> Needs Revision — upload a new version
                          </div>
                        </div>
                      )
                      return (
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleSubmitForReview(doc.id, section.key)}
                            disabled={submittingId === doc.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            style={{
                              background: 'rgba(99,102,241,0.1)', color: '#6366f1',
                              border: '1px solid rgba(99,102,241,0.25)',
                              opacity: submittingId === doc.id ? 0.6 : 1,
                              cursor: submittingId === doc.id ? 'not-allowed' : 'pointer',
                            }}>
                            {submittingId === doc.id
                              ? <span className="w-3 h-3 border-2 rounded-full animate-spin"
                                  style={{ borderColor: 'rgba(99,102,241,0.3)', borderTopColor: '#6366f1' }} />
                              : <Send size={11} />}
                            {submittingId === doc.id ? 'Submitting…' : 'Finalize & Submit to Adviser'}
                          </button>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Expanded panel */}
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
                                  onClick={() => setCompareModal({
                                    versions: docVersions,
                                    sectionLabel: section.label,
                                  })}
                                  className="ml-auto flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                                  style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', cursor: 'pointer', fontWeight: 600 }}
                                >
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
                                  {/* Compare with previous version */}
                                  {arr[i + 1] && (
                                    <button
                                      onClick={() => setCompareModal({
                                        versions: docVersions,
                                        initialIdA: arr[i + 1].id,
                                        initialIdB: v.id,
                                        sectionLabel: section.label,
                                      })}
                                      title={`Compare v${arr[i + 1].version} → v${v.version}`}
                                      className="shrink-0 flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg"
                                      style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', cursor: 'pointer' }}
                                    >
                                      <ArrowLeftRight size={10} />
                                    </button>
                                  )}
                                  <button onClick={() => openPreview(v)}
                                    className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                                    style={{ color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}>
                                    <Eye size={11} />
                                  </button>
                                  <button onClick={() => documentService.downloadFile(v.id, v.fileName)}
                                    className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                                    style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer' }}>
                                    <Download size={11} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upload new version */}
                        <div>
                          <p className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                            <RefreshCw size={12} /> Upload Corrected Version
                          </p>
                          {versionErrors[section.key] && (
                            <p className="text-xs mb-2 px-3 py-1.5 rounded-lg" style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}>
                              {versionErrors[section.key]}
                            </p>
                          )}
                          <div className="flex items-center gap-2">
                            <input ref={el => versionFileRefs.current[section.key] = el} type="file"
                              accept=".pdf,.doc,.docx" className="form-input text-sm flex-1 min-w-0"
                              onChange={e => setVersionFiles(prev => ({ ...prev, [section.key]: e.target.files[0] ?? null }))} />
                            <button className="btn-primary shrink-0 text-xs px-4 py-2"
                              disabled={!versionFiles[section.key] || uploadingVersionFor === doc.id}
                              onClick={() => handleUploadNewVersion(section.key, doc.id)}>
                              {uploadingVersionFor === doc.id ? 'Uploading…' : 'Upload'}
                            </button>
                          </div>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Preserves full version history.</p>
                        </div>

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

            {uploadedCount === DOCUMENT_SECTIONS.length && (
              <div className="mt-4 p-4 rounded-2xl flex items-center gap-3"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>All 15 sections uploaded</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Your adviser will review each document in the listed order.</p>
                </div>
              </div>
            )}
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
      </div>

      {/* ── Version compare modal ── */}
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
