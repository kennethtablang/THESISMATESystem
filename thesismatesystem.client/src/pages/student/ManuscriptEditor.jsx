import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { manuscriptService, groupService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Image, Table as TableIcon, Save, Lock, Users, List, ListOrdered, Strikethrough,
  Wifi, WifiOff
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
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import { Extension } from '@tiptap/core'
import * as Y from 'yjs'
import { HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr'
import { SignalRYjsProvider } from '../../lib/SignalRYjsProvider'

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

// Role → accent color for reviewer comment dots in the student sidebar
const ROLE_COLORS = {
  Adviser:    '#16a34a',
  Panel:      '#7c3aed',
  FacultyIC:  '#0891b2',
  Admin:      '#f59e0b',
  SuperAdmin: '#ef4444',
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
    const token = manuscriptService.getToken()
    const conn = new HubConnectionBuilder()
      .withUrl('/hubs/manuscript', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build()

    conn.onreconnecting(() => setHubState('connecting'))
    conn.onreconnected(() => setHubState('connected'))
    conn.onclose(() => setHubState('disconnected'))

    setHubState('connecting')
    conn.start()
      .then(() => {
        setHubState('connected')
        connectionRef.current = conn
        activateProvider(group.id, activeKeyRef.current, conn)
      })
      .catch(() => setHubState('disconnected'))

    return () => {
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

function TipTapPane({ ydoc, provider, sectionKey, isLocked, saving, sectionData, onSave, hubState }) {
  const [fontFamily, setFontFamily] = useState('')
  const [fontSize, setFontSize] = useState('12')
  const [textColor, setTextColor] = useState('#000000')
  const [imageError, setImageError] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef(null)

  const sectionLabel = sectionKey === 'references'
    ? 'References'
    : `Chapter ${sectionKey.replace('chapter', '')}`

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
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
      CollaborationCursor.configure({
        provider,
        user: {
          name: provider?.awareness?.getLocalState()?.user?.name ?? 'You',
          color: provider?.awareness?.getLocalState()?.user?.color ?? '#c9a84c',
        },
      }),
    ],
    editable: !isLocked,
    editorProps: {
      attributes: { class: 'ms-editor-body' },
    },
  }, [ydoc, provider, isLocked])

  // Ctrl+S / Cmd+S shortcut
  useEffect(() => {
    if (!editor) return
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        onSave(editor)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editor, onSave])

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
    <div className="flex-1 flex flex-col overflow-hidden">
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

        {sectionData?.updatedAt ? (
          <span>
            Saved {new Date(sectionData.updatedAt).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
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
          <span className="flex items-center gap-1" style={{ color: connected ? '#16a34a' : '#f59e0b' }}
            title={connected ? 'Collaboration active' : 'Reconnecting…'}>
            {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
        </div>
      </div>

      {/* Editor canvas */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-subtle)' }}>
        <div className="max-w-4xl mx-auto my-6 rounded-xl shadow-sm"
          style={{ background: '#fff', minHeight: 640, padding: '56px 72px' }}>
          <EditorContent editor={editor} />
        </div>
      </div>

      <style>{`
        .ms-editor-body {
          outline: none;
          font-family: "Times New Roman", serif;
          font-size: 12px;
          line-height: 2;
          color: #1a1a1a;
          min-height: 520px;
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
        .collaboration-cursor__caret {
          border-left: 1px solid; border-right: 1px solid;
          margin-left: -1px; margin-right: -1px;
          position: relative; word-break: normal; pointer-events: none;
        }
        .collaboration-cursor__label {
          border-radius: 3px 3px 3px 0; color: #fff; font-size: 10px;
          font-weight: 600; left: -1px; line-height: normal;
          padding: 0.1rem 0.3rem; position: absolute; top: -1.4em;
          user-select: none; white-space: nowrap; pointer-events: none;
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
