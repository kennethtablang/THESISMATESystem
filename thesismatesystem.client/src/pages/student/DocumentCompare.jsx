import { useState, useEffect, useRef, useCallback } from 'react'
import DOMPurify from 'dompurify'
import {
  X, ArrowLeftRight, Loader2, Plus, Minus, Columns2, FileText,
  Download, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
} from 'lucide-react'
import { renderAsync } from 'docx-preview'
import { documentService } from '../../services/api'

// ─── Lazy-load heavy deps ────────────────────────────────────────────────────
let _mammoth = null
async function getMammoth() {
  if (!_mammoth) { const m = await import('mammoth'); _mammoth = m.default ?? m }
  return _mammoth
}
let _diff = null
async function getDiff() {
  if (!_diff) _diff = await import('diff')
  return _diff
}

// ─── Constants ───────────────────────────────────────────────────────────────
const WORD_RED   = '#C00000'
const WORD_GREEN = '#107C41'
const WORD_BLUE  = '#2B579A'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}
function isDocxFile(name) { return /\.(docx?)$/i.test(name ?? '') }

/**
 * Convert a DOCX arrayBuffer to an array of paragraph objects:
 *   { text: string, outerHtml: string }
 *
 * Uses mammoth.convertToHtml so all formatting (bold, italic, headings, etc.)
 * is preserved in `outerHtml`.  `text` is used only for the diff algorithm.
 */
async function extractHtmlParagraphs(arrayBuffer, mam) {
  const { value: html } = await mam.convertToHtml({ arrayBuffer })
  const parser  = new DOMParser()
  const domDoc  = parser.parseFromString(html, 'text/html')
  const items   = []

  function walkBlocks(parent) {
    for (const el of parent.children) {
      const tag  = el.tagName
      const text = el.textContent.trim()
      if (!text) continue

      if (tag === 'UL' || tag === 'OL') {
        // Treat each list item as its own diff unit
        walkBlocks(el)
      } else if (tag === 'TABLE') {
        // Treat each table row as its own diff unit
        for (const section of el.children) {
          for (const row of section.children) {
            const rowText = row.textContent.trim()
            if (rowText) items.push({ text: rowText, outerHtml: row.outerHTML })
          }
        }
      } else {
        items.push({ text, outerHtml: el.outerHTML })
      }
    }
  }

  walkBlocks(domDoc.body)
  return items
}

/**
 * Build structured diff groups from two paragraph-object arrays.
 *
 * Groups:
 *   { type:'unchanged', paras:[{text,outerHtml}] }
 *   { type:'removed',   paras:[{text,outerHtml}] }
 *   { type:'added',     paras:[{text,outerHtml}] }
 *   { type:'modified',  pairs:[{old, new, words}] }
 *
 * Adjacent remove+add runs are merged into 'modified' so we can show both
 * the old (red strikethrough) and new (green underline) HTML side-by-side.
 * `words` carries the word-level diff for stats only — rendering uses outerHtml.
 */
function buildDiffGroups(parasA, parasB, diffLib) {
  // Diff on plain text; then map indices back to objects for rendering
  const textsA = parasA.map(p => p.text)
  const textsB = parasB.map(p => p.text)
  const raw    = diffLib.diffArrays(textsA, textsB)

  let iA = 0, iB = 0
  const groups = []
  let i = 0

  while (i < raw.length) {
    const cur   = raw[i]
    const count = cur.value.length

    if (!cur.added && !cur.removed) {
      groups.push({ type: 'unchanged', paras: parasA.slice(iA, iA + count) })
      iA += count; iB += count; i++

    } else if (cur.removed && raw[i + 1]?.added) {
      const del      = parasA.slice(iA, iA + count)
      const insCount = raw[i + 1].value.length
      const ins      = parasB.slice(iB, iB + insCount)
      const pairs    = []

      for (let j = 0; j < Math.max(del.length, ins.length); j++) {
        const oldP = del[j] ?? null
        const newP = ins[j] ?? null
        pairs.push({
          old:   oldP,
          new:   newP,
          // word diff used only for stats; rendering uses outerHtml
          words: (oldP && newP) ? diffLib.diffWords(oldP.text, newP.text) : null,
        })
      }
      groups.push({ type: 'modified', pairs })
      iA += count; iB += insCount; i += 2

    } else if (cur.removed) {
      groups.push({ type: 'removed', paras: parasA.slice(iA, iA + count) })
      iA += count; i++

    } else {
      groups.push({ type: 'added', paras: parasB.slice(iB, iB + count) })
      iB += count; i++
    }
  }

  return groups
}

