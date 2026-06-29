import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Highlight } from '@tiptap/extension-highlight'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import DOMPurify from 'dompurify'
import { renderAsync } from 'docx-preview'
import {
  ArrowLeft, ChevronLeft, ChevronRight,
  CheckCircle, AlertCircle, Clock, User, Users, Send, MessageSquare,
  Download, FileText, Bold, Italic, Underline as UnderlineIcon,
  Highlighter, ChevronDown, Layers, ArrowLeftRight, BookOpen, GraduationCap,
} from 'lucide-react'
import { documentService, groupService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../utils/toast'
import TopBar from '../../components/layout/TopBar'
import DocumentCompare from '../student/DocumentCompare'

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_LABELS = {
  TitlePage: 'Title Page', ApprovalSheet: 'Approval Sheet', Abstract: 'Abstract',
  Acknowledgement: 'Acknowledgement', Dedication: 'Dedication',
  TableOfContents: 'Table of Contents', ListOfTables: 'List of Tables',
  ListOfFigures: 'List of Figures', Chapter1: 'Chapter 1', Chapter2: 'Chapter 2',
  Chapter3: 'Chapter 3', Chapter4: 'Chapter 4', Chapter5: 'Chapter 5',
  References: 'References', Appendices: 'Appendices',
}

const SECTION_ORDER = {
  TitlePage: 1, ApprovalSheet: 2, Abstract: 3, Acknowledgement: 4,
  Dedication: 5, TableOfContents: 6, ListOfTables: 7, ListOfFigures: 8,
  Chapter1: 9, Chapter2: 10, Chapter3: 11, Chapter4: 12,
  Chapter5: 13, References: 14, Appendices: 15,
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function isDocx(mime, name) {
  return mime === DOCX_MIME || mime === 'application/msword' ||
    name?.toLowerCase().endsWith('.docx') || name?.toLowerCase().endsWith('.doc')
}

function isPdf(mime, name) {
  return mime === 'application/pdf' || name?.toLowerCase().endsWith('.pdf')
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en', { dateStyle: 'medium' })
}

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en', { dateStyle: 'short', timeStyle: 'short' })
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const cfg = {
    Draft:              { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: 'Draft' },
    SubmittedForReview: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)',  label: 'Submitted for Review' },
    NeedsRevision:      { color: '#d97706', bg: 'rgba(245,158,11,0.12)',  label: 'Needs Revision' },
    Approved:           { color: '#16a34a', bg: 'rgba(34,197,94,0.12)',   label: 'Approved' },
  }[status] ?? { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: status }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
      {status === 'Approved'           && <CheckCircle size={10} />}
      {status === 'NeedsRevision'      && <AlertCircle size={10} />}
      {status === 'SubmittedForReview' && <Clock size={10} />}
      {cfg.label}
    </span>
  )
}

// ── Rich comment editor toolbar ───────────────────────────────────────────────

function FormatToolbar({ editor }) {
  if (!editor) return null
  const btn = (active, onClick, title, Icon) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg transition-all"
      style={{
        background: active ? 'rgba(201,168,76,0.2)' : 'transparent',
        color: active ? '#c9a84c' : 'var(--text-muted)',
        border: active ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
      }}>
      <Icon size={13} />
    </button>
  )
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 mb-1 rounded-lg"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
      {btn(editor.isActive('bold'),      () => editor.chain().focus().toggleBold().run(),      'Bold',      Bold)}
      {btn(editor.isActive('italic'),    () => editor.chain().focus().toggleItalic().run(),    'Italic',    Italic)}
      {btn(editor.isActive('underline'), () => editor.chain().focus().toggleUnderline().run(), 'Underline', UnderlineIcon)}
      {btn(editor.isActive('highlight'), () => editor.chain().focus().toggleHighlight().run(), 'Highlight', Highlighter)}
      <div className="w-px h-4 mx-1" style={{ background: 'var(--border-main)' }} />
      <input
        type="color"
        title="Text color"
        defaultValue="#c9a84c"
        onChange={e => editor.chain().focus().setColor(e.target.value).run()}
        className="w-5 h-5 rounded cursor-pointer border-0 p-0"
        style={{ background: 'transparent' }}
      />
    </div>
  )
}

// ── Comment bubble ────────────────────────────────────────────────────────────

