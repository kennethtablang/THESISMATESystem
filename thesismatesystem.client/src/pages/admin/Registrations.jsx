import { useState, useEffect, useMemo } from 'react'
import { registrationService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import {
  UserCheck, CheckCircle2, XCircle, Clock, Search, MailCheck, MailWarning,
  ListChecks, AlertTriangle,
} from 'lucide-react'
import { toast } from '../../utils/toast'

// "2d 5h left" — how long until the pending registration is removed automatically.
function timeLeft(expiresAt) {
  if (!expiresAt) return null
  const ms = new Date(expiresAt) - new Date()
  if (ms <= 0) return 'Expired'
  const hours = Math.floor(ms / 3_600_000)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h left`
  if (hours > 0) return `${hours}h left`
  return `${Math.max(1, Math.floor(ms / 60_000))}m left`
}

function Pill({ ok, okText, badText, OkIcon, BadIcon }) {
  const color = ok ? '#16a34a' : '#dc2626'
  const Icon = ok ? OkIcon : BadIcon
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(220,38,38,0.08)', color }}>
      <Icon size={11} /> {ok ? okText : badText}
    </span>
  )
}

export default function Registrations() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [search,    setSearch]    = useState('')
  const [busyId,    setBusyId]    = useState(null)
  const [rejecting, setRejecting] = useState(null)
  const [reason,    setReason]    = useState('')

  useEffect(() => {
    let cancelled = false
    const load = () => registrationService.pending()
      .then(data => { if (!cancelled) { setItems(Array.isArray(data) ? data : []); setError('') } })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load registrations.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    load()
    // Countdowns and expiries move on their own; refresh every minute.
    const t = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(r => q === '' ||
      r.fullName?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.studentId?.toLowerCase().includes(q) ||
      r.sectionName?.toLowerCase().includes(q))
  }, [items, search])

  async function approve(r) {
    setBusyId(r.id)
    try {
      await registrationService.approve(r.id)
      setItems(prev => prev.filter(x => x.id !== r.id))
      toast.success(`${r.fullName} approved. They can now sign in.`)
    } catch (err) {
      toast.error(err.message || 'Failed to approve registration.')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmReject() {
    const r = rejecting
    setBusyId(r.id)
    try {
      await registrationService.reject(r.id, reason.trim() || null)
      setItems(prev => prev.filter(x => x.id !== r.id))
      toast.success(`Registration of ${r.fullName} rejected.`)
      setRejecting(null)
    } catch (err) {
      toast.error(err.message || 'Failed to reject registration.')
    } finally {
      setBusyId(null)
    }
  }

  if (loading) return <><TopBar title="Registrations" /><PageLoader /></>

  const readyCount = items.filter(r => r.emailVerified && r.onClassList).length

  return (
    <div>
      <TopBar title="Registrations" subtitle={`${items.length} pending · ${readyCount} ready to approve`} />

      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <div className="rounded-2xl p-4 mb-5 flex items-start gap-3"
          style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.22)' }}>
          <ListChecks size={18} className="shrink-0 mt-0.5" style={{ color: '#c9a84c' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Only registrations for the <strong>blocks assigned to you</strong> appear here — a student who picked another
            block waits for that block&apos;s Admin. A student can be approved once they have verified their email and their
            Student ID is on the class list of the block they chose. Add missing IDs on the <strong>Sections</strong> page.
            Registrations that are not approved within 3 days are removed automatically.
          </p>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            {error}
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState icon={UserCheck} title="No pending registrations"
            description="Registrations for the blocks assigned to you will appear here for review." />
        ) : (
          <>
            <div className="relative mb-3 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input type="text" className="form-input pl-8 text-sm" placeholder="Search name, ID, email, section…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              {filtered.map((r, idx) => {
                const canApprove = r.emailVerified && r.onClassList
                const nameMismatch = r.onClassList && r.classListName &&
                  r.classListName.trim().toLowerCase() !== r.fullName.trim().toLowerCase()
                const left = timeLeft(r.expiresAt)
                return (
                  <div key={r.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3"
                    style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{r.fullName}</p>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                          {r.studentId}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: '#4f46e5' }}>
                          {r.sectionName ?? 'No section'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {r.email} · submitted {new Date(r.submittedAt).toLocaleString()}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Pill ok={r.emailVerified} okText="Email verified" badText="Email not verified"
                          OkIcon={MailCheck} BadIcon={MailWarning} />
                        <Pill ok={r.onClassList} okText="On class list" badText="Not on class list"
                          OkIcon={CheckCircle2} BadIcon={XCircle} />
                        {left && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(245,158,11,0.1)', color: '#b45309' }}>
                            <Clock size={11} /> {left}
                          </span>
                        )}
                      </div>
                      {nameMismatch && (
                        <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#b45309' }}>
                          <AlertTriangle size={11} /> Class list name: <strong>{r.classListName}</strong>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button className="btn-secondary text-xs" disabled={busyId === r.id}
                        onClick={() => { setRejecting(r); setReason('') }}>
                        <XCircle size={13} /> Reject
                      </button>
                      <button className="btn-primary text-xs" disabled={!canApprove || busyId === r.id}
                        title={canApprove ? 'Approve and activate the account' : 'Needs a verified email and a matching class-list entry'}
                        onClick={() => approve(r)}>
                        <CheckCircle2 size={13} /> {busyId === r.id ? 'Working…' : 'Approve'}
                      </button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No registrations match your search.</p>
              )}
            </div>
          </>
        )}
      </div>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Reject registration" size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setRejecting(null)}>Cancel</button>
            <button className="btn-danger" onClick={confirmReject} disabled={busyId === rejecting?.id}>
              {busyId === rejecting?.id ? 'Rejecting…' : 'Reject'}
            </button>
          </>
        }
      >
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          The registration of <strong>{rejecting?.fullName}</strong> will be removed and they will be emailed.
          They can register again with corrected details.
        </p>
        <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
          Reason <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional, included in the email)</span>
        </label>
        <textarea className="form-input" rows={3} maxLength={500} value={reason}
          placeholder="e.g. Student ID not found in BSIT 4A class list"
          onChange={e => setReason(e.target.value)} />
      </Modal>
    </div>
  )
}
