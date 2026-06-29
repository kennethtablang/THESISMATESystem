import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { manuscriptService, groupService, documentService } from '../../services/api'
import { toast } from '../../utils/toast'
import TopBar from '../../components/layout/TopBar'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image, Table as TableIcon, Save, Lock, Users, List, ListOrdered, Strikethrough,
  Wifi, WifiOff, ZoomIn, ZoomOut, Download, FileText, ChevronDown,
  Heading1, Heading2, Heading3, MessageSquare, X, Trash2, FileUp, Check,
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

// Inline comment mark — stores commentId, synced via Yjs
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
  { key: 'chapter1', label: 'Chapter 1', subtitle: 'Introduction' },
  { key: 'chapter2', label: 'Chapter 2', subtitle: 'RRL' },
  { key: 'chapter3', label: 'Chapter 3', subtitle: 'Methodology' },
  { key: 'chapter4', label: 'Chapter 4', subtitle: 'Results' },
  { key: 'chapter5', label: 'Chapter 5', subtitle: 'Summary' },
  { key: 'references', label: 'References', subtitle: 'Bibliography' },
]

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

function countReferences(html) {
  if (!html) return 0
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const lis = doc.querySelectorAll('li')
  if (lis.length > 0) return lis.length
  const ps = [...doc.querySelectorAll('p')].filter(p => p.textContent.trim().length > 10)
  return ps.length
}