function CommentBubble({ c }) {
  const isFaculty = c.authorRole === 'Faculty'
  return (
    <li className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{
          background: isFaculty
            ? 'linear-gradient(135deg,#c9a84c,#d4b565)'
            : 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(99,102,241,0.1))',
          color: isFaculty ? '#0a1628' : '#6366f1',
        }}>
        {c.author?.fullName?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            {c.author?.fullName}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: isFaculty ? 'rgba(201,168,76,0.15)' : 'rgba(99,102,241,0.12)', color: isFaculty ? '#c9a84c' : '#6366f1' }}>
            {c.authorRole}
          </span>
          <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>{formatDateTime(c.createdAt)}</span>
        </div>
        <div
          className="text-sm rounded-xl px-3 py-2.5 prose prose-sm max-w-none"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border-light)' }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.content) }}
        />
      </div>
    </li>
  )
}

// ── Document preview pane ─────────────────────────────────────────────────────

function DocPreview({ doc }) {
  const containerRef = useRef(null)
  const pdfBlobRef = useRef(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!doc) return
    let cancelled = false

    // Revoke the previous PDF blob URL immediately
    if (pdfBlobRef.current) {
      URL.revokeObjectURL(pdfBlobRef.current)
      pdfBlobRef.current = null
    }

    // Reset display state — container stays mounted so containerRef stays valid
    setPdfUrl(null)
    setError(null)
    setLoading(true)
    if (containerRef.current) containerRef.current.innerHTML = ''

    async function load() {
      try {
        const token = sessionStorage.getItem('tm_token')
        const res = await fetch(`/api/documents/${doc.id}/download`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Failed to load document.')
        const blob = await res.blob()
        if (cancelled) return

        if (isDocx(doc.mimeType, doc.fileName)) {
          if (containerRef.current) {
            containerRef.current.innerHTML = ''
            await renderAsync(blob, containerRef.current, undefined, {
              className: 'docx-preview-wrap',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              ignoreFonts: false,
              breakPages: true,
              useBase64URL: true,
              useMathMLPolyfill: false,
            })
          }
          if (!cancelled) setLoading(false)
        } else if (isPdf(doc.mimeType, doc.fileName)) {
          const url = URL.createObjectURL(blob)
          if (cancelled) { URL.revokeObjectURL(url); return }
          pdfBlobRef.current = url
          setPdfUrl(url)
          setLoading(false)
        } else {
          if (!cancelled) {
            setError('Preview not available for this file type. Please download to view.')
            setLoading(false)
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [doc?.id])

  const showDocx = !pdfUrl && !error

  return (
    <div className="flex-1 relative overflow-hidden" style={{ background: '#f0f0f0', display: 'flex', flexDirection: 'column' }}>

      {/* Loading overlay — sits on top so the container div stays mounted */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10"
          style={{ background: 'rgba(245,245,240,0.88)' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">{[0,1,2].map(i => (
              <span key={i} className="w-2.5 h-2.5 rounded-full animate-bounce"
                style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
            ))}</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading document…</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center p-8 z-10"
          style={{ background: '#f0f0f0' }}>
          <div className="text-center">
            <FileText size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button
              onClick={() => documentService.downloadFile(doc.id, doc.fileName)}
              className="mt-3 btn-primary text-xs flex items-center gap-1.5 mx-auto">
              <Download size={13} /> Download File
            </button>
          </div>
        </div>
      )}

      {/* PDF viewer */}
      {pdfUrl && !loading && (
        <iframe
          key={pdfUrl}
          src={pdfUrl}
          title={doc.fileName}
          className="absolute inset-0 w-full h-full border-0"
        />
      )}

      {/* DOCX container — always mounted so containerRef is valid when renderAsync runs */}
      <div
        ref={containerRef}
        style={{
          display: showDocx ? 'block' : 'none',
          colorScheme: 'light',
          background: '#f0f0f0',
          color: '#1a1a1a',
          fontSize: '13px',
          lineHeight: 1.6,
          flex: 1,
          overflowY: 'auto',
          padding: '32px 24px',
        }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DocumentReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [doc, setDoc] = useState(null)
  const [group, setGroup] = useState(null)
  const [allDocs, setAllDocs] = useState([])
  const [comments, setComments] = useState([])
  const [versions, setVersions] = useState([])
  const [compareModal, setCompareModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [sendingComment, setSendingComment] = useState(false)
  const [editorEmpty, setEditorEmpty] = useState(true)
  const commentsEndRef = useRef(null)

  const canReview = ['Faculty', 'Admin', 'SuperAdmin'].includes(user?.role)
  const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin'

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: false }),
      Underline,
      TextStyle,
      Color,
    ],
    content: '',
    onUpdate: ({ editor }) => setEditorEmpty(editor.isEmpty),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none text-sm min-h-[80px] p-3',
        style: 'color: var(--text-primary)',
      },
    },
  })

  useEffect(() => {
    async function load() {
      try {
        const [docData, commentsData] = await Promise.all([
          documentService.get(parseInt(id)),
          documentService.comments(parseInt(id)),
        ])
        setDoc(docData)
        setComments(commentsData)

        // Fetch group details for thesis title + members
        if (docData.capstoneGroupId) {
          groupService.get(docData.capstoneGroupId)
            .then(setGroup)
            .catch(() => {})
        }

        // Load version history for Compare feature
        if (docData.totalVersions > 1) {
          documentService.versions(parseInt(id))
            .then(vers => setVersions(vers ?? []))
            .catch(() => {})
        }
      } catch (e) {
        toast.error('Failed to load document.')
        navigate('/documents')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  // Fetch the full document list once for prev/next navigation.
  // Only re-fetches when the role changes (not on every nav click).
  useEffect(() => {
    ;(isAdmin ? documentService.all() : documentService.forAdviser())
      .then(docs => setAllDocs(Array.isArray(docs) ? docs : []))
      .catch(() => {})
  }, [isAdmin])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length])

  async function handleStatusUpdate(newStatus) {
    setUpdatingStatus(true)
    try {
      const updated = await documentService.updateStatus(doc.id, newStatus)
      setDoc(updated)
      const autoContent = newStatus === 'Approved'
        ? 'This document has been approved.'
        : newStatus === 'NeedsRevision'
          ? 'This document has been sent back for further revisions.'
          : null
      if (autoContent) {
        try {
          const autoComment = await documentService.addComment(doc.id, { content: autoContent })
          setComments(prev => [...prev, autoComment])
        } catch { /* non-critical */ }
      }
      toast.success(
        newStatus === 'Approved'
          ? 'Document approved. Students have been notified.'
          : 'Revision requested. Students have been notified.'
      )
    } catch (e) {
      toast.error(e.message || 'Failed to update status.')
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleSendComment() {
    if (!editor || editorEmpty) return
    const html = editor.getHTML()
    setSendingComment(true)
    try {
      const comment = await documentService.addComment(doc.id, { content: html })
      setComments(prev => [...prev, comment])
      editor.commands.clearContent()
    } catch (e) {
      toast.error(e.message || 'Failed to post comment.')
    } finally {
      setSendingComment(false)
    }
  }

  // ── Navigation list ───────────────────────────────────────────────────────
  // Only the current group's sections, one entry per section (latest version),
  // sorted in canonical document order. navIndex matched by section so it works
  // even when viewing an older version in the same chain.
  const navList = (() => {
    if (!doc || !allDocs.length) return []
    const bySection = new Map()
    for (const d of allDocs) {
      if (d.capstoneGroupId !== doc.capstoneGroupId) continue
      if (!d.section) continue
      const cur = bySection.get(d.section)
      if (!cur || (d.version ?? 0) > (cur.version ?? 0)) bySection.set(d.section, d)
    }
    return [...bySection.values()]
      .sort((a, b) => (SECTION_ORDER[a.section] ?? 99) - (SECTION_ORDER[b.section] ?? 99))
  })()
  const navIndex = doc?.section ? navList.findIndex(d => d.section === doc.section) : -1
  const prevDoc = navIndex > 0 ? navList[navIndex - 1] : null
  const nextDoc = navIndex >= 0 && navIndex < navList.length - 1 ? navList[navIndex + 1] : null

  useEffect(() => {
    if (!prevDoc && !nextDoc) return
    function onKey(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      if (e.key === 'ArrowLeft'  && prevDoc) navigate(`/documents/review/${prevDoc.id}`)
      if (e.key === 'ArrowRight' && nextDoc) navigate(`/documents/review/${nextDoc.id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prevDoc?.id, nextDoc?.id])

  if (loading) return (
    <>
      <TopBar title="Document Review" subtitle="Loading…" />
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1">{[0,1,2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
        ))}</div>
      </div>
    </>
  )

  if (!doc) return null

  const sectionLabel = doc.section ? (SECTION_LABELS[doc.section] ?? doc.section) : null

  return (
    <div>
      {/* Top bar */}
      <TopBar
        title={doc.title}
        subtitle={[doc.groupName, sectionLabel].filter(Boolean).join(' · ')}
        left={
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate('/documents')}
              className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)', color: 'var(--text-secondary)' }}>
              <ArrowLeft size={15} />
            </button>
            {navList.length > 1 && (
              <>
                <button
                  onClick={() => prevDoc && navigate(`/documents/review/${prevDoc.id}`)}
                  disabled={!prevDoc}
                  title={prevDoc ? `Previous: ${prevDoc.title}` : 'No previous document'}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-main)',
                    color: prevDoc ? 'var(--text-secondary)' : 'var(--text-muted)',
                    opacity: prevDoc ? 1 : 0.45,
                    cursor: prevDoc ? 'pointer' : 'not-allowed',
                  }}>
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs tabular-nums select-none hidden sm:block"
                  style={{ color: 'var(--text-muted)', minWidth: 36, textAlign: 'center', fontSize: 11 }}>
                  {navIndex + 1}/{navList.length}
                </span>
                <button
                  onClick={() => nextDoc && navigate(`/documents/review/${nextDoc.id}`)}
                  disabled={!nextDoc}
                  title={nextDoc ? `Next: ${nextDoc.title}` : 'No next document'}
                  className="flex items-center justify-center w-7 h-7 rounded-lg transition-all"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-main)',
                    color: nextDoc ? 'var(--text-secondary)' : 'var(--text-muted)',
                    opacity: nextDoc ? 1 : 0.45,
                    cursor: nextDoc ? 'pointer' : 'not-allowed',
                  }}>
                  <ChevronRight size={14} />
                </button>
              </>
            )}
          </div>
        }
      />

      {/* Body: preview + sidebar */}
      <div className="flex" style={{ height: 'calc(100vh - 68px)' }}>

        {/* ── Left: document preview ─────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden" style={{ background: '#f5f5f0' }}>
          <DocPreview doc={doc} />
        </div>

        {/* ── Right: review sidebar ──────────────────────────────────────── */}
        <div
          className="flex flex-col shrink-0 overflow-hidden"
          style={{
            width: 380,
            background: 'var(--bg-sidebar, #0a1628)',
            borderLeft: '1px solid var(--border-sidebar, rgba(255,255,255,0.07))',
          }}>

          {/* Sidebar scroll container */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Thesis title + group members ── */}
            <div className="p-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {/* Thesis title */}
              <div className="flex items-start gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <BookOpen size={14} style={{ color: '#c9a84c' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Thesis Title
                  </p>
                  <p className="text-sm font-semibold leading-snug"
                    style={{ color: 'rgba(255,255,255,0.92)', lineHeight: 1.45 }}>
                    {group?.projectTitle ?? doc.groupName}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {doc.groupName}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Document info ── */}
            <div className="p-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <FileText size={15} style={{ color: '#818cf8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide flex-1"
                      style={{ color: 'rgba(255,255,255,0.3)' }}>Document</p>
                    {navList.length > 1 && (
                      <>
                        <button
                          onClick={() => prevDoc && navigate(`/documents/review/${prevDoc.id}`)}
                          disabled={!prevDoc}
                          title={prevDoc ? `Previous: ${prevDoc.title}` : undefined}
                          className="flex items-center justify-center w-5 h-5 rounded transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            color: prevDoc ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
                            cursor: prevDoc ? 'pointer' : 'not-allowed',
                          }}>
                          <ChevronLeft size={11} />
                        </button>
                        <span className="text-[10px] tabular-nums select-none"
                          style={{ color: 'rgba(255,255,255,0.3)', minWidth: 28, textAlign: 'center' }}>
                          {navIndex >= 0 ? `${navIndex + 1}/${navList.length}` : '—'}
                        </span>
                        <button
                          onClick={() => nextDoc && navigate(`/documents/review/${nextDoc.id}`)}
                          disabled={!nextDoc}
                          title={nextDoc ? `Next: ${nextDoc.title}` : undefined}
                          className="flex items-center justify-center w-5 h-5 rounded transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            color: nextDoc ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)',
                            cursor: nextDoc ? 'pointer' : 'not-allowed',
                          }}>
                          <ChevronRight size={11} />
                        </button>
                      </>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm leading-snug"
                    style={{ color: 'rgba(255,255,255,0.92)' }}>
                    {doc.title}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{doc.fileName}</p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap gap-2 mb-3">
                {sectionLabel && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <Layers size={9} />{sectionLabel}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}>
                  v{doc.version}
                  {doc.totalVersions > 1 && ` of ${doc.totalVersions}`}
                </span>
                <span className="text-[10px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <Clock size={9} />{formatDate(doc.submittedAt)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
                <User size={11} />
                <span>Submitted by <span style={{ color: 'rgba(255,255,255,0.7)' }}>{doc.submittedBy?.fullName}</span></span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Status:</span>
                <StatusBadge status={doc.submissionStatus} />
                <div className="ml-auto flex flex-col items-end gap-1">
                  {doc.totalVersions > 1 && (
                    <button
                      onClick={() => setCompareModal(true)}
                      className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all"
                      style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)' }}>
                      <ArrowLeftRight size={10} />Compare Versions
                    </button>
                  )}
                  <button
                    onClick={() => documentService.downloadFile(doc.id, doc.fileName)}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all"
                    style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Download size={10} />Download
                  </button>
                </div>
              </div>
            </div>

            {/* Review actions — only for faculty/admin, only when submitted */}
            {canReview && doc.submissionStatus === 'SubmittedForReview' && (
              <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-[10px] font-semibold mb-2 uppercase tracking-wide"
                  style={{ color: 'rgba(255,255,255,0.35)' }}>Review Decision</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusUpdate('Approved')}
                    disabled={updatingStatus}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: updatingStatus ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.15)',
                      color: '#16a34a',
                      border: '1px solid rgba(34,197,94,0.3)',
                      opacity: updatingStatus ? 0.6 : 1,
                    }}>
                    <CheckCircle size={12} />Approve
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('NeedsRevision')}
                    disabled={updatingStatus}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: updatingStatus ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.15)',
                      color: '#d97706',
                      border: '1px solid rgba(245,158,11,0.3)',
                      opacity: updatingStatus ? 0.6 : 1,
                    }}>
                    <AlertCircle size={12} />Request Revision
                  </button>
                </div>
              </div>
            )}

            {/* Already reviewed status card */}
            {canReview && (doc.submissionStatus === 'Approved' || doc.submissionStatus === 'NeedsRevision') && (
              <div className="mx-4 mt-4 p-3 rounded-xl"
                style={{
                  background: doc.submissionStatus === 'Approved' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${doc.submissionStatus === 'Approved' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                <p className="text-xs font-semibold mb-0.5"
                  style={{ color: doc.submissionStatus === 'Approved' ? '#16a34a' : '#d97706' }}>
                  {doc.submissionStatus === 'Approved' ? 'Document Approved' : 'Revision Requested'}
                </p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {doc.submissionStatus === 'Approved'
                    ? 'This document has been approved.'
                    : 'Students have been asked to upload a revised version.'}
                </p>
                <button
                  onClick={() => handleStatusUpdate('SubmittedForReview')}
                  disabled={updatingStatus}
                  className="mt-2 text-[10px] underline"
                  style={{ color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Undo decision
                </button>
              </div>
            )}

            {/* Comments */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  Comments & Feedback
                </span>
                {comments.length > 0 && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>
                    {comments.length}
                  </span>
                )}
              </div>

              {comments.length === 0 ? (
                <div className="text-center py-6">
                  <MessageSquare size={24} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No comments yet.</p>
                </div>
              ) : (
                <ul className="space-y-4 mb-2">
                  {comments.map(c => <CommentBubble key={c.id} c={c} />)}
                </ul>
              )}
              <div ref={commentsEndRef} />
            </div>
          </div>

          {/* ── Comment input (pinned to bottom) ──────────────────────────── */}
          <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'var(--bg-sidebar, #0a1628)' }}>
            <FormatToolbar editor={editor} />
            <div className="rounded-xl overflow-hidden mb-2"
              style={{ background: 'var(--bg-card, #fff)', border: '1px solid var(--border-light)' }}>
              <EditorContent editor={editor} />
            </div>
            <button
              onClick={handleSendComment}
              disabled={sendingComment || !editor || editorEmpty}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'linear-gradient(135deg,#c9a84c,#d4b565)',
                color: '#0a1628',
                opacity: (sendingComment || !editor || editorEmpty) ? 0.5 : 1,
                cursor: (sendingComment || !editor || editorEmpty) ? 'not-allowed' : 'pointer',
              }}>
              {sendingComment
                ? <span className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{ borderColor: 'rgba(10,22,40,0.3)', borderTopColor: '#0a1628' }} />
                : <Send size={14} />}
              {sendingComment ? 'Sending…' : 'Post Comment'}
            </button>
          </div>
        </div>
      </div>

      {compareModal && versions.length >= 2 && (() => {
        const sv = [...versions].sort((a, b) => a.version - b.version)
        return (
          <DocumentCompare
            versions={sv}
            initialIdA={sv[sv.length - 2].id}
            initialIdB={sv[sv.length - 1].id}
            sectionLabel={sectionLabel ?? doc.title}
            onClose={() => setCompareModal(false)}
          />
        )
      })()}
    </div>
  )
}
