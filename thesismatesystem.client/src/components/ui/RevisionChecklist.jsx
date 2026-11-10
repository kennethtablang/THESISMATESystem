import { useCallback, useEffect, useState } from 'react'
import DOMPurify from 'dompurify'
import { CheckCircle2, Circle, Highlighter, ListChecks } from 'lucide-react'
import { documentService } from '../../services/api'
import { toast } from '../../utils/toast'

// Revision round 8. When an adviser or panelist requests a revision, each of their highlights
// and comments on that version is a revision item. The students tick items off as they fix
// them ("2/10 revised"); the reviewer sees the same ticks when the resubmission comes back.
// Items from every version of the document are listed, so nothing is lost on resubmission.

/** Small "2/10 revised" pill. */
export function RevisedPill({ resolved, total, dark }) {
  if (!total) return null
  const done = resolved === total
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
      title="Requested revisions the students marked as revised"
      style={{
        background: done ? 'rgba(34,197,94,0.14)' : dark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.12)',
        color: done ? '#16a34a' : '#d97706',
        border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
      }}>
      <ListChecks size={11} /> {resolved}/{total} revised
    </span>
  )
}

/**
 * `docId` — any version of the document. `canToggle(item)` — whether the viewer may tick or
 * untick that item. `onCounts({ total, resolved })` — told after every load / change.
 * `onQuoteClick(item)` — optional, to show the passage. `dark` — for the navy review sidebar.
 */
export default function RevisionChecklist({ docId, canToggle, onCounts, onQuoteClick, dark = false, refreshKey }) {
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    if (!docId) return
    documentService.revisionItems(docId)
      .then(d => { setData(d); onCounts?.({ total: d.total, resolved: d.resolved }) })
      .catch(() => setData({ total: 0, resolved: 0, items: [], byReviewer: [] }))
  }, [docId]) // eslint-disable-line react-hooks/exhaustive-deps -- onCounts is a callback prop

  useEffect(() => { load() }, [load, refreshKey])

  async function toggle(item) {
    setBusy(item.id)
    try {
      await documentService.setCommentResolved(item.id, !item.resolvedAt)
      load()
    } catch (e) {
      toast.error(e.message || 'Could not update the item.')
    } finally {
      setBusy(null)
    }
  }

  if (!data || data.total === 0) return null

  const text = dark ? 'rgba(255,255,255,0.85)' : 'var(--text-primary)'
  const muted = dark ? 'rgba(255,255,255,0.45)' : 'var(--text-muted)'
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : 'var(--bg-subtle)'
  const border = dark ? 'rgba(255,255,255,0.08)' : 'var(--border-light)'
  const pct = Math.round((data.resolved / data.total) * 100)
  const colorOf = id => data.byReviewer.find(r => r.reviewerId === id)?.color ?? '#a16207'
  const labelOf = id => data.byReviewer.find(r => r.reviewerId === id)?.label

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <ListChecks size={13} style={{ color: '#c9a84c' }} />
        <span className="text-xs font-semibold" style={{ color: text }}>Requested revisions</span>
        <span className="ml-auto"><RevisedPill resolved={data.resolved} total={data.total} dark={dark} /></span>
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: dark ? 'rgba(255,255,255,0.08)' : 'var(--border-light)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : '#d97706' }} />
      </div>

      {data.byReviewer.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {data.byReviewer.map(r => (
            <span key={r.reviewerId} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${r.color}22`, color: r.color, border: `1px solid ${r.color}44` }}>
              {r.label} · {r.fullName}: {r.resolved}/{r.total}
            </span>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {data.items.map(item => {
          const done = !!item.resolvedAt
          const color = colorOf(item.author?.id)
          const allowed = canToggle?.(item)
          return (
            <li key={item.id} className="rounded-xl p-2.5"
              style={{ background: cardBg, border: `1px solid ${border}`, borderLeft: `3px solid ${color}`, opacity: done ? 0.75 : 1 }}>
              <div className="flex items-start gap-2">
                <button type="button" disabled={!allowed || busy === item.id} onClick={() => toggle(item)}
                  title={allowed ? (done ? 'Mark as not yet revised' : 'Mark as revised') : done ? 'Revised' : 'Not yet revised'}
                  className="shrink-0 mt-0.5" style={{ cursor: allowed ? 'pointer' : 'default', background: 'none', border: 'none', padding: 0 }}>
                  {done
                    ? <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
                    : <Circle size={16} style={{ color: allowed ? '#d97706' : muted }} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-[11px] font-semibold" style={{ color }}>{labelOf(item.author?.id) ?? 'Reviewer'}</span>
                    <span className="text-[11px]" style={{ color: muted }}>{item.author?.fullName} · v{item.version}</span>
                    {done && (
                      <span className="text-[10px] font-semibold ml-auto" style={{ color: '#16a34a' }}>
                        Revised{item.resolvedBy?.fullName ? ` · ${item.resolvedBy.fullName}` : ''}
                      </span>
                    )}
                  </div>
                  {item.quote && (
                    <button type="button" onClick={() => onQuoteClick?.(item)}
                      className="w-full text-left text-[11px] italic mb-1 px-2 py-1 rounded-md line-clamp-2"
                      style={{ background: dark ? 'rgba(255,255,255,0.05)' : 'var(--bg-card)', color: muted, cursor: onQuoteClick ? 'pointer' : 'default', textDecoration: done ? 'line-through' : 'none' }}>
                      <Highlighter size={10} className="inline mr-1 -mt-0.5" style={{ color }} />
                      “{item.quote}”
                    </button>
                  )}
                  <div className="text-xs prose prose-sm max-w-none [&_p]:m-0" style={{ color: text }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.content) }} />
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