export default function ManuscriptEditor() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [group, setGroup] = useState(undefined)   // undefined=loading, null=no group
  const [activeKey, setActiveKey] = useState('chapter1')
  const [sections, setSections] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [voteStatus, setVoteStatus] = useState(null)
  const [voteLoading, setVoteLoading] = useState(false)
  const [revSummary, setRevSummary] = useState(null)   // RevisionSummaryDto
  const [ydoc, setYdoc] = useState(null)
  const [provider, setProvider] = useState(null)
  const [hubState, setHubState] = useState('disconnected') // 'connecting'|'connected'|'disconnected'
  const [finalizing, setFinalizing] = useState(false)

  const connectionRef = useRef(null)
  const providerRef = useRef(null)
  const activeKeyRef = useRef(activeKey)
  activeKeyRef.current = activeKey

  useEffect(() => {
    groupService.myGroup()
      .then(g => setGroup(g))
      .catch(() => setGroup(null))
  }, [])

  useEffect(() => {
    if (!group) return
    manuscriptService.myGroup()
      .then(data => {
        const map = {}
        data.forEach(s => { map[s.sectionKey] = s })
        setSections(map)
      })
      .catch(() => {})
    manuscriptService.voteStatus().then(setVoteStatus).catch(() => {})
    manuscriptService.myRevisionSummary().then(setRevSummary).catch(() => {})
  }, [group])

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
  }, [group])

  function activateProvider(groupId, sectionKey, conn) {
    const doc = new Y.Doc()
    const prov = new SignalRYjsProvider(doc, groupId, sectionKey, conn)
    prov.setUser({
      name: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Student',
      color: userColor(user?.id ?? 'x'),
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
    setActiveKey(key)
    if (connectionRef.current && group) {
      activateProvider(group.id, key, connectionRef.current)
    }
  }

  const handleSave = useCallback(async (editorInstance, currentYdoc) => {
    if (!editorInstance || !group || !currentYdoc) return
    const html = editorInstance.getHTML()
    const state = Y.encodeStateAsUpdate(currentYdoc)
    let binary = ''
    for (let i = 0; i < state.length; i++) binary += String.fromCharCode(state[i])
    const b64 = btoa(binary)
    setSaving(true)
    setSaveError('')
    try {
      const result = await manuscriptService.saveSection(activeKeyRef.current, { content: html, yjsState: b64 })
      setSections(prev => ({ ...prev, [activeKeyRef.current]: result }))
      connectionRef.current?.invoke('AckSave', group.id, activeKeyRef.current).catch(() => {})
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }, [group])

  async function handleVote() {
    setVoteLoading(true)
    setSaveError('')
    try {
      const status = voteStatus?.currentUserVoted
        ? await manuscriptService.revokeVote()
        : await manuscriptService.castVote()
      setVoteStatus(status)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setVoteLoading(false)
    }
  }

  const FINALIZABLE_SECTIONS = new Set(['chapter1','chapter2','chapter3','chapter4','chapter5','references'])
  const activeSectionLabel = activeKey === 'references'
    ? 'References'
    : `Chapter ${activeKey.replace('chapter', '')}`

  async function handleFinalize(html, sectionLabel) {
    if (!group?.id || finalizing || !FINALIZABLE_SECTIONS.has(activeKey)) return
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
      toast.success(`${activeSectionLabel} exported to Upload Documents.`)
    } catch (err) {
      setSaveError(err.message || 'Failed to export section.')
    } finally {
      setFinalizing(false)
    }
  }

  if (group === undefined) return <><TopBar title="Manuscript Editor" /><PageLoader /></>

  if (group === null) {
    return (
      <div>
        <TopBar title="Manuscript Editor" />
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
              You need to be part of a capstone group before you can use the manuscript editor.
            </p>
            <button className="btn-primary" onClick={() => navigate('/groups')}>View Groups</button>
          </div>
        </div>
      </div>
    )
  }

  const isLocked = voteStatus?.isLocked ?? false
  const votePct = voteStatus ? (voteStatus.voteCount / Math.max(voteStatus.totalMembers, 1)) * 100 : 0
  const referenceCount = countReferences(sections['references']?.content ?? '')
  const hasEnoughReferences = referenceCount >= 30

  return (
    <div>
      <TopBar
        title="Manuscript Editor"
        subtitle={`${group.groupName} · Revision ${voteStatus?.revision ?? 1}`}
      />

      <div className="flex" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Section sidebar */}
        <aside className="flex flex-col shrink-0 border-r overflow-hidden"
          style={{ width: 184, background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
          {/* "All reviewed" celebration banner inside sidebar */}
          {revSummary?.isCurrentRevisionReviewed && isLocked && (
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
              const filled   = !!sections[s.key]?.content
              const active   = activeKey === s.key
              const st       = revSummary?.sections?.find(r => r.sectionKey === s.key)
              const reviewed = st?.isReviewed ?? false
              const cmtCount = st?.commentCount ?? 0

              // Border: active=gold, reviewed=green, otherwise default
              const borderColor = active
                ? 'rgba(201,168,76,0.22)'
                : reviewed ? 'rgba(34,197,94,0.2)' : 'transparent'
              const bgColor = active
                ? 'rgba(201,168,76,0.10)'
                : reviewed ? 'rgba(34,197,94,0.05)' : 'transparent'

              return (
                <button key={s.key} onClick={() => switchSection(s.key)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
                  <div className="flex items-center gap-2">
                    {/* Content dot */}
                    <span className="w-2 h-2 rounded-full shrink-0 transition-colors"
                      style={{ background: filled ? '#16a34a' : active ? '#c9a84c' : 'var(--border-main)' }} />
                    <span className="text-sm font-medium truncate flex-1"
                      style={{ color: active ? '#c9a84c' : 'var(--text-primary)' }}>
                      {s.label}
                    </span>
                    {s.key === 'references' && !isLocked && (
                      <span
                        className="text-[9px] font-bold px-1 py-0.5 rounded shrink-0"
                        style={{
                          background: hasEnoughReferences ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                          color: hasEnoughReferences ? '#16a34a' : '#ef4444',
                        }}>
                        {referenceCount}/30
                      </span>
                    )}
                    {/* Reviewer comment indicator */}
                    {cmtCount > 0 && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md shrink-0"
                        style={{
                          background: reviewed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                          color: reviewed ? '#16a34a' : '#f59e0b',
                        }}
                      >
                        {cmtCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 pl-4 truncate" style={{ color: 'var(--text-muted)' }}>
                    {sections[s.key]?.wordCount
                      ? `${sections[s.key].wordCount.toLocaleString()} words`
                      : s.subtitle}
                  </p>
                  {reviewed && (
                    <p className="text-[10px] mt-0.5 pl-4" style={{ color: '#16a34a' }}>
                      Reviewed
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Vote panel */}
          <div className="p-3 border-t shrink-0" style={{ borderColor: 'var(--border-main)' }}>
            {isLocked ? (
              <div className="text-center py-1">
                <div className="flex items-center justify-center gap-1.5 mb-1 text-xs font-semibold"
                  style={{ color: '#c9a84c' }}>
                  <Lock size={11} /> Finalized
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Rev {voteStatus?.revision} — locked for review
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Finalize</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {voteStatus?.voteCount ?? 0}/{voteStatus?.totalMembers ?? 0} voted
                  </span>
                </div>

                <div className="h-1.5 rounded-full mb-1.5" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${votePct}%`, background: '#c9a84c' }} />
                </div>

                {/* Voter avatars */}
                {voteStatus?.voters?.length > 0 && (
                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    {voteStatus.voters.map(v => {
                      const initials = v.fullName.split(' ').map(n => n[0]).slice(0, 2).join('')
                      return (
                        <span
                          key={v.fullName}
                          className="w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }}
                          title={`${v.fullName} voted`}
                        >
                          {initials.toUpperCase()}
                        </span>
                      )
                    })}
                    <span className="text-[10px] ml-1" style={{ color: 'var(--text-muted)' }}>voted</span>
                  </div>
                )}

                {!hasEnoughReferences && !voteStatus?.currentUserVoted && (
                  <p className="text-[10px] mb-1.5 text-center leading-tight px-1"
                    style={{ color: '#ef4444' }}>
                    Need {30 - referenceCount} more reference{30 - referenceCount !== 1 ? 's' : ''} ({referenceCount}/30)
                  </p>
                )}
                <button
                  className="w-full text-xs py-1.5 rounded-lg font-medium transition-all"
                  onClick={handleVote}
                  disabled={voteLoading || (!voteStatus?.currentUserVoted && !hasEnoughReferences)}
                  style={{
                    background: voteStatus?.currentUserVoted ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.06)',
                    color: '#c9a84c',
                    border: '1px solid rgba(201,168,76,0.25)',
                    cursor: (voteLoading || (!voteStatus?.currentUserVoted && !hasEnoughReferences)) ? 'not-allowed' : 'pointer',
                    opacity: (voteLoading || (!voteStatus?.currentUserVoted && !hasEnoughReferences)) ? 0.45 : 1,
                  }}>
                  {voteLoading
                    ? '…'
                    : voteStatus?.currentUserVoted
                      ? '✓ Voted — Revoke'
                      : 'Vote to Finalize'}
                </button>
                <p className="text-xs mt-1.5 text-center leading-tight" style={{ color: 'var(--text-muted)' }}>
                  Locking requires all {voteStatus?.totalMembers ?? '?'} members
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
                <span>Revision {voteStatus?.revision} is finalized and read-only.</span>
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

          {activeKey === 'references' && !isLocked && (
            <div className="px-4 py-2 shrink-0 flex items-center gap-3"
              style={{ background: hasEnoughReferences ? 'rgba(34,197,94,0.07)' : 'rgba(239,68,68,0.07)', borderBottom: '1px solid', borderColor: hasEnoughReferences ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}>
              <span className="text-xs font-medium shrink-0" style={{ color: hasEnoughReferences ? '#16a34a' : '#ef4444' }}>
                References: {referenceCount}/30
              </span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                <div className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((referenceCount / 30) * 100, 100)}%`, background: hasEnoughReferences ? '#16a34a' : '#ef4444' }} />
              </div>
              {!hasEnoughReferences && (
                <span className="text-[11px] shrink-0" style={{ color: '#ef4444' }}>
                  {30 - referenceCount} more needed to finalize
                </span>
              )}
            </div>
          )}

          {saveError && (
            <div className="px-4 py-2 shrink-0 text-sm flex items-center justify-between"
              style={{ background: '#fef2f2', color: '#dc2626', borderBottom: '1px solid #fecaca' }}>
              <span>{saveError}</span>
              <button className="ml-3 text-xs underline" onClick={() => setSaveError('')}>Dismiss</button>
            </div>
          )}

          {ydoc && provider ? (
            <TipTapPane
              key={activeKey}
              ydoc={ydoc}
              provider={provider}
              sectionKey={activeKey}
              isLocked={isLocked}
              saving={saving}
              sectionData={sections[activeKey]}
              onSave={(ed) => handleSave(ed, ydoc)}
              hubState={hubState}
              allSections={sections}
              groupName={group?.groupName ?? 'Manuscript'}
              onFinalize={handleFinalize}
              finalizing={finalizing}
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

function TipTapPane({ ydoc, provider, sectionKey, isLocked, saving, sectionData, onSave, hubState, allSections, groupName, onFinalize, finalizing }) {
  const [fontFamily, setFontFamily] = useState('')
  const [fontSize, setFontSize] = useState('12')
  const [textColor, setTextColor] = useState('#000000')
  const [imageError, setImageError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [zoom, setZoom] = useState(100)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [floatBar, setFloatBar] = useState(null)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [savedSelection, setSavedSelection] = useState(null)
  const [showCommentPanel, setShowCommentPanel] = useState(true)
  const [commentsData, setCommentsData] = useState({})
  const [commentPositions, setCommentPositions] = useState([])
  const [activeCommentId, setActiveCommentId] = useState(null)
  const [paperHeight, setPaperHeight] = useState(1056)
  const exportMenuRef = useRef(null)
  const canvasScrollRef = useRef(null)
  const commentInputRef = useRef(null)
  const pageRef = useRef(null)
  const commentStyleRef = useRef(null)
  // Ref so document-level event closures can read the current value without re-registering
  const commentInputOpenRef = useRef(false)
  const [collabUsers, setCollabUsers] = useState([])
  const fileInputRef = useRef(null)

  // Auto-save
  const autoSaveTimerRef = useRef(null)
  const savedFlashTimerRef = useRef(null)
  const prevSavingRef = useRef(false)
  const [recentlySaved, setRecentlySaved] = useState(false)

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

  const sectionLabel = sectionKey === 'references'
    ? 'References'
    : `Chapter ${sectionKey.replace('chapter', '')}`

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
      Placeholder.configure({ placeholder: `Start writing ${sectionLabel}…` }),
      ImageExt.configure({ inline: false }),
      TableExt.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Collaboration.configure({ document: ydoc }),
      CollaborativeCursors.configure({ provider }),
      CommentMark,
      GrammarCheck,
    ],
    editable: !isLocked,
    editorProps: {
      attributes: { class: 'ms-editor-body', spellcheck: 'false' },
    },
  }, [ydoc, provider, isLocked])

  // Ctrl+S / Cmd+S shortcut — cancel any pending debounce and save immediately
  useEffect(() => {
    if (!editor) return
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        clearTimeout(autoSaveTimerRef.current)
        onSave(editor)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, onSave])

  // Auto-save: 2-second debounce after every content change
  useEffect(() => {
    if (!editor || !onSave || isLocked) return
    const handleUpdate = () => {
      setRecentlySaved(false)
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => onSave(editor), 2000)
    }
    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
      clearTimeout(autoSaveTimerRef.current)
    }
  }, [editor, onSave, isLocked])

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
  useEffect(() => { commentInputOpenRef.current = showCommentInput }, [showCommentInput])

  // Floating mini-toolbar: trigger on mouseup/keyup (selectionUpdate fires before
  // the browser commits window.getSelection, so rect would be zero-width there)
  useEffect(() => {
    if (!editor) return

    const showIfSelected = () => {
      // Don't disturb the toolbar while the comment textarea has focus
      if (commentInputOpenRef.current) return
      requestAnimationFrame(() => {
        if (commentInputOpenRef.current) return
        if (!editor || editor.state.selection.empty) { setFloatBar(null); return }
        const sel = window.getSelection()
        if (!sel || sel.rangeCount === 0) { setFloatBar(null); return }
        const rect = sel.getRangeAt(0).getBoundingClientRect()
        if (!rect.width || !rect.height) { setFloatBar(null); return }
        setFloatBar({ x: rect.left + rect.width / 2, y: rect.top })
      })
    }

    const collapseHide = () => {
      if (commentInputOpenRef.current) return
      if (editor.state.selection.empty) setFloatBar(null)
    }

    document.addEventListener('mouseup', showIfSelected)
    document.addEventListener('keyup', showIfSelected)
    editor.on('selectionUpdate', collapseHide)

    return () => {
      document.removeEventListener('mouseup', showIfSelected)
      document.removeEventListener('keyup', showIfSelected)
      editor.off('selectionUpdate', collapseHide)
      setFloatBar(null)
    }
  }, [editor])

  // Close export menu when clicking outside
  useEffect(() => {
    if (!showExportMenu) return
    const handler = (e) => { if (!exportMenuRef.current?.contains(e.target)) setShowExportMenu(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExportMenu])

  // Comments — stored in Yjs ydoc.getMap('comments') for real-time sync
  const commentsMap = useMemo(() => ydoc?.getMap('comments') ?? null, [ydoc])

  useEffect(() => {
    if (!commentsMap) return
    const sync = () => setCommentsData(Object.fromEntries(commentsMap.entries()))
    sync()
    commentsMap.observe(sync)
    return () => commentsMap.unobserve(sync)
  }, [commentsMap])

  // Calculate comment bubble positions relative to the paper div
  const calcCommentPositions = useCallback(() => {
    if (!showCommentPanel || !pageRef.current) { setCommentPositions([]); return }
    requestAnimationFrame(() => {
      if (!pageRef.current) return
      const pageEl = pageRef.current
      const pageRect = pageEl.getBoundingClientRect()
      // getBoundingClientRect already returns viewport/scaled coordinates with transform: scale(),
      // and the wrapper has no zoom — so the difference is directly usable as wrapper layout pixels.
      const raw = Object.entries(commentsData).flatMap(([id, comment]) => {
        const markEl = pageEl.querySelector(`mark[data-comment-id="${id}"]`)
        if (!markEl) return []
        const r = markEl.getBoundingClientRect()
        return [{ id, top: r.top - pageRect.top, comment }]
      })

      raw.sort((a, b) => a.top - b.top)
      let nextMin = 0
      const resolved = raw.map(pos => {
        const top = Math.max(pos.top, nextMin)
        nextMin = top + 90
        return { ...pos, top }
      })
      setCommentPositions(resolved)
    })
  }, [showCommentPanel, commentsData, zoom])

  useEffect(() => { calcCommentPositions() }, [calcCommentPositions])

  useEffect(() => {
    if (!editor) return
    editor.on('update', calcCommentPositions)
    return () => editor.off('update', calcCommentPositions)
  }, [editor, calcCommentPositions])

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

  // Per-comment color highlights + active ring + numbered badge injected as a dynamic <style>
  useEffect(() => {
    let el = commentStyleRef.current
    if (!el) {
      el = document.createElement('style')
      document.head.appendChild(el)
      commentStyleRef.current = el
    }
    const indexMap = {}
    commentPositions.forEach(({ id }, i) => { indexMap[id] = i + 1 })
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
  }, [commentsData, activeCommentId, commentPositions])

  useEffect(() => () => { commentStyleRef.current?.remove() }, [])

  // Focus comment textarea when it appears
  useEffect(() => {
    if (showCommentInput) {
      setTimeout(() => commentInputRef.current?.focus(), 50)
    }
  }, [showCommentInput])

  function cancelComment() {
    setShowCommentInput(false)
    setCommentText('')
    setSavedSelection(null)
    setFloatBar(null)
  }

  function addComment(text) {
    if (!editor || !commentsMap || !text.trim()) return
    const sel = savedSelection
    if (!sel || sel.from === sel.to) return  // nothing was selected

    const user = JSON.parse(sessionStorage.getItem('tm_user') || '{}')
    const commentId = `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const author = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Student'
    const authorColor = userColor(user.id ?? 'x')

    // Restore the selection that was saved before the textarea stole focus
    editor.chain().focus().setTextSelection({ from: sel.from, to: sel.to }).setComment(commentId).run()
    commentsMap.set(commentId, { text: text.trim(), author, authorColor, createdAt: new Date().toISOString() })

    setShowCommentInput(false)
    setCommentText('')
    setSavedSelection(null)
    setFloatBar(null)
    setActiveCommentId(commentId)
    setShowCommentPanel(true)
  }

  function deleteComment(commentId) {
    if (!commentsMap) return
    commentsMap.delete(commentId)

    if (editor) {
      const { state } = editor
      const { doc, schema } = state
      const commentMarkType = schema.marks.comment
      if (commentMarkType) {
        const tr = state.tr
        let modified = false
        doc.descendants((node, pos) => {
          if (!node.isText) return
          const hasMark = node.marks.some(
            m => m.type === commentMarkType && m.attrs.commentId === commentId
          )
          if (hasMark) {
            tr.removeMark(pos, pos + node.nodeSize, commentMarkType)
            modified = true
          }
        })
        if (modified) editor.view.dispatch(tr)
      }
    }

    if (activeCommentId === commentId) setActiveCommentId(null)
  }

  function jumpToComment(commentId) {
    if (!editor) return
    const { doc } = editor.state
    let found = null
    doc.descendants((node, pos) => {
      if (found) return false
      if (node.isText && node.marks.some(m => m.type.name === 'comment' && m.attrs.commentId === commentId)) {
        found = pos
        return false
      }
    })
    if (found !== null) {
      editor.chain().setTextSelection(found).scrollIntoView().run()
    }
    setActiveCommentId(commentId)
    requestAnimationFrame(() => {
      pageRef.current?.querySelector(`mark[data-comment-id="${commentId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    })
  }

  function jumpToUser(cursor) {
    if (!editor || !cursor) return
    const pos = clamp(cursor.from, 0, editor.state.doc.content.size)
    editor.chain().setTextSelection(pos).scrollIntoView().run()
  }

  async function handleExportSection() {
    setShowExportMenu(false)
    const html = editor?.getHTML() ?? ''
    const sec = SECTIONS.find(s => s.key === sectionKey)
    await downloadDocx({
      sections: [{ label: sec?.label ?? sectionKey, html }],
      filename: `${sectionKey}.docx`,
      title: sec?.label ?? sectionKey,
    })
  }

  async function handleExportAll() {
    setShowExportMenu(false)
    const liveHtml = editor?.getHTML() ?? ''
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
    if (!file || !editor) return
    e.target.value = ''
    setImageError('')

    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image exceeds the 10 MB limit.')
      return
    }

    setImageUploading(true)
    try {
      const result = await manuscriptService.uploadImage(file)
      editor.chain().focus().setImage({ src: result.url }).run()
    } catch (err) {
      setImageError(err.message)
    } finally {
      setImageUploading(false)
    }
  }

  if (!editor) return null

  const connected = hubState === 'connected'

  return (
    <div ref={canvasScrollRef} className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
      {/* Toolbar */}
      {!isLocked && (
        <div className="flex items-center gap-1 flex-wrap px-3 py-2 shrink-0 border-b"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>

          {/* Font family */}
          <select value={fontFamily}
            onChange={e => {
              setFontFamily(e.target.value)
              if (e.target.value) editor.chain().focus().setFontFamily(e.target.value).run()
              else editor.chain().focus().unsetFontFamily().run()
            }}
            className="text-xs rounded-lg px-2 py-1.5 border"
            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-primary)', minWidth: 132 }}>
            {FONT_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>

          {/* Font size */}
          <select value={fontSize}
            onChange={e => {
              setFontSize(e.target.value)
              editor.chain().focus().setFontSize(e.target.value + 'px').run()
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
                editor.chain().focus().setColor(e.target.value).run()
              }} />
          </label>

          <Sep />

          <TB active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)">
            <Bold size={13} />
          </TB>
          <TB active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)">
            <Italic size={13} />
          </TB>
          <TB active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)">
            <UnderlineIcon size={13} />
          </TB>
          <TB active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
            <Strikethrough size={13} />
          </TB>

          <Sep />

          <TB active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()} title="Align Left">
            <AlignLeft size={13} />
          </TB>
          <TB active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()} title="Align Center">
            <AlignCenter size={13} />
          </TB>
          <TB active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()} title="Align Right">
            <AlignRight size={13} />
          </TB>
          <TB active={editor.isActive({ textAlign: 'justify' })} onClick={() => editor.chain().focus().setTextAlign('justify').run()} title="Justify">
            <AlignJustify size={13} />
          </TB>

          <Sep />

          <TB active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
            <List size={13} />
          </TB>
          <TB active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered List">
            <ListOrdered size={13} />
          </TB>

          <Sep />

          <TB onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
            title={imageUploading ? 'Uploading…' : 'Insert Image (max 10 MB)'}>
            <Image size={13} />
          </TB>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleImageFile} />

          <TB onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert 3×3 Table">
            <TableIcon size={13} />
          </TB>

          <div className="flex-1" />

          {/* Export dropdown */}
          <div ref={exportMenuRef} style={{ position: 'relative' }} className="shrink-0">
            <button onClick={() => setShowExportMenu(v => !v)}
              className="text-xs flex items-center gap-1 py-1.5 px-2.5 rounded-lg border transition-all"
              style={{
                borderColor: 'var(--border-main)',
                background: showExportMenu ? 'var(--bg-subtle)' : 'transparent',
                color: 'var(--text-secondary)',
              }}>
              <Download size={11} />
              Export
              <ChevronDown size={10} />
            </button>
            {showExportMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 4px)',
                background: 'var(--bg-card)', border: '1px solid var(--border-main)',
                borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                minWidth: 210, zIndex: 60, overflow: 'hidden',
              }}>
                <button onClick={handleExportSection}
                  className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors"
                  style={{ color: 'var(--text-primary)', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <FileText size={12} style={{ color: '#c9a84c', flexShrink: 0 }} />
                  <div>
                    <div className="font-medium">Export This Section</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>Current chapter only · .docx</div>
                  </div>
                </button>
                <div style={{ height: 1, background: 'var(--border-main)', margin: '0 12px' }} />
                <button onClick={handleExportAll}
                  className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors"
                  style={{ color: 'var(--text-primary)', background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <Download size={12} style={{ color: '#c9a84c', flexShrink: 0 }} />
                  <div>
                    <div className="font-medium">Export Full Manuscript</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>All chapters · Save first · .docx</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {!isLocked && onFinalize && (
            <button
              className="text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 rounded-lg font-medium transition-all"
              onClick={() => {
                const html = editor?.getHTML() ?? ''
                const sec = SECTIONS.find(s => s.key === sectionKey)
                onFinalize(html, sec?.label ?? sectionKey)
              }}
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
            onClick={() => onSave(editor)}
            disabled={saving}>
            <Save size={12} />
            {saving ? 'Saving…' : 'Save'}
            {!saving && <kbd className="ml-0.5 opacity-60 text-xs" style={{ fontSize: 10 }}>Ctrl+S</kbd>}
          </button>
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
      <div className="flex items-center gap-3 px-4 py-1.5 shrink-0 border-b text-xs"
        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
        <span>{sectionData?.wordCount?.toLocaleString() ?? 0} words</span>

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
          {isLocked && (
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
              <span
                onClick={() => collabUsers.length === 1 && jumpToUser(collabUsers[0].cursor)}
                style={{
                  color: 'var(--text-muted)', fontSize: 10,
                  cursor: collabUsers.length === 1 && collabUsers[0].cursor ? 'pointer' : 'default',
                  textDecoration: collabUsers.length === 1 && collabUsers[0].cursor ? 'underline' : 'none',
                  textUnderlineOffset: 2,
                }}>
                {collabUsers.length === 1
                  ? `${collabUsers[0].name} is here`
                  : `${collabUsers.length} others editing`}
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
            title={showCommentPanel ? 'Hide comment annotations' : 'Show comment annotations'}
            style={{
              color: showCommentPanel ? '#c9a84c' : 'var(--text-muted)',
              fontSize: 11, padding: '2px 7px', borderRadius: 5,
              background: showCommentPanel ? 'rgba(201,168,76,0.12)' : 'transparent',
              border: `1px solid ${showCommentPanel ? 'rgba(201,168,76,0.3)' : 'transparent'}`,
            }}>
            <MessageSquare size={10} />
            <span>Comments</span>
            {Object.keys(commentsData).length > 0 && (
              <span style={{
                background: '#c9a84c', color: '#0a1628', fontSize: 9, fontWeight: 700,
                borderRadius: 8, padding: '0 4px', lineHeight: '14px',
              }}>
                {Object.keys(commentsData).length}
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

      {/* Canvas — gray Word-style background, scrollable */}
      <div className="flex-1 overflow-auto" style={{ background: '#525659', minWidth: 0 }}>
        {/*
          minWidth: max-content prevents the centering flex container from ever being
          narrower than its content. Without this, justify-content: center produces a
          negative margin-left when content is wider than the viewport, which causes
          left-side overflow that bleeds upward through the flex tree and breaks the
          toolbar / navbar. With max-content, overflow is always to the RIGHT and the
          scroll container handles it with scrollbars — the toolbar stays untouched.
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
            width: 816 * (zoom / 100),
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
                const el = e.target.closest('mark[data-comment-id]')
                if (el) {
                  const commentId = el.getAttribute('data-comment-id')
                  setActiveCommentId(commentId)
                  setShowCommentPanel(true)
                  requestAnimationFrame(() => {
                    const pos = commentPositions.find(p => p.id === commentId)
                    if (pos && canvasScrollRef.current) {
                      const target = 28 + pos.top - canvasScrollRef.current.clientHeight / 2 + 45
                      canvasScrollRef.current.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
                    }
                  })
                }
              }}>
              <EditorContent editor={editor} />
            </div>

            {/* Word-style comment bubbles — natural size, anchored to wrapper layout coords */}
            {showCommentPanel && commentPositions.map(({ id, top, comment }, commentIdx) => {
              const clr = comment.authorColor ?? '#c9a84c'
              const isActive = activeCommentId === id
              const displayIdx = commentIdx + 1
              return (
              <div key={id} style={{
                position: 'absolute',
                top,
                left: 816 * (zoom / 100) + 20,
                width: 210,
              }}>
                <div style={{
                  position: 'absolute', top: 14, left: -20, width: 20, height: 0,
                  borderTop: `1.5px dashed ${clr}`,
                  opacity: isActive ? 1 : 0.5,
                  transition: 'opacity 0.15s',
                }} />
                <div
                  onClick={() => jumpToComment(id)}
                  style={{
                    background: '#fff',
                    border: `1px solid ${isActive ? hexAlpha(clr, 0.4) : 'rgba(0,0,0,0.13)'}`,
                    borderLeft: `3px solid ${clr}`,
                    borderRadius: 6,
                    padding: '8px 10px',
                    cursor: 'pointer',
                    boxShadow: isActive
                      ? `0 0 0 2.5px ${hexAlpha(clr, 0.35)}, 0 4px 16px ${hexAlpha(clr, 0.2)}`
                      : '0 1px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.boxShadow = `0 0 0 1.5px ${hexAlpha(clr, 0.25)}, 0 2px 8px rgba(0,0,0,0.1)` }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 16, height: 16, padding: '0 4px',
                        borderRadius: 8, background: clr, color: '#fff',
                        fontSize: 9, fontWeight: 700, flexShrink: 0,
                        boxSizing: 'border-box', lineHeight: 1,
                      }}>
                        {displayIdx}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: clr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {comment.author}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteComment(id) }}
                      style={{ color: '#ccc', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0, marginLeft: 4 }}
                      onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color='#ccc'}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#333', lineHeight: 1.55, margin: 0 }}>{comment.text}</p>
                  <p style={{ fontSize: 10, color: '#999', marginTop: 5, marginBottom: 0 }}>
                    {fmtPHT(comment.createdAt)}
                  </p>
                </div>
              </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Floating mini-toolbar — appears above selected text */}
      {floatBar && !isLocked && editor && (
        <div
          onMouseDown={e => e.preventDefault()}
          style={{
            position: 'fixed',
            left: floatBar.x,
            top: floatBar.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'linear-gradient(145deg, #1e3d6e 0%, #112952 50%, #0a1f3d 100%)',
            border: '1px solid rgba(100,160,255,0.18)',
            borderRadius: 10,
            padding: showCommentInput ? '6px 8px' : '3px 5px',
            display: 'flex',
            flexDirection: showCommentInput ? 'column' : 'row',
            alignItems: showCommentInput ? 'stretch' : 'center',
            gap: showCommentInput ? 6 : 2,
            zIndex: 100,
            boxShadow: '0 6px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(100,160,255,0.08)',
            minWidth: showCommentInput ? 220 : undefined,
          }}>
          {showCommentInput ? (
            /* Comment input mode */
            <>
              <div className="flex items-center gap-1.5 mb-0.5">
                <MessageSquare size={11} style={{ color: '#c9a84c', flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: '#c9a84c' }}>Add Comment</span>
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
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment(commentText) }
                  if (e.key === 'Escape') { cancelComment() }
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
                  onClick={() => addComment(commentText)}
                  disabled={!commentText.trim()}
                  style={{ fontSize: 11, color: commentText.trim() ? '#0a1628' : 'rgba(255,255,255,0.3)',
                    padding: '3px 10px', borderRadius: 5, fontWeight: 600,
                    background: commentText.trim() ? '#c9a84c' : 'rgba(201,168,76,0.15)',
                    border: 'none', cursor: commentText.trim() ? 'pointer' : 'not-allowed', flex: 1 }}>
                  Add Comment
                </button>
              </div>
            </>
          ) : (
            /* Default mini-toolbar mode */
            <>
              <TB active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
                <Bold size={13} />
              </TB>
              <TB active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
                <Italic size={13} />
              </TB>
              <TB active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
                <UnderlineIcon size={13} />
              </TB>
              <TB active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough">
                <Strikethrough size={13} />
              </TB>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
              <TB active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
                <Heading1 size={13} />
              </TB>
              <TB active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
                <Heading2 size={13} />
              </TB>
              <TB active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
                <Heading3 size={13} />
              </TB>
              <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 2px' }} />
              <TB
                active={false}
                onClick={() => {
                  // Must capture selection NOW — textarea focus will clear it
                  const { from, to } = editor.state.selection
                  if (from === to) return  // nothing selected
                  setSavedSelection({ from, to })
                  setShowCommentInput(true)
                }}
                title="Add comment">
                <MessageSquare size={13} />
              </TB>
            </>
          )}
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
        /* Allow cursor name labels to float above the text without clipping */
        .ProseMirror { overflow: visible; }
        .collab-selection { border-radius: 1px; }
        /* Inline comment highlight — color + active ring injected dynamically per comment */
        .ms-comment-mark {
          border-radius: 2px;
          cursor: pointer;
          transition: background 0.15s, outline 0.15s;
        }
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