function computeStats(groups, parasA, parasB) {
  let changedGroups = 0, wordsAdded = 0, wordsRemoved = 0

  for (const g of groups) {
    if (g.type === 'unchanged') continue
    changedGroups++

    if (g.type === 'added')
      wordsAdded += g.paras.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0)
    else if (g.type === 'removed')
      wordsRemoved += g.paras.reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0)
    else if (g.type === 'modified')
      g.pairs.forEach(pair => {
        if (!pair.words) return
        pair.words.forEach(w => {
          const wc = w.value.split(/\s+/).filter(Boolean).length
          if (w.added)   wordsAdded   += wc
          if (w.removed) wordsRemoved += wc
        })
      })
  }

  const total     = Math.max(parasA.length, parasB.length, 1)
  const unchanged = groups
    .filter(g => g.type === 'unchanged')
    .reduce((n, g) => n + g.paras.length, 0)

  return {
    changedGroups,
    wordsAdded,
    wordsRemoved,
    similarity: Math.round(unchanged / total * 100),
  }
}

// ─── Sanitise helper ─────────────────────────────────────────────────────────
// Allows all standard document tags; strips scripts and event handlers.
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p','h1','h2','h3','h4','h5','h6',
    'ul','ol','li','table','thead','tbody','tfoot','tr','th','td',
    'strong','b','em','i','u','s','del','ins','sup','sub','br','span','a',
  ],
  ALLOWED_ATTR: ['style', 'href', 'colspan', 'rowspan'],
}
function sanitize(html) {
  return DOMPurify.sanitize(html ?? '', PURIFY_CONFIG)
}

// ─── Tracked-changes group renderer ──────────────────────────────────────────
/**
 * Renders one diff group inside the white Word-like page.
 *
 * Unchanged  → raw HTML (full formatting, no colour change)
 * Removed    → HTML wrapped in .tc-removed  (CSS: red + strikethrough on all children)
 * Added      → HTML wrapped in .tc-added    (CSS: green + underline on all children)
 * Modified   → old HTML in .tc-removed, then new HTML in .tc-added
 *
 * Because the CSS classes target every descendant (`*`), bold, italic, font-size
 * and other formatting from the original DOCX are all preserved — only colour
 * and text-decoration change.
 */
