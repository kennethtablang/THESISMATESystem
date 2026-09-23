import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { manuscriptService, groupService, documentService } from '../../services/api'
import { toast } from '../../utils/toast'
import TopBar from '../../components/layout/TopBar'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image, Table as TableIcon, Save, Lock, Users, List, ListOrdered, Strikethrough,
  Wifi, WifiOff, ZoomIn, ZoomOut, Download, FileText, ChevronDown, ChevronUp,
  Heading1, Heading2, Heading3, MessageSquare, X, Trash2, FileUp, Check, Highlighter,
  CheckCircle2, Circle, AlertTriangle, BookMarked, ArrowLeft,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Color } from '@tiptap/extension-color'
import Placeholder from '@tiptap/extension-placeholder'
import ImageExt from '@tiptap/extension-image'
import { Table as TableExt } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Collaboration from '@tiptap/extension-collaboration'
import { Extension, Mark, mergeAttributes } from '@tiptap/core'
import { CollaborativeCursors } from '../../lib/CollaborativeCursors'
import * as Y from 'yjs'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { SignalRYjsProvider } from '../../lib/SignalRYjsProvider'
import { downloadDocx, generateDocxBlob } from '../../lib/exportDocx'
import { GrammarCheck } from '../../lib/GrammarCheckExtension'
import { ReviewAnnotations, setReviewAnnotations, anchorForRange } from '../../lib/ReviewAnnotations'
import {
  templateFor, chapterNumber, composeChapterHtml, completionFromHtml, checkCitations,
  htmlToText, LEGACY_FIELD,
} from '../../lib/chapterTemplates'

// Custom FontSize extension (free alternative to @tiptap-pro/extension-font-size)
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() { return { types: ['textStyle'] } },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: el => el.style.fontSize?.replace(/['"]+/g, '') ?? null,
          renderHTML: attrs => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}
        }
      }
    }]
  },
  addCommands() {
    return {
      setFontSize: size => ({ chain }) => chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  }
})

// Inline comment mark — stores commentId, synced via Yjs (students' own comments)
const CommentMark = Mark.create({
  name: 'comment',
  excludes: '',
  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: el => el.getAttribute('data-comment-id'),
        renderHTML: attrs => ({ 'data-comment-id': attrs.commentId }),
      },
    }
  },
  parseHTML() { return [{ tag: 'mark[data-comment-id]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes({ class: 'ms-comment-mark' }, HTMLAttributes), 0]
  },
  addCommands() {
    return {
      setComment: (commentId) => ({ commands }) => commands.setMark(this.name, { commentId }),
      unsetComment: () => ({ commands }) => commands.unsetMark(this.name),
    }
  },
})

const SECTIONS = [
  { key: 'chapter1', label: 'Chapter 1' },
  { key: 'chapter2', label: 'Chapter 2' },
  { key: 'chapter3', label: 'Chapter 3' },
  { key: 'chapter4', label: 'Chapter 4' },
  { key: 'chapter5', label: 'Chapter 5' },
  { key: 'references', label: 'References', subtitle: 'Bibliography' },
].map(s => ({ ...s, subtitle: s.subtitle ?? templateFor(s.key)?.title ?? '' }))

const CHAPTER_KEYS = SECTIONS.filter(s => s.key !== 'references').map(s => s.key)
const MIN_REFERENCES = 30

const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Calibri', value: 'Calibri, sans-serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
]

const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '32']

const USER_COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']
const FALLBACK_REVIEWER = { label: 'Reviewer', color: '#a16207' }

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi)

