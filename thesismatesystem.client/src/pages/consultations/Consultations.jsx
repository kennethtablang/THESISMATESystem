import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, Plus, Pencil, Trash2, Video, Users, Info, CalendarDays } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { consultationService, groupService } from '../../services/api'
import { toast } from '../../utils/toast'

// Consultation log (revision round 8). A consultation is a meeting between a group and its
// adviser; the adviser records each one here (date, mode, what was discussed, the outcome).
// Students, the Admin/subject teacher and the panel can read the log, and it feeds the
// Consultations part (15%) of the group's Monitoring score.

const MODES = { InPerson: 'In person', Online: 'Online' }

function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })
}

const EMPTY_FORM = { capstoneGroupId: '', consultationDate: '', mode: 'InPerson', discussionContent: '', outcome: '' }

export default function Consultations() {
  const { user } = useAuth()
  const role = user?.role
  const isStudent = role === 'Student'
  const [params, setParams] = useSearchParams()
  const groupFilter = params.get('group') ?? ''

  const [groups, setGroups] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)        // null = closed; { id?, ...fields }
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Groups this faculty member advises — the only ones they can log consultations for.
  const advised = useMemo(
    () => groups.filter(g => role === 'Faculty' && g.adviser?.id === user?.id),
    [groups, role, user?.id])

  // Groups the viewer can open and their consultation logs. Faculty: advised plus panel groups
  // (the list endpoint only returns the logs they wrote, so the panel reads per group); the
  // Admin: their block's groups; a student: their own group.
  async function fetchAll() {
    if (isStudent) {
      const g = await groupService.myGroup().catch(() => null)
      return { groups: g ? [g] : [], logs: g ? await consultationService.byGroup(g.id) : [] }
    }
    const [own, panel] = await Promise.all([
      groupService.list().catch(() => []),
      role === 'Faculty' ? groupService.panelGroups().catch(() => []) : [],
    ])
    const gs = [...new Map([...own, ...panel].map(g => [g.id, g])).values()]
    const logList = role === 'Faculty'
      ? (await Promise.all(gs.map(g => consultationService.byGroup(g.id).catch(() => [])))).flat()
      : await consultationService.list()
    return { groups: gs, logs: logList }
  }

  function load() {
    return fetchAll()
      .then(d => { setGroups(d.groups); setLogs(d.logs) })
      .catch(e => toast.error(e.message || 'Failed to load consultations.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [role]) // eslint-disable-line react-hooks/exhaustive-deps -- reload per role only

  const visible = logs
    .filter(l => !groupFilter || String(l.capstoneGroupId) === groupFilter)
    .sort((a, b) => new Date(b.consultationDate) - new Date(a.consultationDate))

  function openNew() {
    const preset = advised.find(g => String(g.id) === groupFilter) ?? advised[0]
    setForm({ ...EMPTY_FORM, capstoneGroupId: preset ? String(preset.id) : '', consultationDate: toLocalInput() })
  }

  function openEdit(log) {
    setForm({
      id: log.id,
      capstoneGroupId: String(log.capstoneGroupId),
      consultationDate: toLocalInput(log.consultationDate),
      mode: log.mode,
      discussionContent: log.discussionContent,
      outcome: log.outcome,
    })
  }

  async function save() {
    if (!form.capstoneGroupId || !form.consultationDate || !form.discussionContent.trim() || !form.outcome.trim()) {
      toast.error('Fill in the group, date, discussion and outcome.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        consultationDate: new Date(form.consultationDate).toISOString(),
        mode: form.mode,
        discussionContent: form.discussionContent.trim(),
        outcome: form.outcome.trim(),
      }
      if (form.id) await consultationService.update(form.id, payload)
      else await consultationService.create({ ...payload, capstoneGroupId: Number(form.capstoneGroupId) })
      toast.success(form.id ? 'Consultation updated.' : 'Consultation logged. The group has been notified.')
      setForm(null)
      load()
    } catch (e) {
      toast.error(e.message || 'Failed to save the consultation.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(log) {
    setConfirmDelete(null)
    try {
      await consultationService.delete(log.id)
      setLogs(prev => prev.filter(l => l.id !== log.id))
      toast.success('Consultation deleted.')
    } catch (e) {
      toast.error(e.message || 'Failed to delete the consultation.')
    }
  }

  if (loading) return <><TopBar title="Consultations" /><PageLoader /></>

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <TopBar title="Consultations" subtitle={`${visible.length} logged consultation${visible.length !== 1 ? 's' : ''}`} />
      <div className="p-4 sm:p-6 lg:p-8 animate-slide-up space-y-5">

        <div className="flex items-start gap-3 rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--text-secondary)' }}>
          <Info size={16} className="shrink-0 mt-0.5" style={{ color: '#c9a84c' }} />
          <p>
            A consultation is a meeting between a group and its adviser. The adviser logs each one here — when it
            happened, in person or online, what was discussed and what was agreed. The group is notified, and the
            log counts toward the Consultations part (15%) of the group's Monitoring score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isStudent && groups.length > 1 && (
            <select className="form-input" style={{ maxWidth: 280 }} value={groupFilter}
              onChange={e => setParams(e.target.value ? { group: e.target.value } : {})}>
              <option value="">All groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
            </select>
          )}
          {advised.length > 0 && (
            <button className="btn-primary ml-auto flex items-center gap-2" onClick={openNew}>
              <Plus size={15} /> Log consultation
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="card">
            <EmptyState icon={MessageSquare} title="No consultations logged yet"
              description={advised.length > 0
                ? 'After meeting with a group, log the consultation here.'
                : isStudent
                  ? 'Your adviser logs each consultation with your group here.'
                  : 'Consultations appear here once the adviser logs them.'} />
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map(log => {
              const mine = log.adviser?.id === user?.id
              return (
                <div key={log.id} className="card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(34,197,94,0.12)' }}>
                      {log.mode === 'Online' ? <Video size={17} style={{ color: '#16a34a' }} /> : <Users size={17} style={{ color: '#16a34a' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
                        {log.groupName}
                        <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-md"
                          style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                          {MODES[log.mode] ?? log.mode}
                        </span>
                      </p>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                        <CalendarDays size={11} /> {formatWhen(log.consultationDate)} · with {log.adviser?.fullName ?? 'the adviser'}
                      </p>
                    </div>
                    {mine && (
                      <div className="flex gap-1">
                        <button className="btn-ghost p-2" title="Edit" onClick={() => openEdit(log)}><Pencil size={14} /></button>
                        <button className="btn-ghost p-2" title="Delete" onClick={() => setConfirmDelete(log)}><Trash2 size={14} style={{ color: '#dc2626' }} /></button>
                      </div>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Discussed</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{log.discussionContent}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>Outcome</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{log.outcome}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete consultation" size="sm"
        footer={<>
          <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={() => remove(confirmDelete)}>Delete</button>
        </>}>
        {confirmDelete && (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Delete the consultation with {confirmDelete.groupName} on {formatWhen(confirmDelete.consultationDate)}?
          </p>
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit consultation' : 'Log consultation'} size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setForm(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        {form && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group *</label>
              <select className="form-input" value={form.capstoneGroupId} disabled={!!form.id}
                onChange={e => set('capstoneGroupId', e.target.value)}>
                <option value="">Select a group</option>
                {advised.map(g => <option key={g.id} value={g.id}>{g.groupName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Date & time *</label>
                <input type="datetime-local" className="form-input" value={form.consultationDate}
                  onChange={e => set('consultationDate', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Mode *</label>
                <select className="form-input" value={form.mode} onChange={e => set('mode', e.target.value)}>
                  {Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>What was discussed *</label>
              <textarea className="form-input" rows={4} value={form.discussionContent}
                onChange={e => set('discussionContent', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Outcome / agreements *</label>
              <textarea className="form-input" rows={3} value={form.outcome}
                onChange={e => set('outcome', e.target.value)} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
