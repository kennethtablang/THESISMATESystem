import { useState, useEffect } from 'react'
import { Sparkles, AlertTriangle, X, CalendarDays, MapPin, Users } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { defenseService } from '../../services/api'
import { toast } from '../../utils/toast'

const PHASE_LABELS = {
  TitleDefense: 'Title Defense',
  ProposalDefense: 'Proposal Defense',
  FinalDefense: 'Final Defense',
  ReDefense: 'Re-Defense',
}

// yyyy-MM-dd in the browser's local calendar (the school runs on Philippine time).
function isoDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function defaults(phase) {
  const start = new Date(); start.setDate(start.getDate() + 1)
  const end = new Date(start); end.setDate(end.getDate() + 6)
  return {
    phase, startDate: isoDate(start), endDate: isoDate(end),
    dayStart: '08:00', dayEnd: '17:00', durationMinutes: 60, breakMinutes: 15,
    venues: 'Room 301', skipWeekends: true, maxDefensesPerFacultyPerDay: 4, requireReadiness: true,
  }
}

const fmt = (iso) => new Date(iso).toLocaleString('en-PH', {
  weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
})

/**
 * Generates a conflict-free defense schedule on the server, lets the Admin review and trim it,
 * then saves it. Nothing is written until "Confirm" — the proposal is only a suggestion.
 */
