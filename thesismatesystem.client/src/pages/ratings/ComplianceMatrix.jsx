import { Plus, Trash2, ClipboardList } from 'lucide-react'

// The compliance matrix at the end of a Proposal, Pre-Final or Final defense rating
// (revision round 8): No. | Recommendations | Location (Prelim / Chapter / Other) | By (Initial).
// The Admin/subject teacher, the adviser and each panelist add their own rows; everyone's rows
// are listed together, numbered in the order they were given.

const LOCATION_OPTIONS = [
  'Preliminaries', 'Chapter 1', 'Chapter 2', 'Chapter 3', 'Chapter 4', 'Chapter 5',
  'References', 'Appendices', 'System', 'Other',
]

const cell = { border: '1px solid var(--border-main)', padding: '8px 10px', verticalAlign: 'top' }
const head = { ...cell, background: '#0a1628', color: '#fff', fontWeight: 600, fontSize: 12, textAlign: 'center' }

/**
 * `others` — rows from everyone else (read-only). `mine` — this rater's rows, editable when
 * `editable`. `onChange(rows)` receives the new list of { recommendation, location }.
 */
export default function ComplianceMatrix({ others = [], mine = [], editable, myInitials, onChange }) {
  const update = (i, patch) => onChange(mine.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = i => onChange(mine.filter((_, idx) => idx !== i))
  const add = () => onChange([...mine, { recommendation: '', location: 'Chapter 1' }])

  const total = others.length + mine.length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList size={15} style={{ color: '#c9a84c' }} />
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Compliance Matrix
        </p>
      </div>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Type each recommendation for the chapters or the system, where it applies, and it is signed with your initials.
      </p>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border-main)' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 520 }}>
          <thead>
            <tr>
              <th style={{ ...head, width: 44 }}>No.</th>
              <th style={head}>Recommendations</th>
              <th style={{ ...head, width: 150 }}>
                Location<div style={{ fontSize: 10, fontWeight: 400 }}>(Prelim / Chapter / Other)</div>
              </th>
              <th style={{ ...head, width: 80 }}>
                BY<div style={{ fontSize: 10, fontWeight: 400 }}>(Initial)</div>
              </th>
              {editable && <th style={{ ...head, width: 40 }} />}
            </tr>
          </thead>
          <tbody>
            {total === 0 && (
              <tr>
                <td colSpan={editable ? 5 : 4} style={{ ...cell, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No recommendations yet.
                </td>
              </tr>
            )}
            {others.map((r, i) => (
              <tr key={`o-${r.id}`} style={{ background: 'var(--bg-subtle)' }}>
                <td style={{ ...cell, textAlign: 'center' }}>{i + 1}</td>
                <td style={{ ...cell, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{r.recommendation}</td>
                <td style={{ ...cell, color: 'var(--text-primary)' }}>{r.location}</td>
                <td style={{ ...cell, color: 'var(--text-primary)' }} title={r.authorName}>{r.initials}</td>
                {editable && <td style={cell} />}
              </tr>
            ))}
            {mine.map((r, i) => (
              <tr key={`m-${i}`}>
                <td style={{ ...cell, textAlign: 'center' }}>{others.length + i + 1}</td>
                <td style={cell}>
                  {editable ? (
                    <textarea className="form-input text-sm" rows={2} value={r.recommendation}
                      placeholder="e.g. Discuss the process in a more detailed manner."
                      onChange={e => update(i, { recommendation: e.target.value })} />
                  ) : <span style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>{r.recommendation}</span>}
                </td>
                <td style={cell}>
                  {editable ? (
                    <>
                      <input className="form-input text-sm" list="compliance-locations" value={r.location}
                        onChange={e => update(i, { location: e.target.value })} />
                    </>
                  ) : <span style={{ color: 'var(--text-primary)' }}>{r.location}</span>}
                </td>
                <td style={{ ...cell, fontWeight: 600, color: 'var(--text-primary)' }}>{r.initials ?? myInitials}</td>
                {editable && (
                  <td style={{ ...cell, textAlign: 'center' }}>
                    <button type="button" className="btn-ghost p-1" title="Remove" onClick={() => remove(i)}>
                      <Trash2 size={13} style={{ color: '#dc2626' }} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="compliance-locations">
        {LOCATION_OPTIONS.map(o => <option key={o} value={o} />)}
      </datalist>

      {editable && (
        <button type="button" className="btn-secondary text-xs flex items-center gap-1.5" onClick={add}>
          <Plus size={13} /> Add recommendation
        </button>
      )}
    </div>
  )
}