function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a})`
}

function fmtPHT(isoStr) {
  return new Date(new Date(isoStr).getTime() - 8 * 60 * 60 * 1000)
    .toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })
}

function userColor(uid) {
  let h = 0
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) | 0
  return USER_COLORS[Math.abs(h) % USER_COLORS.length]
}

function sectionLabelOf(key) {
  return key === 'references' ? 'References' : `Chapter ${chapterNumber(key)}`
}

/**
 * Student: /manuscript — writes the group's manuscript.
 * Adviser / panel / subject teacher: /manuscript/review/:groupId — reads it live and leaves
 * highlights and comments in their own colour; they cannot change the text.
 */
export default function ManuscriptEditor() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { groupId: reviewGroupParam } = useParams()
  const [searchParams] = useSearchParams()
  const reviewMode = !!reviewGroupParam

  const requestedKey = searchParams.get('section')
  const [group, setGroup] = useState(undefined)   // undefined=loading, null=no group
  const [activeKey, setActiveKey] = useState(
    SECTIONS.some(s => s.key === requestedKey) ? requestedKey : 'chapter1')
  const [sections, setSections] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [lockStatus, setLockStatus] = useState(null)
  const [revSummary, setRevSummary] = useState(null)   // RevisionSummaryDto
  const [ydoc, setYdoc] = useState(null)
  const [provider, setProvider] = useState(null)
  const [hubState, setHubState] = useState('disconnected') // 'connecting'|'connected'|'disconnected'
  const [finalizing, setFinalizing] = useState(false)
  const [annotations, setAnnotations] = useState([])     // adviser/panel highlights for the open section
  const [reviewers, setReviewers] = useState([])
  const [liveHtml, setLiveHtml] = useState(null)          // composed HTML of the open section, as typed

  const connectionRef = useRef(null)
  const providerRef = useRef(null)
  const activeKeyRef = useRef(activeKey)
  activeKeyRef.current = activeKey

  const myReviewer = useMemo(() => {
    if (!reviewMode) return null
    const r = reviewers.find(x => x.userId === user?.id)
    if (r) return r
    return user?.role === 'Admin' ? { label: 'Subject Teacher', color: FALLBACK_REVIEWER.color } : FALLBACK_REVIEWER
  }, [reviewMode, reviewers, user])
  const myReviewerRef = useRef(myReviewer)
  myReviewerRef.current = myReviewer

  useEffect(() => {
    const load = reviewMode ? groupService.get(Number(reviewGroupParam)) : groupService.myGroup()
    load
      .then(g => setGroup(g))
      .catch(err => {
        // Only a 404 means "no group"; other failures should not tell the student they have none.
        if (err.status !== 404) toast.error(err.message || 'An error occurred while loading the group.')
        setGroup(null)
      })
  }, [reviewMode, reviewGroupParam])

  useEffect(() => {
    if (!group) return
    const loadSections = reviewMode ? manuscriptService.byGroup(group.id) : manuscriptService.myGroup()
    loadSections
      .then(data => {
        const map = {}
        data.forEach(s => { map[s.sectionKey] = s })
        setSections(map)
      })
      .catch(err => toast.error(err.message || 'An error occurred while loading the manuscript.'))
    if (reviewMode) {
      manuscriptService.revisionSummary(group.id).then(setRevSummary).catch(() => {})
      manuscriptService.reviewers(group.id).then(setReviewers).catch(() => {})
    } else {
      manuscriptService.voteStatus().then(setLockStatus).catch(() => {})
      manuscriptService.myRevisionSummary().then(setRevSummary).catch(() => {})
    }
  }, [group, reviewMode])

  // Adviser/panel highlights of the open section
  const loadAnnotations = useCallback((key) => {
    if (!group) return
    const req = reviewMode ? manuscriptService.comments(group.id, key) : manuscriptService.myGroupComments(key)
    req
      .then(list => { if (activeKeyRef.current === key) setAnnotations((list ?? []).filter(c => c.quote)) })
      .catch(() => {})
  }, [group, reviewMode])
  const loadAnnotationsRef = useRef(loadAnnotations)
  loadAnnotationsRef.current = loadAnnotations

  useEffect(() => { loadAnnotations(activeKey) }, [activeKey, loadAnnotations])

  // Build SignalR connection once per group
  useEffect(() => {
    if (!group) return
    const conn = new HubConnectionBuilder()
      .withUrl('/hubs/manuscript', { accessTokenFactory: () => manuscriptService.getToken() })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    conn.onreconnecting(() => setHubState('connecting'))
    conn.onreconnected(async () => {
      setHubState('connected')
      // Re-join the section room after reconnect so the hub resumes sending updates
      await conn.invoke('JoinSection', group.id, activeKeyRef.current).catch(console.warn)
    })
    conn.onclose(() => setHubState('disconnected'))
    // A reviewer added or removed a highlight in this section
    conn.on('AnnotationsChanged', key => {
      if (key === activeKeyRef.current) loadAnnotationsRef.current(key)
    })

    let active = true  // guards against StrictMode double-mount race
    setHubState('connecting')
    conn.start()
      .then(() => {
        if (!active) return
        setHubState('connected')
        connectionRef.current = conn
        activateProvider(group.id, activeKeyRef.current, conn)
      })
      .catch(() => { if (active) setHubState('disconnected') })

    return () => {
      active = false
      providerRef.current?.disconnect()
      providerRef.current = null
      conn.stop()
      connectionRef.current = null
    }
  }, [group]) // eslint-disable-line react-hooks/exhaustive-deps -- activateProvider reads refs only

  function activateProvider(groupId, sectionKey, conn) {
    const doc = new Y.Doc()
    const prov = new SignalRYjsProvider(doc, groupId, sectionKey, conn, { readOnly: reviewMode })
    prov.setUser({
      name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || (reviewMode ? 'Reviewer' : 'Student'),
      color: reviewMode ? (myReviewerRef.current?.color ?? FALLBACK_REVIEWER.color) : userColor(user?.id ?? 'x'),
    })
    prov.connect().catch(console.warn)
    providerRef.current = prov
    setYdoc(doc)
    setProvider(prov)
  }

  function switchSection(key) {
    if (key === activeKey) return
    providerRef.current?.disconnect()
    providerRef.current = null
    setYdoc(null)
    setProvider(null)
    setAnnotations([])
    setLiveHtml(null)
    setActiveKey(key)
    if (connectionRef.current && group) {
      activateProvider(group.id, key, connectionRef.current)
    }
  }

  const handleSave = useCallback(async (html, currentYdoc) => {
    if (reviewMode || !group || !currentYdoc) return
    const state = Y.encodeStateAsUpdate(currentYdoc)
    let binary = ''
    for (let i = 0; i < state.length; i++) binary += String.fromCharCode(state[i])
    const b64 = btoa(binary)
    // Pin the section now: reading the ref after the await filed the result (and the AckSave)
    // under whichever section the student had switched to while the save was in flight.
    const sectionKey = activeKeyRef.current
    setSaving(true)
    setSaveError('')
    try {
      const result = await manuscriptService.saveSection(sectionKey, { content: html, yjsState: b64 })
      setSections(prev => ({ ...prev, [sectionKey]: result }))
      connectionRef.current?.invoke('AckSave', group.id, sectionKey).catch(() => {})
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }, [group, reviewMode])

  async function handleFinalize(html, sectionLabel) {
    if (!group?.id || finalizing || reviewMode) return
    setFinalizing(true)
    setSaveError('')
    try {
      const blob = await generateDocxBlob({
        sections: [{ label: sectionLabel, html: html ?? '' }],
        title: sectionLabel,
      })
      const fd = new FormData()
      fd.append('file', blob, `${activeKey}.docx`)
      await documentService.finalizeSection(group.id, activeKey, fd)
      toast.success(`${sectionLabelOf(activeKey)} exported to Upload Documents.`)
    } catch (err) {
      setSaveError(err.message || 'Failed to export section.')
    } finally {
      setFinalizing(false)
    }
  }

  async function handleAddAnnotation(data) {
    if (!group) return false
    try {
      await manuscriptService.addComment(group.id, activeKey, data)
      loadAnnotations(activeKey)
      return true
    } catch (err) {
      toast.error(err.message || 'Could not save the highlight.')
      return false
    }
  }

  async function handleDeleteAnnotation(id) {
    if (!group) return
    try {
      await manuscriptService.deleteComment(group.id, id)
      loadAnnotations(activeKey)
    } catch (err) {
      toast.error(err.message || 'Could not remove the highlight.')
    }
  }

  // Latest HTML per section: what is being typed for the open one, the saved copy otherwise
  const htmlOf = useCallback(key => (key === activeKey && liveHtml != null) ? liveHtml : (sections[key]?.content ?? ''),
    [activeKey, liveHtml, sections])

  const progressByKey = useMemo(() => {
    const out = {}
    CHAPTER_KEYS.forEach(k => { out[k] = completionFromHtml(k, htmlOf(k)) })
    return out
  }, [htmlOf])

  const overallPercent = Math.round(
    CHAPTER_KEYS.reduce((n, k) => n + (progressByKey[k]?.percent ?? 0), 0) / CHAPTER_KEYS.length)

  const chapterTexts = useMemo(() => {
    const out = {}
    CHAPTER_KEYS.forEach(k => { out[k] = htmlToText(sections[k]?.content ?? '') })
    return out
  }, [sections])

  const citations = useMemo(() => checkCitations(htmlOf('references'), chapterTexts), [htmlOf, chapterTexts])

  if (group === undefined) return <><TopBar title="Manuscript Editor" /><PageLoader /></>

  if (group === null) {
    return (
      <div>
        <TopBar title={reviewMode ? 'Manuscript Review' : 'Manuscript Editor'} />
        <div className="flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
          <div className="rounded-2xl p-10 text-center max-w-md"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(201,168,76,0.1)' }}>
              <Users size={28} style={{ color: '#c9a84c' }} />
            </div>
            <h2 className="font-display font-semibold text-lg mb-2" style={{ color: 'var(--text-heading)' }}>
              {reviewMode ? 'Group not available' : 'No Group Yet'}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              {reviewMode
                ? 'This group could not be loaded, or you are not its adviser or panelist.'
                : 'You need to be part of a capstone group before you can use the manuscript editor.'}
            </p>
            <button className="btn-primary" onClick={() => navigate(reviewMode ? '/documents' : '/groups')}>
              {reviewMode ? 'Back to Manuscripts' : 'View Groups'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isLocked = !reviewMode && (lockStatus?.isLocked ?? false)
  const readOnly = reviewMode || isLocked
  const citedCount = citations.filter(c => c.status === 'cited').length

  return (
    <div>
      <TopBar
        title={reviewMode ? 'Manuscript Review' : 'Manuscript Editor'}
        subtitle={reviewMode
          ? `${group.groupName} · highlight and comment`
          : `${group.groupName} · Revision ${lockStatus?.revision ?? 1}`}
      />

      <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Section sidebar */}
        <aside className="flex flex-col shrink-0 border-r overflow-hidden"
          style={{ width: 196, background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
          {reviewMode && (
            <button onClick={() => navigate('/documents')}
              className="mx-2 mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}>
              <ArrowLeft size={12} /> Back to Manuscripts
            </button>
          )}
          {/* "All reviewed" celebration banner inside sidebar */}
          {!reviewMode && revSummary?.isCurrentRevisionReviewed && isLocked && (
            <div className="mx-2 mt-2 px-3 py-2 rounded-xl text-center"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-[10px] font-semibold leading-tight" style={{ color: '#16a34a' }}>
                ✓ All sections reviewed
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: '#16a34a', opacity: 0.75 }}>
                Your adviser has left feedback
              </p>
            </div>
          )}
          <div className="p-2.5 space-y-0.5 flex-1 overflow-y-auto">
            {SECTIONS.map(s => {
              const active   = activeKey === s.key
              const st       = revSummary?.sections?.find(r => r.sectionKey === s.key)
              const cmtCount = st?.commentCount ?? 0
              const progress = progressByKey[s.key]
              const isRefs   = s.key === 'references'
              const refTotal = isRefs ? citations.length : 0
              const complete = isRefs ? refTotal > 0 && citedCount === refTotal : progress?.percent === 100
              const barColor = complete ? '#16a34a' : '#c9a84c'

              return (
                <button key={s.key} onClick={() => switchSection(s.key)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: active ? 'rgba(201,168,76,0.10)' : 'transparent',
                    border: `1px solid ${active ? 'rgba(201,168,76,0.22)' : 'transparent'}`,
                  }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate flex-1"
                      style={{ color: active ? '#c9a84c' : 'var(--text-primary)' }}>
                      {s.label}
                    </span>
                    {!isRefs && (
                      <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: barColor }}>
                        {progress?.percent ?? 0}%
                      </span>
                    )}
                    {isRefs && refTotal > 0 && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                        title="References cited in Chapters 1–5"
                        style={{
                          background: complete ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: complete ? '#16a34a' : '#ef4444',
                        }}>
                        {citedCount}/{refTotal}
                      </span>
                    )}
                    {/* Reviewer comment indicator */}
                    {cmtCount > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                        title={`${cmtCount} reviewer highlight${cmtCount !== 1 ? 's' : ''}`}
                        style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        {cmtCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] mt-0.5 truncate uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {s.subtitle}
                  </p>
                  {!isRefs && (
                    <>
                      <div className="h-1 rounded-full mt-1.5" style={{ background: 'var(--bg-subtle)' }}>
                        <div className="h-1 rounded-full transition-all duration-500"
                          style={{ width: `${progress?.percent ?? 0}%`, background: barColor }} />
                      </div>
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        {progress?.filled ?? 0} of {progress?.total ?? 0} sub-topics
                      </p>
                    </>
                  )}
                  {isRefs && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      {refTotal} of {MIN_REFERENCES} references
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Overall progress (replaces the old finalize vote) */}
          <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border-main)' }}>
            {isLocked ? (
              <div className="text-center py-1">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-xs font-semibold"
                  style={{ color: '#c9a84c' }}>
                  <Lock size={11} /> Locked for review
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Rev {lockStatus?.revision} — waiting for your adviser
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Chapters 1–5</span>
                  <span className="text-xs font-bold tabular-nums" style={{ color: overallPercent === 100 ? '#16a34a' : '#c9a84c' }}>
                    {overallPercent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full mb-1.5" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${overallPercent}%`, background: overallPercent === 100 ? '#16a34a' : '#c9a84c' }} />
                </div>
                <p className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                  A chapter is complete when every required sub-topic has content.
                </p>
              </>
            )}
          </div>
        </aside>

        {/* Editor column */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {isLocked && (() => {
            const reviewedCount = revSummary?.sections?.filter(s => s.isReviewed).length ?? 0
            const allReviewed   = revSummary?.isCurrentRevisionReviewed ?? false
            return (
              <div className="flex items-center gap-3 px-4 py-2 shrink-0 text-xs font-medium flex-wrap"
                style={{ background: 'rgba(201,168,76,0.07)', borderBottom: '1px solid rgba(201,168,76,0.15)', color: '#a0832a' }}>
                <Lock size={12} className="shrink-0" />
                <span>Revision {lockStatus?.revision} is locked and read-only until your adviser opens the next revision.</span>
                {revSummary && (
                  <span
                    className="ml-auto px-2 py-0.5 rounded-lg text-[10px] font-semibold"
                    style={{
                      background: allReviewed ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: allReviewed ? '#16a34a' : '#d97706',
                    }}
                  >
                    {allReviewed
                      ? '✓ All sections reviewed'
                      : `${reviewedCount}/6 sections reviewed by adviser`}
                  </span>
                )}
              </div>
            )
          })()}

          {saveError && (
            <div className="px-4 py-2 shrink-0 text-sm flex items-center justify-between"
              style={{ background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }}>
              <span>{saveError}</span>
              <button className="ml-3 text-xs underline" onClick={() => setSaveError('')}>Dismiss</button>
            </div>
          )}

          {ydoc && provider ? (
            <SectionPane
              key={activeKey}
              ydoc={ydoc}
              provider={provider}
              sectionKey={activeKey}
              reviewMode={reviewMode}
              readOnly={readOnly}
              isLocked={isLocked}
              saving={saving}
              sectionData={sections[activeKey]}
              onSave={(html) => handleSave(html, ydoc)}
              onLiveHtml={setLiveHtml}
              hubState={hubState}
              allSections={sections}
              groupName={group?.groupName ?? 'Manuscript'}
              onFinalize={reviewMode ? null : handleFinalize}
              finalizing={finalizing}
              annotations={annotations}
              reviewers={reviewers}
              myReviewer={myReviewer}
              myUserId={user?.id}
              onAddAnnotation={handleAddAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              citations={activeKey === 'references' ? citations : null}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2"
              style={{ color: 'var(--text-muted)' }}>
              <PageLoader />
              <p className="text-xs">Connecting to collaboration server…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── One sub-topic's editor ─────────────────────────────────────────────────────
// Every sub-topic is its own TipTap editor bound to its own fragment of the chapter's Y.Doc,
// so the headings stay fixed and each sub-topic can be counted as filled or not.
function SubEditor({ ydoc, provider, field, placeholder, readOnly, compact, onReady, onChange, onFocused, annotations, activeAnnotationId }) {
  const editor = useEditor({
    extensions: [
      // undoRedo: false → Collaboration manages its own Yjs-based undo history
      // underline: false → we supply it explicitly below to keep the toolbar command name stable
      StarterKit.configure({ history: false, undoRedo: false, underline: false }),
      UnderlineExt,
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize.configure({ types: ['textStyle'] }),
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      ImageExt.configure({ inline: false }),
      TableExt.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Collaboration.configure({ document: ydoc, field }),
      CollaborativeCursors.configure({ provider, field }),
      CommentMark,
      ReviewAnnotations,
      ...(readOnly ? [] : [GrammarCheck]),
    ],
    editable: !readOnly,
    editorProps: {
      attributes: { class: `ms-editor-body${compact ? ' ms-sub-body' : ''}`, spellcheck: 'false' },
    },
  }, [ydoc, provider, field, readOnly])

  useEffect(() => {
    if (!editor) return
    onReady(field, editor)
    return () => onReady(field, null)
  }, [editor, field, onReady])

  useEffect(() => {
    if (!editor) return
    const handleUpdate = () => onChange(field, editor)
    const handleFocus = () => onFocused(field, editor)
    editor.on('update', handleUpdate)
    editor.on('focus', handleFocus)
    return () => {
      editor.off('update', handleUpdate)
      editor.off('focus', handleFocus)
    }
  }, [editor, field, onChange, onFocused])

  useEffect(() => {
    setReviewAnnotations(editor, annotations, activeAnnotationId)
  }, [editor, annotations, activeAnnotationId])

  return <EditorContent editor={editor} />
}

function SectionPane({
  ydoc, provider, sectionKey, reviewMode, readOnly, isLocked, saving, sectionData, onSave, onLiveHtml,
  hubState, allSections, groupName, onFinalize, finalizing, annotations, reviewers, myReviewer, myUserId,
  onAddAnnotation, onDeleteAnnotation, citations,
}) {
  const template = templateFor(sectionKey)
  const sectionLabel = sectionLabelOf(sectionKey)

  const [fontFamily, setFontFamily] = useState('')
  const [fontSize, setFontSize] = useState('12')
  const [textColor, setTextColor] = useState('#000000')
  const [imageError, setImageError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [floatBar, setFloatBar] = useState(null)
  const [commentMode, setCommentMode] = useState(null)   // null | 'student' | 'review'
  const [commentText, setCommentText] = useState('')
  const [savedSelection, setSavedSelection] = useState(null) // { field, from, to }
  const [showCommentPanel, setShowCommentPanel] = useState(true)
  const [commentsData, setCommentsData] = useState({})
  const [railItems, setRailItems] = useState([])
  const [activeCommentId, setActiveCommentId] = useState(null)
  const [paperHeight, setPaperHeight] = useState(1056)
  const [collabUsers, setCollabUsers] = useState([])
  const [hasLegacy, setHasLegacy] = useState(false)
  const [filledFields, setFilledFields] = useState({})
  const [activeEditor, setActiveEditor] = useState(null)
  const [mountedEditors, setMountedEditors] = useState({})   // field → editor, for rendering
  const [, forceToolbar] = useState(0)
  const [showCitations, setShowCitations] = useState(true)

  const exportMenuRef = useRef(null)
  const canvasScrollRef = useRef(null)
  const commentInputRef = useRef(null)
  const pageRef = useRef(null)
  const commentStyleRef = useRef(null)
  const fileInputRef = useRef(null)
  const editorsRef = useRef(new Map())   // field → editor
  // Ref so document-level event closures can read the current value without re-registering
  const commentInputOpenRef = useRef(false)

  // Auto-save
  const autoSaveTimerRef = useRef(null)
  const liveTimerRef = useRef(null)
  const savedFlashTimerRef = useRef(null)
  const prevSavingRef = useRef(false)
  const [recentlySaved, setRecentlySaved] = useState(false)

  // Fields shown: the earlier whole-chapter draft (only while it still has text), then each sub-topic.
  const fields = useMemo(() => {
    if (!template) return [{ key: LEGACY_FIELD, title: null, placeholder: `Start writing ${sectionLabel}…` }]
    const subs = template.subsections.map(s => ({
      key: s.key, title: s.title, optional: !!s.optional,
      placeholder: `Write the ${s.title.toLowerCase()} here…`,
    }))
    return hasLegacy
      ? [{ key: LEGACY_FIELD, title: 'Earlier draft', legacy: true, placeholder: '' }, ...subs]
      : subs
  }, [template, hasLegacy, sectionLabel])

  // Chapters written before the sub-topic format kept everything in the default fragment.
  useEffect(() => {
    if (!template) return
    const frag = ydoc.getXmlFragment(LEGACY_FIELD)
    const check = () => setHasLegacy(frag.length > 0 && frag.toString().replace(/<[^>]+>/g, '').trim().length > 0)
    check()
    frag.observeDeep(check)
    return () => frag.unobserveDeep(check)
  }, [ydoc, template])

  useEffect(() => {
    if (!provider) return
    const sync = () => {
      const states = provider.awareness.getStates()
      const others = []
      states.forEach((state, clientId) => {
        if (clientId !== provider.awareness.clientID && state.user)
          others.push({ ...state.user, cursor: state.cursor ?? null })
      })
      setCollabUsers(others)
    }
    sync()
    provider.awareness.on('change', sync)
    return () => provider.awareness.off('change', sync)
  }, [provider])

  const compose = useCallback(() => {
    const byField = {}
    editorsRef.current.forEach((ed, f) => { if (!ed.isDestroyed) byField[f] = ed.getHTML() })
    return template ? composeChapterHtml(sectionKey, byField) : (byField[LEGACY_FIELD] ?? '')
  }, [template, sectionKey])

  const refreshFilled = useCallback(() => {
    const next = {}
    editorsRef.current.forEach((ed, f) => { if (!ed.isDestroyed) next[f] = !ed.isEmpty })
    setFilledFields(next)
  }, [])

  const publishLive = useCallback(() => {
    clearTimeout(liveTimerRef.current)
    liveTimerRef.current = setTimeout(() => onLiveHtml?.(compose()), 400)
  }, [compose, onLiveHtml])

  const handleReady = useCallback((field, ed) => {
    if (ed) editorsRef.current.set(field, ed)
    else editorsRef.current.delete(field)
    setMountedEditors(Object.fromEntries(editorsRef.current))
    refreshFilled()
  }, [refreshFilled])

  const handleChange = useCallback(() => {
    refreshFilled()
    publishLive()
    if (!readOnly) {
      setRecentlySaved(false)
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => onSave(compose()), 2000)
    }
  }, [refreshFilled, publishLive, readOnly, onSave, compose])

  const handleFocused = useCallback((_field, ed) => setActiveEditor(ed), [])

  useEffect(() => () => { clearTimeout(autoSaveTimerRef.current); clearTimeout(liveTimerRef.current) }, [])

  // Keep toolbar button states in step with the focused editor
  useEffect(() => {
    if (!activeEditor) return
    const tick = () => forceToolbar(t => t + 1)
    activeEditor.on('transaction', tick)
    return () => activeEditor.off('transaction', tick)
  }, [activeEditor])

  const toolbarEditor = activeEditor && !activeEditor.isDestroyed
    ? activeEditor
    : mountedEditors[fields[0]?.key] ?? null

  // Ctrl+S / Cmd+S shortcut — cancel any pending debounce and save immediately
  useEffect(() => {
    if (readOnly) return
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        clearTimeout(autoSaveTimerRef.current)
        onSave(compose())
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [readOnly, onSave, compose])

  // Flash "All changes saved" for 3 s whenever a save completes
  useEffect(() => {
    if (prevSavingRef.current && !saving) {
      setRecentlySaved(true)
      clearTimeout(savedFlashTimerRef.current)
      savedFlashTimerRef.current = setTimeout(() => setRecentlySaved(false), 3000)
    }
    prevSavingRef.current = saving
  }, [saving])

  // Track paper's layout height so the wrapper can be correctly sized for transform: scale()
  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setPaperHeight(entry.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep the ref in sync so stale closures below can read the live value
  useEffect(() => { commentInputOpenRef.current = !!commentMode }, [commentMode])

  // The text selection inside one of the sub-topic editors, if any. Read from the DOM so it
  // also works for a reviewer, whose editors are read-only and never take focus.
  const selectionInfo = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null
    for (const [field, ed] of editorsRef.current) {
      if (ed.isDestroyed) continue
      const dom = ed.view.dom
      if (!dom.contains(sel.anchorNode) || !dom.contains(sel.focusNode)) continue
      let a, b
      try {
        a = ed.view.posAtDOM(sel.anchorNode, sel.anchorOffset)
        b = ed.view.posAtDOM(sel.focusNode, sel.focusOffset)
      } catch { return null }
      if (a === b) return null
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      return { field, editor: ed, from: Math.min(a, b), to: Math.max(a, b), rect }
    }
    return null
  }, [])

  // Floating mini-toolbar: trigger on mouseup/keyup (selectionUpdate fires before
  // the browser commits window.getSelection, so rect would be zero-width there)
  useEffect(() => {
    if (isLocked) return
    const showIfSelected = () => {
      // Don't disturb the toolbar while the comment textarea has focus
      if (commentInputOpenRef.current) return
      requestAnimationFrame(() => {
        if (commentInputOpenRef.current) return
        const info = selectionInfo()
        if (!info) { setFloatBar(null); return }
        setFloatBar({ x: info.rect.left + info.rect.width / 2, y: info.rect.top, field: info.field })
      })
    }
    document.addEventListener('mouseup', showIfSelected)
    document.addEventListener('keyup', showIfSelected)
    return () => {
      document.removeEventListener('mouseup', showIfSelected)
      document.removeEventListener('keyup', showIfSelected)
      setFloatBar(null)
    }
  }, [isLocked, selectionInfo])

  // Close export menu when clicking outside
  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e) => { if (!exportMenuRef.current?.contains(e.target)) setShowExportMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  // Students' own comments — stored in Yjs ydoc.getMap('comments') for real-time sync
  const commentsMap = useMemo(() => ydoc?.getMap('comments') ?? null, [ydoc])

  useEffect(() => {
    if (!commentsMap) return
    const sync = () => setCommentsData(Object.fromEntries(commentsMap.entries()))
    sync()
    commentsMap.observe(sync)
    return () => commentsMap.unobserve(sync)
  }, [commentsMap])

  // Reviewer highlights grouped by sub-topic, one stable array per editor
  const annotationsByField = useMemo(() => {
    const out = {}
    fields.forEach(f => { out[f.key] = [] })
    ;(annotations ?? []).forEach(a => {
      const f = a.field ?? LEGACY_FIELD
      ;(out[f] ??= []).push(a)
    })
    return out
  }, [annotations, fields])

  // Position the comment bubbles (students' comments and reviewers' highlights) next to their text
  const calcRail = useCallback(() => {
    if (!showCommentPanel || !pageRef.current) { setRailItems([]); return }
    requestAnimationFrame(() => {
      if (!pageRef.current) return
      const pageEl = pageRef.current
      const pageRect = pageEl.getBoundingClientRect()
      const scale = zoom / 100
      const raw = []
      Object.entries(commentsData).forEach(([id, comment]) => {
        const el = pageEl.querySelector(`mark[data-comment-id="${id}"]`)
        if (el) raw.push({ kind: 'student', id, top: el.getBoundingClientRect().top - pageRect.top, comment })
      })
      ;(annotations ?? []).forEach(a => {
        const el = pageEl.querySelector(`[data-annot-id="${a.id}"]`)
        if (el) raw.push({ kind: 'review', id: `r-${a.id}`, top: el.getBoundingClientRect().top - pageRect.top, annotation: a })
      })
      raw.sort((a, b) => a.top - b.top)
      let nextMin = 0
      setRailItems(raw.map(pos => {
        // getBoundingClientRect is already scaled; the rail sits in scaled wrapper coordinates
        const top = Math.max(pos.top, nextMin)
        nextMin = top + 96 * Math.max(scale, 0.8)
        return { ...pos, top }
      }))
    })
  }, [showCommentPanel, commentsData, annotations, zoom])

  useEffect(() => { calcRail() }, [calcRail, filledFields, paperHeight])

  // Reviewer highlights not found in the text any more (the students rewrote that passage)
  const orphanAnnotations = useMemo(() => {
    const placed = new Set(railItems.filter(r => r.kind === 'review').map(r => r.annotation.id))
    return (annotations ?? []).filter(a => !placed.has(a.id))
  }, [annotations, railItems])

  // Ctrl+scroll anywhere in the editor pane → zoom (prevents browser page zoom)
  useEffect(() => {
    const el = canvasScrollRef.current
    if (!el) return
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(z => clamp(z + (e.deltaY < 0 ? 10 : -10), 50, 200))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // Per-comment colour underline + active ring + numbered badge for students' comments
  useEffect(() => {
    let el = commentStyleRef.current
    if (!el) {
      el = document.createElement('style')
      document.head.appendChild(el)
      commentStyleRef.current = el
    }
    const indexMap = {}
    railItems.forEach(({ id }, i) => { indexMap[id] = i + 1 })
    el.textContent = Object.entries(commentsData).map(([id, c]) => {
      const color = /^#[0-9a-f]{6}$/i.test(c.authorColor ?? '') ? c.authorColor : '#c9a84c'
      const active = id === activeCommentId
      const idx    = indexMap[id] ?? ''
      const ring  = active
        ? `outline: 2px solid ${hexAlpha(color, 0.5)}; outline-offset: 1px;`
        : 'outline: none;'
      const badge = idx
        ? `mark[data-comment-id="${id}"]::after { content: "${idx}"; display: inline-block; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 7px; background: ${color}; color: #fff; font-size: 8px; font-weight: 700; text-align: center; line-height: 14px; margin-left: 2px; vertical-align: super; box-sizing: border-box; opacity: ${active ? 1 : 0.75}; }`
        : ''
      return [
        `mark[data-comment-id="${id}"] { background: transparent !important; border-bottom: 2px solid ${color} !important; ${ring} }`,
        `mark[data-comment-id="${id}"]:hover { background: ${hexAlpha(color, 0.12)} !important; }`,
        badge,
      ].join('\n')
    }).join('\n')
  }, [commentsData, activeCommentId, railItems])

  useEffect(() => () => { commentStyleRef.current?.remove() }, [])

  // Focus comment textarea when it appears
  useEffect(() => {
    if (commentMode) setTimeout(() => commentInputRef.current?.focus(), 50)
  }, [commentMode])

  function cancelComment() {
    setCommentMode(null)
    setCommentText('')
    setSavedSelection(null)
    setFloatBar(null)
  }

  function beginComment(mode) {
    // Must capture selection NOW — textarea focus will clear it
    const info = selectionInfo()
    if (!info) return
    setSavedSelection({ field: info.field, from: info.from, to: info.to })
    setCommentMode(mode)
  }

  function addStudentComment(text) {
    const sel = savedSelection
    const ed = sel && editorsRef.current.get(sel.field)
    if (!ed || !commentsMap || !text.trim() || sel.from === sel.to) return

    const stored = JSON.parse(sessionStorage.getItem('tm_user') || '{}')
    const commentId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const author = `${stored.firstName ?? ''} ${stored.lastName ?? ''}`.trim() || 'Student'
    const authorColor = userColor(stored.id ?? 'x')

    // Restore the selection that was saved before the textarea stole focus
    ed.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).setComment(commentId).run()
    commentsMap.set(commentId, { text: text.trim(), author, authorColor, createdAt: new Date().toISOString() })

    cancelComment()
    setActiveCommentId(commentId)
    setShowCommentPanel(true)
  }

  async function addReviewAnnotation(text, selOverride) {
    const sel = selOverride ?? savedSelection
    const ed = sel && editorsRef.current.get(sel.field)
    if (!ed) return
    const anchor = anchorForRange(ed.state.doc, sel.from, sel.to)
    if (!anchor || !anchor.quote.trim()) {
      toast.error('Select text within a single paragraph to highlight it.')
      return
    }
    const ok = await onAddAnnotation({ field: sel.field, quote: anchor.quote, prefix: anchor.prefix, content: text.trim() })
    if (ok) {
      cancelComment()
      window.getSelection()?.removeAllRanges()
      setShowCommentPanel(true)
    }
  }

  function highlightOnly() {
    const info = selectionInfo()
    if (!info) return
    addReviewAnnotation('', { field: info.field, from: info.from, to: info.to })
  }

  function deleteStudentComment(commentId) {
    if (!commentsMap) return
    commentsMap.delete(commentId)

    editorsRef.current.forEach(ed => {
      if (ed.isDestroyed) return
      const { state } = ed
      const commentMarkType = state.schema.marks.comment
      if (!commentMarkType) return
      const tr = state.tr
      let modified = false
      state.doc.descendants((node, pos) => {
        if (!node.isText) return
        if (node.marks.some(m => m.type === commentMarkType && m.attrs.commentId === commentId)) {
          tr.removeMark(pos, pos + node.nodeSize, commentMarkType)
          modified = true
        }
      })
      if (modified) ed.view.dispatch(tr)
    })

    if (activeCommentId === commentId) setActiveCommentId(null)
  }

  function jumpToRailItem(id) {
    setActiveCommentId(id)
    const selector = id.startsWith('r-') ? `[data-annot-id="${id.slice(2)}"]` : `mark[data-comment-id="${id}"]`
    requestAnimationFrame(() => {
      pageRef.current?.querySelector(selector)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    })
  }

  function jumpToUser(cursor) {
    if (!cursor) return
    const ed = editorsRef.current.get(cursor.field ?? LEGACY_FIELD)
    if (!ed || ed.isDestroyed) return
    const pos = clamp(cursor.from, 0, ed.state.doc.content.size)
    ed.chain().setTextSelection(pos).scrollIntoView().run()
  }

  async function handleExportSection() {
    setShowExportMenu(false)
    await downloadDocx({
      sections: [{ label: sectionLabel, html: compose() }],
      filename: `${sectionKey}.docx`,
      title: sectionLabel,
    })
  }

  async function handleExportAll() {
    setShowExportMenu(false)
    const liveHtml = compose()
    const secs = SECTIONS.map(s => ({
      label: s.label,
      html: s.key === sectionKey ? liveHtml : (allSections?.[s.key]?.content ?? ''),
    }))
    await downloadDocx({
      sections: secs,
      filename: `${(groupName ?? 'Manuscript').replace(/[^a-z0-9]/gi, '_')}_manuscript.docx`,
      title: groupName ?? 'Thesis Manuscript',
    })
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0]
    const ed = toolbarEditor
    if (!file || !ed) return
    e.target.value = ''
    setImageError('')

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image exceeds the 10 MB limit.')
      return
    }

    setImageUploading(true)
    try {
      const result = await manuscriptService.uploadImage(file)
      ed.chain().focus().setImage({ src: result.url }).run()
    } catch (err) {
      setImageError(err.message)
    } finally {
      setImageUploading(false)
    }
  }

  const connected = hubState === 'connected'
  const ed = toolbarEditor
  const requiredFields = fields.filter(f => f.title && !f.optional && !f.legacy)
  const filledCount = requiredFields.filter(f => filledFields[f.key]).length
  const legendReviewers = useMemo(() => {
    if (reviewMode) return reviewers
    const seen = new Map()
    ;(annotations ?? []).forEach(a => {
      if (!seen.has(a.author?.id)) seen.set(a.author?.id, { userId: a.author?.id, fullName: a.author?.fullName, label: a.reviewerLabel, color: a.color })
    })
    return [...seen.values()]
  }, [reviewMode, reviewers, annotations])
  const totalRemarks = Object.keys(commentsData).length + (annotations?.length ?? 0)

  return (
    <div ref={canvasScrollRef} className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
      {/* Toolbar */}
      {!readOnly && ed && (
        <div className="flex items-center gap-1 flex-wrap px-3 py-2 shrink-0 border-b"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

          {/* Font family */}
          <select value={fontFamily}
            onChange={e => {
              setFontFamily(e.target.value)
              if (e.target.value) ed.chain().focus().setFontFamily(e.target.value).run()
              else ed.chain().focus().unsetFontFamily().run()
            }}
            className="text-xs rounded-lg px-2 py-1.5 border"
            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-primary)', minWidth: 132 }}>
            {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          {/* Font size */}
          <select value={fontSize}
            onChange={e => {
              setFontSize(e.target.value)
              ed.chain().focus().setFontSize(e.target.value + 'px').run()
            }}
            className="text-xs rounded-lg px-2 py-1.5 border"
            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-primary)', width: 60 }}>
            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <Sep />

          {/* Text color with swatch preview */}
          <label className="flex items-center gap-1 cursor-pointer rounded-lg px-1.5 py-1 border text-xs transition-all hover:bg-opacity-80"
            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
            title="Text color">
            <span style={{
              display: 'inline-block', width: 12, height: 12, borderRadius: 2,
              background: textColor, border: '1px solid rgba(0,0,0,0.2)'
            }} />
            A
            <input type="color" className="sr-only"
              value={textColor}
              onChange={e => {
                setTextColor(e.target.value)
                ed.chain().focus().setColor(e.target.value).run()
              }} />
          </label>

          <Sep />

          <TB active={ed.isActive('bold')} onClick={() => ed.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <Bold size={13} />
          </TB>
          <TB active={ed.isActive('italic')} onClick={() => ed.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <Italic size={13} />
          </TB>
          <TB active={ed.isActive('underline')} onClick={() => ed.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <UnderlineIcon size={13} />
          </TB>
          <TB active={ed.isActive('strike')} onClick={() => ed.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough size={13} />
          </TB>

          <Sep />

          <TB active={ed.isActive({ textAlign: 'left' })} onClick={() => ed.chain().focus().setTextAlign('left').run()} title="Align Left">
            <AlignLeft size={13} />
          </TB>
          <TB active={ed.isActive({ textAlign: 'center' })} onClick={() => ed.chain().focus().setTextAlign('center').run()} title="Align Center">
            <AlignCenter size={13} />
          </TB>
          <TB active={ed.isActive({ textAlign: 'right' })} onClick={() => ed.chain().focus().setTextAlign('right').run()} title="Align Right">
            <AlignRight size={13} />
          </TB>
          <TB active={ed.isActive({ textAlign: 'justify' })} onClick={() => ed.chain().focus().setTextAlign('justify').run()} title="Justify">
            <AlignJustify size={13} />
          </TB>

          <Sep />

          <TB active={ed.isActive('bulletList')} onClick={() => ed.chain().focus().toggleBulletList().run()} title="Bullet List">
            <List size={13} />
          </TB>
          <TB active={ed.isActive('orderedList')} onClick={() => ed.chain().focus().toggleOrderedList().run()} title="Numbered List">
            <ListOrdered size={13} />
          </TB>

          <Sep />

          <TB onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
            title={imageUploading ? 'Uploading…' : 'Insert Image (max 10 MB)'}>
            <Image size={13} />
          </TB>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleImageFile} />

          <TB onClick={() => ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert 3×3 Table">
            <TableIcon size={13} />
          </TB>

          <div className="flex-1" />

          <ExportMenu
            menuRef={exportMenuRef} open={showExportMenu} setOpen={setShowExportMenu}
            onSection={handleExportSection} onAll={handleExportAll}
          />

          {onFinalize && (
            <button
              className="text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 rounded-lg font-medium transition-all"
              onClick={() => onFinalize(compose(), sectionLabel)}
              disabled={finalizing || saving}
              title="Export this section to Upload Documents for adviser review"
              style={{
                background: 'rgba(99,102,241,0.1)',
                color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.25)',
                opacity: (finalizing || saving) ? 0.6 : 1,
              }}>
              {finalizing
                ? <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                : <FileUp size={12} />}
              {finalizing ? 'Exporting…' : 'Finalize'}
            </button>
          )}
          <button
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0"
            onClick={() => { clearTimeout(autoSaveTimerRef.current); onSave(compose()) }}
            disabled={saving}>
            <Save size={12} />
            {saving ? 'Saving…' : 'Save'}
            {!saving && <kbd className="ml-0.5 opacity-60 text-xs" style={{ fontSize: 10 }}>Ctrl+S</kbd>}
          </button>
        </div>
      )}

      {/* Reviewer bar — who is highlighting in which colour */}
      {reviewMode && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-2 shrink-0 border-b text-xs"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-secondary)' }}>
          <Highlighter size={13} style={{ color: myReviewer?.color }} />
          <span>
            Select text to <strong>highlight</strong> or <strong>comment</strong>. You are highlighting as{' '}
            <span className="font-semibold" style={{ color: myReviewer?.color }}>{myReviewer?.label}</span>.
          </span>
          <div className="flex-1" />
          <ExportMenu
            menuRef={exportMenuRef} open={showExportMenu} setOpen={setShowExportMenu}
            onSection={handleExportSection} onAll={handleExportAll}
          />
        </div>
      )}

      {/* Image upload error */}
      {imageError && (
        <div className="px-4 py-1.5 shrink-0 text-xs flex items-center justify-between"
          style={{ background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }}>
          {imageError}
          <button className="ml-2 underline" onClick={() => setImageError('')}>✕</button>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 shrink-0 border-b text-xs flex-wrap"
        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
        <span>{sectionData?.wordCount?.toLocaleString() ?? 0} words</span>
        {template && (
          <span className="font-semibold" style={{ color: filledCount === requiredFields.length ? '#16a34a' : '#c9a84c' }}>
            {filledCount}/{requiredFields.length} sub-topics · {Math.round(filledCount / Math.max(requiredFields.length, 1) * 100)}% complete
          </span>
        )}

        {saving ? (
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin opacity-60" />
            Saving…
          </span>
        ) : recentlySaved ? (
          <span className="flex items-center gap-1" style={{ color: '#16a34a' }}>
            <Check size={10} />
            All changes saved
          </span>
        ) : sectionData?.updatedAt ? (
          <span>
            Saved {fmtPHT(sectionData.updatedAt)}
            {sectionData.updatedBy?.fullName ? ` by ${sectionData.updatedBy.fullName}` : ''}
          </span>
        ) : (
          <span>Not yet saved</span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {/* Reviewer colour legend */}
          {legendReviewers.length > 0 && (
            <span className="flex items-center gap-2">
              {legendReviewers.map(r => (
                <span key={r.userId ?? r.label} className="flex items-center gap-1" title={r.fullName}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: r.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 10 }}>{r.label}</span>
                </span>
              ))}
            </span>
          )}

          {readOnly && (
            <span className="flex items-center gap-1" style={{ color: '#c9a84c' }}>
              <Lock size={10} /> Read-only
            </span>
          )}

          {/* Co-editor presence avatars — click to jump to their cursor */}
          {collabUsers.length > 0 && (
            <span className="flex items-center gap-1.5">
              <Users size={10} style={{ color: 'var(--text-muted)' }} />
              <span className="flex -space-x-1">
                {collabUsers.map((u, i) => (
                  <span key={i}
                    onClick={() => jumpToUser(u.cursor)}
                    title={u.cursor ? `Jump to ${u.name}'s cursor` : u.name}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: u.color, border: '2px solid #fff',
                      fontSize: 9, fontWeight: 700, color: '#fff',
                      display: 'inline-flex', alignItems: 'center',
                      justifyContent: 'center', flexShrink: 0,
                      cursor: u.cursor ? 'pointer' : 'default',
                      boxShadow: `0 0 0 1.5px ${u.color}55`,
                    }}>
                    {(u.name?.[0] ?? '?').toUpperCase()}
                  </span>
                ))}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                {collabUsers.length === 1
                  ? `${collabUsers[0].name} is here`
                  : `${collabUsers.length} others here`}
              </span>
            </span>
          )}

          <span className="flex items-center gap-1" style={{ color: connected ? '#16a34a' : '#f59e0b' }}
            title={connected ? 'Collaboration active' : 'Reconnecting…'}>
            {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {connected ? 'Live' : 'Reconnecting…'}
          </span>

          {/* Comment annotations toggle */}
          <button
            onClick={() => setShowCommentPanel(v => !v)}
            className="flex items-center gap-1.5 transition-all"
            title={showCommentPanel ? 'Hide comments' : 'Show comments'}
            style={{
              color: showCommentPanel ? '#c9a84c' : 'var(--text-muted)',
              fontSize: 11, padding: '2px 7px', borderRadius: 5,
              background: showCommentPanel ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: `1px solid ${showCommentPanel ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
            }}>
            <MessageSquare size={10} />
            <span>Comments</span>
            {totalRemarks > 0 && (
              <span style={{
                background: '#c9a84c', color: '#0a1628', fontSize: 9, fontWeight: 700,
                borderRadius: 8, padding: '0 4px', lineHeight: '14px',
              }}>
                {totalRemarks}
              </span>
            )}
          </button>

          {/* Word-style zoom slider — bottom-right */}
          <span className="flex items-center gap-1.5 border-l pl-3 ml-1"
            style={{ borderColor: 'var(--border-main)' }}>
            <button onClick={() => setZoom(z => Math.max(50, z - 10))} title="Zoom out"
              className="flex items-center justify-center w-4 h-4 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ZoomOut size={11} />
            </button>
            <input
              type="range" min={50} max={200} step={10} value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{ width: 72, accentColor: '#c9a84c', cursor: 'pointer', margin: 0 }}
              title={`Zoom: ${zoom}%`}
            />
            <button onClick={() => setZoom(z => Math.min(200, z + 10))} title="Zoom in"
              className="flex items-center justify-center w-4 h-4 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}>
              <ZoomIn size={11} />
            </button>
            <button onClick={() => setZoom(100)} title="Reset to 100%"
              style={{
                fontSize: 10, color: 'var(--text-muted)', minWidth: 34,
                textAlign: 'right', fontVariantNumeric: 'tabular-nums',
              }}>
              {zoom}%
            </button>
          </span>
        </div>
      </div>

      {/* Reference citation check */}
      {citations && (
        <CitationPanel citations={citations} open={showCitations} onToggle={() => setShowCitations(v => !v)} />
      )}

      {/* Canvas — gray Word-style background, scrollable */}
      <div className="flex-1 overflow-auto" style={{ background: '#525659', minWidth: 0 }}>
        {/*
          minWidth: max-content prevents the centering flex container from ever being
          narrower than its content, so overflow is always to the RIGHT and the scroll
          container handles it with scrollbars — the toolbar stays untouched.
        */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '28px 24px',
          minHeight: '100%',
          minWidth: 'max-content',
        }}>
          <div style={{
            position: 'relative',
            width: 816 * (zoom / 100) + (showCommentPanel ? 250 : 0),
            height: paperHeight * (zoom / 100),
            flexShrink: 0,
          }}>
            {/* Paper — scaled via CSS transform, not CSS zoom */}
            <div ref={pageRef}
              style={{
                background: '#fff',
                width: 816,
                minHeight: 1056,
                padding: '96px 96px 96px 114px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
                position: 'absolute',
                top: 0,
                left: 0,
                transformOrigin: 'top left',
                transform: `scale(${zoom / 100})`,
              }}
              onClick={(e) => {
                const mark = e.target.closest('mark[data-comment-id]')
                const annot = e.target.closest('[data-annot-id]')
                const id = annot ? `r-${annot.getAttribute('data-annot-id')}` : mark?.getAttribute('data-comment-id')
                if (id) {
                  setActiveCommentId(id)
                  setShowCommentPanel(true)
                }
              }}>
              {/* Chapter heading — fixed by the format, not editable */}
              <div className="ms-chapter-head">
                {template ? (
                  <>
                    <p>Chapter {chapterNumber(sectionKey)}</p>
                    <p><strong>{template.title}</strong></p>
                  </>
                ) : (
                  <p><strong>REFERENCES</strong></p>
                )}
              </div>

              {fields.map(f => (
                <div key={f.key} className="ms-subsection">
                  {f.title && (
                    <div className="ms-sub-head">
                      <span className="ms-sub-status" title={f.legacy ? '' : filledFields[f.key] ? 'Has content' : f.optional ? 'Optional' : 'Not yet written'}>
                        {f.legacy
                          ? <AlertTriangle size={11} style={{ color: '#d97706' }} />
                          : filledFields[f.key]
                            ? <CheckCircle2 size={11} style={{ color: '#16a34a' }} />
                            : <Circle size={11} style={{ color: f.optional ? '#cbd5e1' : '#f59e0b' }} />}
                      </span>
                      <span className="ms-sub-title">
                        {f.title}
                        {f.optional && <span className="ms-sub-optional"> (optional)</span>}
                      </span>
                    </div>
                  )}
                  {f.legacy && (
                    <p className="ms-legacy-note">
                      Text written before the chapter format. Move it into the sub-topics below, then delete it here — it does not count toward completion.
                    </p>
                  )}
                  <div className={f.legacy ? 'ms-legacy-body' : ''}>
                    <SubEditor
                      ydoc={ydoc}
                      provider={provider}
                      field={f.key}
                      placeholder={f.placeholder}
                      readOnly={readOnly}
                      compact={!!template}
                      onReady={handleReady}
                      onChange={handleChange}
                      onFocused={handleFocused}
                      annotations={annotationsByField[f.key]}
                      activeAnnotationId={activeCommentId?.startsWith('r-') ? Number(activeCommentId.slice(2)) : null}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Word-style comment bubbles — anchored to wrapper layout coords */}
            {showCommentPanel && railItems.map((item, idx) => (
              <RailBubble
                key={item.id}
                item={item}
                index={idx + 1}
                left={816 * (zoom / 100) + 20}
                active={activeCommentId === item.id}
                onSelect={() => jumpToRailItem(item.id)}
                canDelete={item.kind === 'student'
                  ? !reviewMode && !readOnly
                  : reviewMode && item.annotation.author?.id === myUserId}
                onDelete={() => item.kind === 'student'
                  ? deleteStudentComment(item.id)
                  : onDeleteAnnotation(item.annotation.id)}
              />
            ))}
            {showCommentPanel && orphanAnnotations.length > 0 && (
              <div style={{
                position: 'absolute', left: 816 * (zoom / 100) + 20, width: 220,
                top: Math.max(paperHeight * (zoom / 100) - 40 - orphanAnnotations.length * 70, (railItems.at(-1)?.top ?? 0) + 110),
              }}>
                <p style={{ fontSize: 10, color: '#e2e8f0', marginBottom: 4 }}>Highlighted text since changed:</p>
                {orphanAnnotations.map(a => (
                  <RailBubble
                    key={a.id}
                    item={{ kind: 'review', id: `r-${a.id}`, annotation: a }}
                    static
                    active={false}
                    onSelect={() => {}}
                    canDelete={reviewMode && a.author?.id === myUserId}
                    onDelete={() => onDeleteAnnotation(a.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating mini-toolbar — appears above selected text */}
      {floatBar && (
        <div
          onMouseDown={e => { if (e.target.tagName !== 'TEXTAREA') e.preventDefault() }}
          style={{
            position: 'fixed',
            left: floatBar.x,
            top: floatBar.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'linear-gradient(145deg, #1e3d6e 0%, #112952 50%, #0a1f3d 100%)',
            border: '1px solid rgba(100,160,255,0.18)',
            borderRadius: 10,
            padding: commentMode ? '6px 8px' : '3px 5px',
            display: 'flex',
            flexDirection: commentMode ? 'column' : 'row',
            alignItems: commentMode ? 'stretch' : 'center',
            gap: commentMode ? 6 : 2,
            zIndex: 'var(--z-dropdown)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(100,160,255,0.08)',
            minWidth: commentMode ? 240 : undefined,
          }}>
          {commentMode ? (
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <MessageSquare size={11} style={{ color: commentMode === 'review' ? myReviewer?.color : '#c9a84c', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c' }}>
                  {commentMode === 'review' ? `Comment as ${myReviewer?.label}` : 'Add Comment'}
                </span>
                <button
                  onClick={cancelComment}
                  style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', lineHeight: 1 }}>
                  <X size={11} />
                </button>
              </div>
              <textarea
                ref={commentInputRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (commentMode === 'review') addReviewAnnotation(commentText)
                    else addStudentComment(commentText)
                  }
                  if (e.key === 'Escape') cancelComment()
                }}
                placeholder="Type a comment… (Enter to save)"
                rows={3}
                style={{
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6, padding: '5px 8px', fontSize: 12, color: '#fff',
                  resize: 'vertical', outline: 'none', width: '100%', lineHeight: 1.5,
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={cancelComment}
                  style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', padding: '3px 8px', borderRadius: 5,
                    border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={() => commentMode === 'review' ? addReviewAnnotation(commentText) : addStudentComment(commentText)}
                  disabled={!commentText.trim()}
                  style={{ fontSize: 11, color: commentText.trim() ? '#0a1628' : 'rgba(255,255,255,0.3)',
                    padding: '3px 10px', borderRadius: 5, fontWeight: 600,
                    background: commentText.trim() ? '#c9a84c' : 'rgba(201,168,76,0.15)',
                    border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed', flex: 1 }}>
                  Add Comment
                </button>
              </div>
            </>
          ) : reviewMode ? (
            /* Reviewer: highlight or comment in their own colour */
            <>
              <FloatBtn onClick={highlightOnly} title="Highlight">
                <Highlighter size={13} style={{ color: myReviewer?.color }} />
                <span>Highlight</span>
              </FloatBtn>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
              <FloatBtn onClick={() => beginComment('review')} title="Highlight and comment">
                <MessageSquare size={13} style={{ color: myReviewer?.color }} />
                <span>Comment</span>
              </FloatBtn>
            </>
          ) : !readOnly && ed ? (
            /* Default mini-toolbar mode */
            <>
              <TB active={ed.isActive('bold')} onClick={() => ed.chain().focus().toggleBold().run()} title="Bold">
                <Bold size={13} />
              </TB>
              <TB active={ed.isActive('italic')} onClick={() => ed.chain().focus().toggleItalic().run()} title="Italic">
                <Italic size={13} />
              </TB>
              <TB active={ed.isActive('underline')} onClick={() => ed.chain().focus().toggleUnderline().run()} title="Underline">
                <UnderlineIcon size={13} />
              </TB>
              <TB active={ed.isActive('strike')} onClick={() => ed.chain().focus().toggleStrike().run()} title="Strikethrough">
                <Strikethrough size={13} />
              </TB>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
              <TB active={ed.isActive('heading', { level: 1 })} onClick={() => ed.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
                <Heading1 size={13} />
              </TB>
              <TB active={ed.isActive('heading', { level: 2 })} onClick={() => ed.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                <Heading2 size={13} />
              </TB>
              <TB active={ed.isActive('heading', { level: 3 })} onClick={() => ed.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
                <Heading3 size={13} />
              </TB>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
              <TB active={false} onClick={() => beginComment('student')} title="Add comment">
                <MessageSquare size={13} />
              </TB>
            </>
          ) : null}
        </div>
      )}

      <style>{`
        .ms-editor-body {
          outline: none;
          font-family: "Times New Roman", serif;
          font-size: 12px;
          line-height: 2;
          color: #1a1a1a;
          min-height: 800px;
        }
        .ms-editor-body.ms-sub-body { min-height: 2em; }
        .ms-editor-body p { margin: 0 0 0.6em; }
        .ms-editor-body ul, .ms-editor-body ol { padding-left: 1.5em; margin: 0.5em 0; }
        .ms-editor-body li { margin: 0.2em 0; }
        .ms-editor-body table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .ms-editor-body td, .ms-editor-body th {
          border: 1px solid #d1d5db; padding: 6px 10px; min-width: 60px; vertical-align: top;
        }
        .ms-editor-body th { background: #f9f5e7; font-weight: 600; }
        .ms-editor-body img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; display: block; }
        .ms-editor-body .is-editor-empty:first-child::before {
          color: #bbb; content: attr(data-placeholder);
          float: left; height: 0; pointer-events: none; font-style: italic;
        }
        .ms-chapter-head { text-align: center; font-family: "Times New Roman", serif; font-size: 12px; line-height: 2; color: #1a1a1a; margin-bottom: 0.6em; }
        .ms-chapter-head p { margin: 0; }
        .ms-subsection { position: relative; }
        .ms-sub-head { position: relative; font-family: "Times New Roman", serif; font-size: 12px; font-weight: 700; line-height: 2; color: #1a1a1a; margin-top: 0.4em; user-select: none; }
        .ms-sub-status { position: absolute; left: -22px; top: 50%; transform: translateY(-50%); display: flex; }
        .ms-sub-optional { font-weight: 400; font-style: italic; color: #94a3b8; }
        .ms-legacy-note { font-family: system-ui, sans-serif; font-size: 10px; color: #b45309; background: #fffbeb; border: 1px dashed #f59e0b; border-radius: 4px; padding: 4px 8px; margin: 2px 0 6px; }
        .ms-legacy-body { background: #fffdf5; border-left: 2px solid #f59e0b; padding-left: 8px; margin-bottom: 1em; }
        /* Allow cursor name labels to float above the text without clipping */
        .ProseMirror { overflow: visible; }
        .collab-selection { border-radius: 1px; }
        /* Inline comment highlight — color + active ring injected dynamically per comment */
        .ms-comment-mark {
          border-radius: 2px;
          cursor: pointer;
          transition: background 0.15s, outline 0.15s;
        }
        .ms-review-mark { border-radius: 2px; cursor: pointer; }
        /* LanguageTool grammar/spelling underlines */
        .lt-spelling {
          text-decoration: underline wavy #ef4444;
          text-decoration-skip-ink: none;
        }
        .lt-grammar {
          text-decoration: underline wavy #3b82f6;
          text-decoration-skip-ink: none;
        }
      `}</style>
    </div>
  )
}

// ── Comment bubble in the right-hand rail ────────────────────────────────────
function RailBubble({ item, index, left, active, onSelect, canDelete, onDelete, static: isStatic }) {
  const review = item.kind === 'review'
  const a = item.annotation
  const c = item.comment
  const clr = review ? (a.color || '#a16207') : (c.authorColor ?? '#c9a84c')
  const author = review ? a.author?.fullName : c.author
  const text = review ? a.content : c.text
  const createdAt = review ? a.createdAt : c.createdAt

  return (
    <div style={isStatic
      ? { marginBottom: 6 }
      : { position: 'absolute', top: item.top, left, width: 220 }}>
      {!isStatic && (
        <div style={{
          position: 'absolute', top: 14, left: -20, width: 20, height: 0,
          borderTop: `1.5px dashed ${clr}`,
          opacity: active ? 1 : 0.5,
        }} />
      )}
      <div
        onClick={onSelect}
        style={{
          background: '#fff',
          border: `1px solid ${active ? hexAlpha(clr, 0.4) : 'rgba(0,0,0,0.13)'}`,
          borderLeft: `3px solid ${clr}`,
          borderRadius: 6,
          padding: '8px 10px',
          cursor: 'pointer',
          boxShadow: active
            ? `0 0 0 2.5px ${hexAlpha(clr, 0.35)}, 0 4px 16px ${hexAlpha(clr, 0.2)}`
            : '0 1px 4px rgba(0,0,0,0.1)',
          transition: 'all 0.15s',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {index != null && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 16, height: 16, padding: '0 4px',
                borderRadius: 8, background: clr, color: '#fff',
                fontSize: 9, fontWeight: 700, flexShrink: 0,
                boxSizing: 'border-box', lineHeight: 1,
              }}>
                {index}
              </span>
            )}
            {review && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#fff', background: clr,
                borderRadius: 3, padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.3,
              }}>
                {a.reviewerLabel}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, color: clr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {author}
            </span>
          </div>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              title="Remove"
              style={{ color: '#ccc', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, marginLeft: 4 }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = '#ccc'}>
              <Trash2 size={11} />
            </button>
          )}
        </div>
        {review && (
          <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 3px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            “{a.quote}”
          </p>
        )}
        {text
          ? <p style={{ fontSize: 11, color: '#333', lineHeight: 1.55, margin: 0 }}>{text}</p>
          : <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>Highlighted</p>}
        <p style={{ fontSize: 10, color: '#999', marginTop: 5, marginBottom: 0 }}>
          {fmtPHT(createdAt)}
        </p>
      </div>
    </div>
  )
}

// ── Reference citation check ────────────────────────────────────────────────
function CitationPanel({ citations, open, onToggle }) {
  const total = citations.length
  const cited = citations.filter(c => c.status === 'cited').length
  const nameOnly = citations.filter(c => c.status === 'name-only').length
  const notCited = total - cited - nameOnly
  const allGood = total > 0 && cited === total
  const accent = allGood ? '#16a34a' : '#ef4444'

  return (
    <div className="shrink-0 border-b" style={{ borderColor: 'var(--border-main)', background: allGood ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.05)' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-left">
        <BookMarked size={13} style={{ color: accent, flexShrink: 0 }} />
        <span className="font-semibold" style={{ color: accent }}>
          Citation check: {cited} of {total} reference{total !== 1 ? 's' : ''} cited in Chapters 1–5
        </span>
        {notCited > 0 && <span style={{ color: '#ef4444' }}>· {notCited} not cited</span>}
        {nameOnly > 0 && <span style={{ color: '#d97706' }}>· {nameOnly} cited with a different year</span>}
        <span style={{ color: total >= MIN_REFERENCES ? '#16a34a' : 'var(--text-muted)' }}>
          · {total}/{MIN_REFERENCES} references
        </span>
        <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3" style={{ maxHeight: 190, overflowY: 'auto' }}>
          {total === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              List each reference as its own paragraph or list item (APA: <em>Last name, Initials. (Year). Title…</em>).
              Each one is matched to the chapters by its key identifier — the first author's last name and year.
            </p>
          ) : (
            <table className="w-full text-xs">
              <tbody>
                {citations.map((c, i) => {
                  const cfg = {
                    'cited':     { color: '#16a34a', label: `Cited in Ch. ${c.chapters.join(', ')}` },
                    'name-only': { color: '#d97706', label: `Name found (Ch. ${c.chapters.join(', ')}) but not with ${c.key?.year}` },
                    'not-cited': { color: '#ef4444', label: 'Not cited in any chapter' },
                  }[c.status]
                  return (
                    <tr key={i} style={{ borderTop: i ? '1px solid var(--border-light)' : 'none' }}>
                      <td className="py-1 pr-3 whitespace-nowrap font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {c.key ? `${c.key.author}${c.key.year ? ` (${c.key.year})` : ''}` : '—'}
                      </td>
                      <td className="py-1 pr-3" style={{ color: 'var(--text-muted)', maxWidth: 380 }}>
                        <span className="block truncate" title={c.entry}>{c.entry}</span>
                      </td>
                      <td className="py-1 whitespace-nowrap font-medium" style={{ color: cfg.color }}>{cfg.label}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function ExportMenu({ menuRef, open, setOpen, onSection, onAll }) {
  return (
    <div ref={menuRef} style={{ position: 'relative' }} className="shrink-0">
      <button onClick={() => setOpen(v => !v)}
        className="text-xs flex items-center gap-1 py-1.5 px-2.5 rounded-lg border transition-all"
        style={{
          borderColor: 'var(--border-main)',
          background: open ? 'var(--bg-subtle)' : 'transparent',
          color: 'var(--text-secondary)',
        }}>
        <Download size={11} />
        Export
        <ChevronDown size={10} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          background: 'var(--bg-card)', border: '1px solid var(--border-main)',
          borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          minWidth: 210, zIndex: 'var(--z-dropdown)', overflow: 'hidden',
        }}>
          <MenuItem icon={FileText} title="Export This Section" desc="Current chapter only · .docx" onClick={onSection} />
          <div style={{ height: 1, background: 'var(--border-main)', margin: '0 12px' }} />
          <MenuItem icon={Download} title="Export Full Manuscript" desc="All chapters · Save first · .docx" onClick={onAll} />
        </div>
      )}
    </div>
  )
}

function MenuItem({ icon: Icon, title, desc, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors"
      style={{ color: 'var(--text-primary)', background: 'transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <Icon size={12} style={{ color: '#c9a84c', flexShrink: 0 }} />
      <div>
        <div className="font-medium">{title}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{desc}</div>
      </div>
    </button>
  )
}

function FloatBtn({ children, onClick, title }) {
  return (
    <button title={title} onClick={onClick}
      className="flex items-center gap-1.5 px-2 h-7 rounded-lg text-xs font-medium transition-all"
      style={{ color: '#e2e8f0' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      {children}
    </button>
  )
}

function TB({ children, active, onClick, disabled, title }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0"
      style={{
        background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
        color: active ? '#c9a84c' : 'var(--text-secondary)',
        border: active ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {children}
    </button>
  )
}

function Sep() {
  return <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: 'var(--border-main)' }} />
}