export default function AutoScheduleModal({ open, onClose, phase, candidateGroups, onSaved }) {
  const [form, setForm] = useState(defaults(phase))
  const [groupIds, setGroupIds] = useState([])
  const [proposal, setProposal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Reset only when the modal opens: the parent rebuilds candidateGroups on every render,
  // so depending on it would wipe the form while the Admin is filling it in.
  useEffect(() => {
    if (!open) return
    setForm(defaults(phase))
    setGroupIds(candidateGroups.map(g => g.id))
    setProposal(null)
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  async function generate() {
    setError('')
    const venues = form.venues.split(/[\n,]/).map(v => v.trim()).filter(Boolean)
    if (venues.length === 0) { setError('Add at least one venue.'); return }
    if (groupIds.length === 0) { setError('Select at least one group.'); return }
    setBusy(true)
    try {
      const result = await defenseService.autoSchedulePreview({
        ...form,
        venues,
        groupIds,
        durationMinutes: Number(form.durationMinutes),
        breakMinutes: Number(form.breakMinutes),
        maxDefensesPerFacultyPerDay: Number(form.maxDefensesPerFacultyPerDay),
      })
      setProposal(result)
    } catch (err) {
      setError(err.message || 'Could not generate a schedule.')
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!proposal?.proposals.length) return
    setBusy(true)
    try {
      const result = await defenseService.autoScheduleConfirm(proposal.proposals.map(p => ({
        groupId: p.groupId,
        scheduledDateTime: p.scheduledDateTime,
        durationMinutes: p.durationMinutes,
        venue: p.venue,
        phase: p.phase,
        panelistIds: p.panelistIds,
      })))
      if (result.created.length) toast.success(`${result.created.length} defense${result.created.length !== 1 ? 's' : ''} scheduled. Groups and panels have been notified.`)
      if (result.failed.length) {
        toast.error(`${result.failed.length} could not be saved — see details.`)
        setProposal(p => ({
          ...p,
          proposals: [],
          unscheduled: result.failed.map(f => ({ ...f, groupName: f.groupName || p.proposals.find(x => x.groupId === f.groupId)?.groupName })),
        }))
      } else {
        onClose()
      }
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Failed to save the schedule.')
    } finally {
      setBusy(false)
    }
  }

  const label = (text) => <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>{text}</label>

  return (
    <Modal open={open} onClose={onClose} size="xl"
      title={`Auto-generate ${PHASE_LABELS[phase] ?? ''} schedule`}
      footer={proposal ? (
        <>
          <button className="btn-secondary mr-auto" onClick={() => setProposal(null)} disabled={busy}>Back</button>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Close</button>
          <button className="btn-primary" onClick={confirm} disabled={busy || proposal.proposals.length === 0}>
            {busy ? 'Saving…' : `Confirm ${proposal.proposals.length} defense${proposal.proposals.length !== 1 ? 's' : ''}`}
          </button>
        </>
      ) : (
        <>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={generate} disabled={busy}>
            <Sparkles size={14} /> {busy ? 'Generating…' : 'Generate proposal'}
          </button>
        </>
      )}>
      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          {error}
        </div>
      )}

      {!proposal ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              The scheduler places each group in the earliest slot where its whole panel, its adviser and a venue are all free,
              starting with the groups whose people are busiest. Nothing is saved until you confirm.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>{label('From')}<input type="date" className="form-input" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></div>
              <div>{label('To')}<input type="date" className="form-input" value={form.endDate} onChange={e => set('endDate', e.target.value)} /></div>
              <div>{label('Day starts')}<input type="time" className="form-input" min="06:00" max="19:00" value={form.dayStart} onChange={e => set('dayStart', e.target.value)} /></div>
              <div>{label('Day ends')}<input type="time" className="form-input" min="06:00" max="19:00" value={form.dayEnd} onChange={e => set('dayEnd', e.target.value)} /></div>
              <div>{label('Defense length (min)')}<input type="number" min="15" max="480" className="form-input" value={form.durationMinutes} onChange={e => set('durationMinutes', e.target.value)} /></div>
              <div>{label('Break between (min)')}<input type="number" min="0" max="120" className="form-input" value={form.breakMinutes} onChange={e => set('breakMinutes', e.target.value)} /></div>
            </div>
            <div>
              {label('Venues (one per line or comma-separated)')}
              <textarea className="form-input" rows={2} value={form.venues} onChange={e => set('venues', e.target.value)} />
            </div>
            <div>{label('Max defenses per faculty per day')}
              <input type="number" min="1" max="12" className="form-input" value={form.maxDefensesPerFacultyPerDay}
                onChange={e => set('maxDefensesPerFacultyPerDay', e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.skipWeekends} onChange={e => set('skipWeekends', e.target.checked)} /> Skip weekends
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.requireReadiness} onChange={e => set('requireReadiness', e.target.checked)} />
              Only groups that are ready (3 approved chapters for Proposal, 5 for Final)
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              {label(`Groups to schedule (${groupIds.length}/${candidateGroups.length})`)}
              <button className="text-xs font-semibold" style={{ color: '#c9a84c' }}
                onClick={() => setGroupIds(groupIds.length === candidateGroups.length ? [] : candidateGroups.map(g => g.id))}>
                {groupIds.length === candidateGroups.length ? 'Clear' : 'Select all'}
              </button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)', maxHeight: 360, overflowY: 'auto' }}>
              {candidateGroups.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Every group already has this defense scheduled.</p>
              ) : candidateGroups.map((g, idx) => (
                <label key={g.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                  style={{ borderBottom: idx < candidateGroups.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <input type="checkbox" checked={groupIds.includes(g.id)}
                    onChange={() => setGroupIds(ids => ids.includes(g.id) ? ids.filter(x => x !== g.id) : [...ids, g.id])} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{g.projectTitle || g.groupName}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {/* The first line already shows the group name when there is no title yet. */}
                      {g.projectTitle ? `${g.groupName} · ` : ''}panel: {(g.panelMembers?.length ?? 0) || 'none'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {proposal.proposals.length} defense{proposal.proposals.length !== 1 ? 's' : ''} across {proposal.daysUsed} day{proposal.daysUsed !== 1 ? 's' : ''},
            with no panelist, adviser or venue double-booked. Remove any you do not want, then confirm.
          </p>

          {proposal.proposals.length > 0 && (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
              {proposal.proposals.map((p, idx) => (
                <div key={p.groupId} className="flex items-start gap-3 px-4 py-3"
                  style={{ borderBottom: idx < proposal.proposals.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{p.projectTitle || p.groupName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1"><CalendarDays size={11} /> {fmt(p.scheduledDateTime)} · {p.durationMinutes} min</span>
                      <span className="flex items-center gap-1"><MapPin size={11} /> {p.venue}</span>
                      <span className="flex items-center gap-1"><Users size={11} /> {p.panelistNames.join(', ')}</span>
                      <span>Adviser: {p.adviserName}</span>
                    </div>
                  </div>
                  <button className="p-1 rounded-lg shrink-0" style={{ color: 'var(--text-muted)' }}
                    aria-label={`Remove ${p.groupName} from the proposal`} title="Remove from proposal"
                    onClick={() => setProposal(pr => ({ ...pr, proposals: pr.proposals.filter(x => x.groupId !== p.groupId) }))}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {proposal.unscheduled.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: '#b45309' }}>
                <AlertTriangle size={12} /> Not scheduled ({proposal.unscheduled.length})
              </p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.3)' }}>
                {proposal.unscheduled.map((u, idx) => (
                  <div key={`${u.groupId}-${idx}`} className="px-4 py-2.5 text-sm"
                    style={{ borderBottom: idx < proposal.unscheduled.length - 1 ? '1px solid rgba(245,158,11,0.2)' : 'none', background: 'rgba(245,158,11,0.05)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{u.groupName}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}> — {u.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