function TrackedGroup({ group, groupIdx, isCurrentChange, registerChangeRef }) {
  const isChange = group.type !== 'unchanged'

  const refCb = useCallback(el => {
    if (el && isChange) registerChangeRef(groupIdx, el)
  }, [groupIdx, isChange, registerChangeRef])

  const borderColor =
    group.type === 'added'    ? WORD_GREEN :
    group.type === 'removed'  ? WORD_RED   : '#e6a817'

  if (group.type === 'unchanged') {
    return (
      <>
        {group.paras.map((p, i) => (
          <div
            key={i}
            dangerouslySetInnerHTML={{ __html: sanitize(p.outerHtml) }}
          />
        ))}
      </>
    )
  }

  return (
    <div
      ref={refCb}
      style={{
        borderLeft: `3px solid ${borderColor}`,
        marginLeft: -12,
        paddingLeft: 9,
        background: isCurrentChange ? 'rgba(230,168,23,0.07)' : 'transparent',
        borderRadius: '0 2px 2px 0',
        transition: 'background 0.2s',
      }}
    >
      {group.type === 'removed' && group.paras.map((p, i) => (
        <div
          key={i}
          className="tc-removed"
          dangerouslySetInnerHTML={{ __html: sanitize(p.outerHtml) }}
        />
      ))}

      {group.type === 'added' && group.paras.map((p, i) => (
        <div
          key={i}
          className="tc-added"
          dangerouslySetInnerHTML={{ __html: sanitize(p.outerHtml) }}
        />
      ))}

      {group.type === 'modified' && group.pairs.map((pair, i) => (
        <div key={i}>
          {pair.old && (
            <div
              className="tc-removed"
              dangerouslySetInnerHTML={{ __html: sanitize(pair.old.outerHtml) }}
            />
          )}
          {pair.new && (
            <div
              className="tc-added"
              dangerouslySetInnerHTML={{ __html: sanitize(pair.new.outerHtml) }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Reviewing Pane (Word's left sidebar) ────────────────────────────────────
function RevisionsSidebar({ groups, changeGroupIndices, currentChange, onSelect }) {
  return (
    <div style={{
      width: 236, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: '#f2ede8',
      borderRight: '1px solid #c8c0b8',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '7px 12px', flexShrink: 0,
        background: WORD_BLUE, color: 'white',
        fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <FileText size={12} />
        Reviewing Pane
        <span style={{ marginLeft: 'auto', fontWeight: 400, opacity: 0.8 }}>
          {changeGroupIndices.length} revision{changeGroupIndices.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {changeGroupIndices.length === 0 && (
          <div style={{ padding: '20px 12px', color: '#888', fontSize: 12, textAlign: 'center' }}>
            No differences found between the selected versions.
          </div>
        )}

        {changeGroupIndices.map((groupIdx, i) => {
          const g        = groups[groupIdx]
          const isActive = i === currentChange
          const color    = g.type === 'added' ? WORD_GREEN : g.type === 'removed' ? WORD_RED : '#c9a84c'
          const label    = g.type === 'modified' ? 'Modified' : g.type === 'added' ? 'Inserted' : 'Deleted'
          const preview  = g.type === 'modified'
            ? (g.pairs[0]?.new?.text ?? g.pairs[0]?.old?.text ?? '')
            : (g.paras[0]?.text ?? '')

          return (
            <button
              key={i}
              onClick={() => onSelect(i, groupIdx)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px',
                background: isActive ? '#fff7e8' : 'transparent',
                border: 'none',
                borderLeft: `4px solid ${isActive ? '#c9a84c' : color}`,
                borderBottom: '1px solid #ddd6ce',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
                  padding: '1px 5px', borderRadius: 2,
                  background: color, color: 'white',
                }}>
                  {label.toUpperCase()}
                </span>
                <span style={{ fontSize: 10, color: '#999' }}>#{i + 1}</span>
              </div>
              <div style={{
                fontSize: 11,
                color: isActive ? '#1a1a1a' : '#555',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 196, fontStyle: 'italic',
              }}>
                {preview.slice(0, 80) || '(empty paragraph)'}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Small UI components ──────────────────────────────────────────────────────
function VersionSelect({ value, onChange, versions, borderColor, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <span style={{ fontSize: 10, color: 'rgba(226,232,240,0.38)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            appearance: 'none',
            background: 'rgba(255,255,255,0.07)', color: '#e2e8f0',
            border: `1px solid ${borderColor}`, borderRadius: 6,
            padding: '3px 22px 3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 700,
          }}
        >
          {[...versions].sort((a, b) => a.version - b.version).map(v => (
            <option key={v.id} value={v.id} style={{ background: '#0a1628' }}>
              v{v.version} · {fmtDate(v.submittedAt)}
            </option>
          ))}
        </select>
        <ChevronDown
          size={10}
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: borderColor, pointerEvents: 'none' }}
        />
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 11px', borderRadius: 7, fontSize: 11, fontWeight: 600,
      border: 'none', cursor: 'pointer',
      background: active ? 'rgba(201,168,76,0.18)' : 'transparent',
      color: active ? '#c9a84c' : 'rgba(226,232,240,0.4)',
    }}>
      {children}
    </button>
  )
}

function NavBtn({ enabled, onClick, children }) {
  return (
    <button onClick={onClick} disabled={!enabled} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: 5, padding: 0,
      border: '1px solid rgba(255,255,255,0.1)',
      background: enabled ? 'rgba(255,255,255,0.07)' : 'transparent',
      color: enabled ? 'rgba(226,232,240,0.7)' : 'rgba(226,232,240,0.18)',
      cursor: enabled ? 'pointer' : 'default',
    }}>
      {children}
    </button>
  )
}

function SideHeader({ ver, color, label }) {
  return (
    <div style={{
      flexShrink: 0, padding: '5px 14px',
      background: WORD_BLUE, color: 'white',
      fontSize: 11, fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 8,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <span style={{
        background: color, padding: '1px 6px', borderRadius: 2,
        fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
      }}>
        {label.toUpperCase()}
      </span>
      v{ver?.version}&nbsp;·&nbsp;{fmtDate(ver?.submittedAt)}
      {ver?.submittedBy?.fullName && (
        <span style={{ opacity: 0.7, fontWeight: 400 }}>· {ver.submittedBy.fullName}</span>
      )}
      <div style={{ flex: 1 }} />
      <span style={{ opacity: 0.45, fontSize: 10, fontStyle: 'italic' }}>{ver?.fileName}</span>
    </div>
  )
}

function DlBtn({ color, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, fontWeight: 700,
      padding: '3px 8px', borderRadius: 5,
      border: `1px solid ${color}44`, background: `${color}0f`,
      color, cursor: 'pointer',
    }}>
      {children}
    </button>
  )
}

function DocxPlaceholder({ color, label }) {
  return (
    <div style={{
      background: 'white', maxWidth: 816, margin: '0 auto', minHeight: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#ccc',
      fontFamily: 'system-ui', fontSize: 13,
    }}>
      <FileText size={32} style={{ color }} />
      <span>{label}</span>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DocumentCompare({ versions, initialIdA, initialIdB, sectionLabel, onClose }) {
  const sorted = [...versions].sort((a, b) => a.version - b.version)

  const [idA, setIdA] = useState(
    initialIdA ?? (sorted.length >= 2 ? sorted[sorted.length - 2].id : sorted[0]?.id)
  )
  const [idB, setIdB] = useState(initialIdB ?? sorted[sorted.length - 1]?.id)
  const [tab, setTab] = useState('tracked')

  const [loadingStep, setLoadingStep] = useState('')
  const [error, setError]             = useState('')
  const [blobA, setBlobA]             = useState(null)
  const [blobB, setBlobB]             = useState(null)
  const [groups, setGroups]           = useState(null)
  const [stats, setStats]             = useState(null)
  const [parasA, setParasA]           = useState([])
  const [parasB, setParasB]           = useState([])
  const [currentChange, setCurrentChange] = useState(0)
  const [zoom, setZoom] = useState(100)

  const refA      = useRef(null)
  const refB      = useRef(null)
  const scrollA   = useRef(null)
  const scrollB   = useRef(null)
  const syncMutex = useRef(false)
  const changeEls = useRef({})

  const verA        = versions.find(v => v.id === idA)
  const verB        = versions.find(v => v.id === idB)
  const sameVersion = idA === idB
  const canDiff     = isDocxFile(verA?.fileName) && isDocxFile(verB?.fileName)
  const loading     = loadingStep !== ''

  const changeGroupIndices = (groups ?? [])
    .map((_, i) => i)
    .filter(i => groups[i].type !== 'unchanged')

  const registerChangeRef = useCallback((groupIdx, el) => {
    changeEls.current[groupIdx] = el
  }, [])

  function goToChange(next) {
    const idx = Math.max(0, Math.min(next, changeGroupIndices.length - 1))
    setCurrentChange(idx)
    changeEls.current[changeGroupIndices[idx]]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  // ── Synchronized side-by-side scrolling ──
  const handleScrollA = useCallback(e => {
    if (syncMutex.current || !scrollB.current) return
    syncMutex.current = true
    const el  = e.currentTarget
    const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
    scrollB.current.scrollTop = pct * Math.max(1, scrollB.current.scrollHeight - scrollB.current.clientHeight)
    requestAnimationFrame(() => { syncMutex.current = false })
  }, [])

  const handleScrollB = useCallback(e => {
    if (syncMutex.current || !scrollA.current) return
    syncMutex.current = true
    const el  = e.currentTarget
    const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
    scrollA.current.scrollTop = pct * Math.max(1, scrollA.current.scrollHeight - scrollA.current.clientHeight)
    requestAnimationFrame(() => { syncMutex.current = false })
  }, [])

  const handleWheelZoom = useCallback(e => {
    if (!e.ctrlKey) return
    e.preventDefault()
    setZoom(z => Math.max(50, Math.min(200, z + (e.deltaY < 0 ? 10 : -10))))
  }, [])

  // ── Fetch blobs → extract HTML paragraphs → diff ──
  useEffect(() => {
    if (!idA || !idB || idA === idB) return
    let cancelled = false

    setLoadingStep('Fetching documents…')
    setError(''); setBlobA(null); setBlobB(null)
    setGroups(null); setStats(null); setCurrentChange(0)
    changeEls.current = {}

    ;(async () => {
      const [bA, bB] = await Promise.all([
        documentService.fetchBlob(idA),
        documentService.fetchBlob(idB),
      ])
      if (cancelled) return
      setBlobA(bA); setBlobB(bB)

      if (!canDiff) { setLoadingStep(''); return }

      setLoadingStep('Extracting content…')
      const [mam, diffLib] = await Promise.all([getMammoth(), getDiff()])

      // Each arrayBuffer() call is independent — Blob reads are non-destructive
      const [bufA, bufB] = await Promise.all([bA.arrayBuffer(), bB.arrayBuffer()])
      if (cancelled) return

      // convertToHtml preserves bold/italic/headings/tables/etc.
      const [pA, pB] = await Promise.all([
        extractHtmlParagraphs(bufA, mam),
        extractHtmlParagraphs(bufB, mam),
      ])
      if (cancelled) return

      setParasA(pA); setParasB(pB)

      setLoadingStep('Computing differences…')
      await new Promise(r => setTimeout(r, 0))
      if (cancelled) return

      const grps = buildDiffGroups(pA, pB, diffLib)
      setGroups(grps)
      setStats(computeStats(grps, pA, pB))
      setLoadingStep('')
    })()
      .catch(e => { if (!cancelled) { setError(e.message); setLoadingStep('') } })

    return () => { cancelled = true }
  }, [idA, idB])

  // ── Render DOCX previews for side-by-side.
  //    Both panes use opacity (not display:none) so they always have real
  //    pixel dimensions — renderAsync measures container width on the first call.
  useEffect(() => {
    if (!blobA || !refA.current) return
    const el = refA.current
    el.innerHTML = ''
    ;(async () => { try { await renderAsync(blobA, el) } catch {} })()
  }, [blobA])

  useEffect(() => {
    if (!blobB || !refB.current) return
    const el = refB.current
    el.innerHTML = ''
    ;(async () => { try { await renderAsync(blobB, el) } catch {} })()
  }, [blobB])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── Toolbar ── */}
      <div style={{
        flexShrink: 0, height: 52,
        background: '#0a1628',
        borderBottom: '1px solid rgba(201,168,76,0.22)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px',
      }}>
        <ArrowLeftRight size={14} style={{ color: '#c9a84c', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#c9a84c', whiteSpace: 'nowrap', marginRight: 4 }}>
          {sectionLabel ? `${sectionLabel} — ` : ''}Version Compare
        </span>

        <VersionSelect label="From" value={idA} onChange={v => { setIdA(v); setCurrentChange(0) }} versions={versions} borderColor="#f87171" />
        <ArrowLeftRight size={11} style={{ color: 'rgba(226,232,240,0.2)', flexShrink: 0 }} />
        <VersionSelect label="To"   value={idB} onChange={v => { setIdB(v); setCurrentChange(0) }} versions={versions} borderColor="#4ade80" />

        {/* Change navigation — tracked tab only */}
        {tab === 'tracked' && changeGroupIndices.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 8, flexShrink: 0 }}>
            <NavBtn enabled={currentChange > 0} onClick={() => goToChange(currentChange - 1)}>
              <ChevronLeft size={12} />
            </NavBtn>
            <span style={{ fontSize: 11, color: 'rgba(226,232,240,0.45)', minWidth: 50, textAlign: 'center', userSelect: 'none' }}>
              {currentChange + 1} of {changeGroupIndices.length}
            </span>
            <NavBtn enabled={currentChange < changeGroupIndices.length - 1} onClick={() => goToChange(currentChange + 1)}>
              <ChevronRight size={12} />
            </NavBtn>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* ── Zoom controls ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <NavBtn enabled={zoom > 50} onClick={() => setZoom(z => Math.max(50, z - 10))}>
            <ZoomOut size={11} />
          </NavBtn>
          <button
            onClick={() => setZoom(100)}
            title="Reset zoom to 100%"
            style={{
              fontSize: 10, fontWeight: 700, minWidth: 40, textAlign: 'center',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 5, color: zoom !== 100 ? '#c9a84c' : 'rgba(226,232,240,0.5)',
              padding: '2px 4px', cursor: 'pointer', lineHeight: 1.6,
            }}
          >
            {zoom}%
          </button>
          <NavBtn enabled={zoom < 200} onClick={() => setZoom(z => Math.min(200, z + 10))}>
            <ZoomIn size={11} />
          </NavBtn>
        </div>

        <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 2 }}>
          <TabBtn active={tab === 'tracked'} onClick={() => setTab('tracked')}>
            <FileText size={11} />Tracked Changes
          </TabBtn>
          <TabBtn active={tab === 'side'} onClick={() => setTab('side')}>
            <Columns2 size={11} />Side by Side
          </TabBtn>
        </div>

        {!sameVersion && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            <DlBtn color="#f87171" onClick={() => documentService.downloadFile(idA, verA?.fileName)}>
              <Download size={10} /> v{verA?.version}
            </DlBtn>
            <DlBtn color="#4ade80" onClick={() => documentService.downloadFile(idB, verB?.fileName)}>
              <Download size={10} /> v{verB?.version}
            </DlBtn>
          </div>
        )}

        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(226,232,240,0.35)', display: 'flex', padding: 4, marginLeft: 4 }}>
          <X size={17} />
        </button>
      </div>

      {/* ── Document info / stats bar ── */}
      {!sameVersion && (
        <div style={{
          flexShrink: 0,
          background: '#e4dfd9', borderBottom: '1px solid #c4bdb6',
          padding: '4px 16px',
          display: 'flex', alignItems: 'center', gap: 14,
          fontSize: 11, color: '#444',
        }}>
          <span style={{ color: WORD_RED, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Minus size={10} />
            v{verA?.version} · {fmtDate(verA?.submittedAt)}
            {verA?.submittedBy?.fullName && ` · ${verA.submittedBy.fullName}`}
          </span>
          <span style={{ color: '#aaa' }}>→</span>
          <span style={{ color: WORD_GREEN, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={10} />
            v{verB?.version} · {fmtDate(verB?.submittedAt)}
            {verB?.submittedBy?.fullName && ` · ${verB.submittedBy.fullName}`}
          </span>
          {stats && (
            <>
              <span style={{ color: '#bbb', margin: '0 4px' }}>|</span>
              <span style={{ color: WORD_GREEN, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Plus size={10} />{stats.wordsAdded} inserted
              </span>
              <span style={{ color: WORD_RED, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Minus size={10} />{stats.wordsRemoved} deleted
              </span>
              <span style={{ color: '#888' }}>{stats.similarity}% unchanged</span>
              <span style={{ color: '#888' }}>·</span>
              <span style={{ color: '#555', fontWeight: 600 }}>
                {stats.changedGroups} change block{stats.changedGroups !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      )}

      {sameVersion && (
        <div style={{ padding: '9px 20px', textAlign: 'center', fontSize: 13, color: '#c9a84c', background: 'rgba(201,168,76,0.08)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          Select two different versions to compare.
        </div>
      )}
      {error && (
        <div style={{ padding: '8px 20px', fontSize: 13, color: '#fca5a5', background: '#7f1d1d' }}>
          {error}
        </div>
      )}

      {/* ── Content ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }} onWheel={handleWheelZoom}>

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 20,
            background: '#e8e4df',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
          }}>
            <Loader2 size={28} className="animate-spin" style={{ color: WORD_BLUE }} />
            <span style={{ fontSize: 13, color: '#555' }}>{loadingStep}</span>
          </div>
        )}

        {/* ── Tracked Changes tab ──
             opacity keeps containers dimensioned so docx-preview works correctly
             the first time the user switches to the Side by Side tab. */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: tab === 'tracked' ? 1 : 0,
          pointerEvents: tab === 'tracked' ? 'auto' : 'none',
          display: 'flex',
          transition: 'opacity 0.12s',
        }}>
          {groups && !sameVersion && (
            <RevisionsSidebar
              groups={groups}
              changeGroupIndices={changeGroupIndices}
              currentChange={currentChange}
              onSelect={(i, groupIdx) => {
                setCurrentChange(i)
                changeEls.current[groupIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
            />
          )}

          <div style={{ flex: 1, overflow: 'auto', background: '#d0ccc8', minHeight: 0 }}>
            {!groups && !loading && !sameVersion && !canDiff && (
              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                <p style={{ color: '#666', fontSize: 14 }}>Text comparison is only available for .docx files.</p>
                <p style={{ color: '#999', fontSize: 12 }}>Switch to Side by Side to preview both documents.</p>
              </div>
            )}

            {groups && !sameVersion && (
              <div style={{ padding: '48px 40px 80px' }}>
                {/* White Word-like page — tc-doc-page sets base typography */}
                <div
                  className="tc-doc-page"
                  style={{
                    background: 'white',
                    maxWidth: 816,
                    margin: '0 auto',
                    minHeight: 1056,
                    /* Thesis standard: 1.5" left, 1" others (96 px/in) */
                    padding: '96px 96px 96px 144px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.18), 0 8px 32px rgba(0,0,0,0.12)',
                    boxSizing: 'border-box',
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: 14,
                    color: '#1a1a1a',
                    position: 'relative',
                    zoom: zoom / 100,
                    transformOrigin: 'top center',
                  }}
                >
                  <div style={{
                    position: 'absolute', bottom: 40, left: 0, right: 0,
                    textAlign: 'center', fontSize: 11, color: '#bbb',
                    fontFamily: 'system-ui',
                  }}>
                    Tracked Changes · {sectionLabel ?? 'Document'} · v{verA?.version} → v{verB?.version}
                  </div>

                  {groups.map((group, i) => (
                    <TrackedGroup
                      key={i}
                      group={group}
                      groupIdx={i}
                      isCurrentChange={changeGroupIndices[currentChange] === i}
                      registerChangeRef={registerChangeRef}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Side by Side tab ── */}
        <div style={{
          position: 'absolute', inset: 0,
          opacity: tab === 'side' ? 1 : 0,
          pointerEvents: tab === 'side' ? 'auto' : 'none',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          transition: 'opacity 0.12s',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid #999', overflow: 'hidden' }}>
            <SideHeader ver={verA} color={WORD_RED} label="Original" />
            <div ref={scrollA} onScroll={handleScrollA}
              style={{ flex: 1, overflow: 'auto', background: '#d0ccc8', padding: '24px 16px' }}>
              <div style={{ zoom: zoom / 100, transformOrigin: 'top center' }}>
                <div ref={refA} />
              </div>
              {!blobA && !loading && <DocxPlaceholder color={WORD_RED} label={`v${verA?.version}`} />}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <SideHeader ver={verB} color={WORD_GREEN} label="Revised" />
            <div ref={scrollB} onScroll={handleScrollB}
              style={{ flex: 1, overflow: 'auto', background: '#d0ccc8', padding: '24px 16px' }}>
              <div style={{ zoom: zoom / 100, transformOrigin: 'top center' }}>
                <div ref={refB} />
              </div>
              {!blobB && !loading && <DocxPlaceholder color={WORD_GREEN} label={`v${verB?.version}`} />}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
