import { useState, useEffect, useMemo } from 'react'
import { ClipboardList, Plus, Pencil, Trash2, AlertCircle, Info } from 'lucide-react'
import { defenseService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { toast } from '../../utils/toast'

const PHASES = [
  { key: 'TitleDefense',    label: 'Title Defense',    color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
  { key: 'ProposalDefense', label: 'Proposal Defense', color: '#c9a84c', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.3)' },
  { key: 'FinalDefense',    label: 'Final Defense',    color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.2)'  },
]

const BLANK_FORM = { name: '', description: '', weight: '', maxScore: 100 }

export default function RubricManager() {
  const [activePhase, setActivePhase] = useState('TitleDefense')
  const [criteriaMap, setCriteriaMap] = useState({ TitleDefense: [], ProposalDefense: [], FinalDefense: [] })
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  // Add form
  const [showAdd,   setShowAdd]   = useState(false)
  const [addForm,   setAddForm]   = useState(BLANK_FORM)
  const [addSaving, setAddSaving] = useState(false)
  const [addError,  setAddError]  = useState(null)

  // Edit state
  const [editId,     setEditId]     = useState(null)
  const [editForm,   setEditForm]   = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState(null)

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [td, pd, fd] = await Promise.all([
        defenseService.criteria('TitleDefense'),
        defenseService.criteria('ProposalDefense'),
        defenseService.criteria('FinalDefense'),
      ])
      setCriteriaMap({ TitleDefense: td, ProposalDefense: pd, FinalDefense: fd })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const phase    = PHASES.find(p => p.key === activePhase)
  const criteria = criteriaMap[activePhase] ?? []

  const totalWeight = useMemo(
    () => criteria.reduce((s, c) => s + Number(c.weight), 0),
    [criteria]
  )

  function weightStatus() {
    const diff = Math.abs(totalWeight - 100)
    if (diff < 0.01) return { label: '100% — balanced',             color: '#16a34a', bg: 'rgba(22,163,74,0.08)'   }
    if (diff <= 5)   return { label: `${totalWeight.toFixed(1)}% — close`,           color: '#c9a84c', bg: 'rgba(201,168,76,0.08)' }
    return               { label: `${totalWeight.toFixed(1)}% — does not total 100%`, color: '#dc2626', bg: 'rgba(220,38,38,0.07)' }
  }

  // ── Add ──────────────────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault()
    setAddError(null)
    if (!addForm.name.trim()) return setAddError('Name is required.')
    const w = Number(addForm.weight)
    if (!w || w <= 0 || w > 100) return setAddError('Weight must be between 0.01 and 100.')
    setAddSaving(true)
    try {
      const created = await defenseService.createCriterion({
        name:        addForm.name.trim(),
        description: addForm.description.trim() || null,
        weight:      w,
        maxScore:    Number(addForm.maxScore) || 100,
        phase:       activePhase,
      })
      setCriteriaMap(prev => ({ ...prev, [activePhase]: [...prev[activePhase], created] }))
      setAddForm(BLANK_FORM)
      setShowAdd(false)
      toast.success('Criterion added.')
    } catch (e) {
      setAddError(e.message)
      toast.error(e.message || 'Failed to add criterion.')
    } finally {
      setAddSaving(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  function openEdit(c) {
    setEditId(c.id)
    setEditForm({ name: c.name, description: c.description ?? '', weight: c.weight, maxScore: c.maxScore })
    setEditError(null)
  }
  function cancelEdit() { setEditId(null); setEditError(null) }

  async function handleEdit(e) {
    e.preventDefault()
    setEditError(null)
    if (!editForm.name?.trim()) return setEditError('Name is required.')
    const w = Number(editForm.weight)
    if (!w || w <= 0 || w > 100) return setEditError('Weight must be between 0.01 and 100.')
    setEditSaving(true)
    try {
      const updated = await defenseService.updateCriterion(editId, {
        name:        editForm.name.trim(),
        description: editForm.description?.trim() || null,
        weight:      w,
        maxScore:    Number(editForm.maxScore) || 100,
      })
      setCriteriaMap(prev => ({
        ...prev,
        [activePhase]: prev[activePhase].map(c => c.id === editId ? updated : c),
      }))
      setEditId(null)
      toast.success('Criterion updated.')
    } catch (e) {
      setEditError(e.message)
      toast.error(e.message || 'Failed to update criterion.')
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await defenseService.deleteCriterion(deleteTarget.id)
      setCriteriaMap(prev => ({
        ...prev,
        [activePhase]: prev[activePhase].filter(c => c.id !== deleteTarget.id),
      }))
      setDeleteTarget(null)
      toast.success('Criterion removed.')
    } catch (err) {
      setDeleteTarget(null)
      toast.error(err?.message || 'Failed to remove criterion.')
    } finally {
      setDeleting(false)
    }
  }

  const ws = weightStatus()

  if (loading) return <><TopBar title="Rubric Manager" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title="Rubric Manager"
        subtitle="Define evaluation criteria for each defense phase"
      />
      <div className="p-4 sm:p-8">
        <div className="max-w-4xl">

          {/* Info banner */}
          <div className="mb-5 p-4 rounded-xl text-sm flex items-start gap-3"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)' }}>
            <Info size={15} style={{ color: '#c9a84c', marginTop: 1, flexShrink: 0 }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              Weights across all criteria in a phase should total 100%.
              These criteria are used by panelists when rating student defenses.
            </span>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl flex items-center gap-2 text-sm"
              style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          {/* Phase tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {PHASES.map(ph => (
              <button
                key={ph.key}
                onClick={() => { setActivePhase(ph.key); setShowAdd(false); setEditId(null) }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                style={activePhase === ph.key
                  ? { background: ph.bg, color: ph.color, border: `1.5px solid ${ph.border}` }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1.5px solid var(--border-light)' }
                }
              >
                {ph.label}
                {criteriaMap[ph.key]?.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                    style={{
                      background: activePhase === ph.key ? ph.bg : 'var(--bg-card)',
                      color: ph.color,
                    }}>
                    {criteriaMap[ph.key].length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main card */}
          <div className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)' }}>

            {/* Card header */}
            <div className="px-5 py-4 flex items-center justify-between"
              style={{ background: phase.bg, borderBottom: `1px solid ${phase.border}` }}>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold" style={{ color: phase.color }}>{phase.label}</span>
                {criteria.length > 0 && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background: ws.bg, color: ws.color, border: `1px solid ${ws.color}33` }}>
                    {ws.label}
                  </span>
                )}
              </div>
              <button
                onClick={() => { setShowAdd(v => !v); setEditId(null) }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={{ background: phase.color, color: '#fff' }}>
                <Plus size={13} /> Add Criterion
              </button>
            </div>

            {/* Weight progress bar */}
            {criteria.length > 0 && (
              <div className="px-5 pt-3 pb-1" style={{ background: 'var(--bg-card)' }}>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(totalWeight, 100)}%`, background: ws.color }} />
                </div>
              </div>
            )}

            {/* Add form */}
            {showAdd && (
              <form onSubmit={handleAdd}
                className="px-5 py-4 border-b"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-light)' }}>
                <p className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: phase.color }}>
                  New Criterion
                </p>
                {addError && (
                  <div className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
                    style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <AlertCircle size={12} /> {addError}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Name *</label>
                    <input className="form-input text-sm" placeholder="e.g. Problem Identification" autoFocus
                      value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                        Weight % * <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>
                          ({Math.max(0, 100 - totalWeight).toFixed(0)} remaining)
                        </span>
                      </label>
                      <input type="number" className="form-input text-sm" placeholder="25" min="0.01" max="100" step="0.01"
                        value={addForm.weight} onChange={e => setAddForm(f => ({ ...f, weight: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Max Score</label>
                      <input type="number" className="form-input text-sm" placeholder="100" min="1" max="1000"
                        value={addForm.maxScore} onChange={e => setAddForm(f => ({ ...f, maxScore: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Description <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
                  <textarea className="form-input text-sm resize-none" rows={2}
                    placeholder="What this criterion evaluates…"
                    value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" className="btn-secondary text-xs px-3 py-1.5"
                    onClick={() => { setShowAdd(false); setAddForm(BLANK_FORM); setAddError(null) }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={addSaving}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background: phase.color, color: '#fff', opacity: addSaving ? 0.7 : 1 }}>
                    {addSaving ? 'Adding…' : 'Add Criterion'}
                  </button>
                </div>
              </form>
            )}

            {/* Criteria list */}
            <div style={{ background: 'var(--bg-card)' }}>
              {criteria.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No criteria yet"
                  description={`Add criteria to define the ${phase.label} rubric. Weights should total 100%.`}
                  action={
                    <button className="btn-primary" onClick={() => setShowAdd(true)}>
                      <Plus size={14} /> Add First Criterion
                    </button>
                  }
                />
              ) : (
                criteria.map(c => (
                  <div key={c.id}
                    className="px-5 py-4 border-b last:border-b-0"
                    style={{ borderColor: 'var(--border-light)' }}>
                    {editId === c.id ? (
                      // ── Inline edit form ──────────────────────────────────────
                      <form onSubmit={handleEdit}>
                        {editError && (
                          <div className="mb-3 px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
                            style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                            <AlertCircle size={12} /> {editError}
                          </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Name *</label>
                            <input className="form-input text-sm" autoFocus
                              value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Weight %</label>
                              <input type="number" className="form-input text-sm" min="0.01" max="100" step="0.01"
                                value={editForm.weight} onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))} />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Max Score</label>
                              <input type="number" className="form-input text-sm" min="1" max="1000"
                                value={editForm.maxScore} onChange={e => setEditForm(f => ({ ...f, maxScore: e.target.value }))} />
                            </div>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Description</label>
                          <textarea className="form-input text-sm resize-none" rows={2}
                            value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={cancelEdit}>
                            Cancel
                          </button>
                          <button type="submit" disabled={editSaving}
                            className="text-xs px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: phase.color, color: '#fff', opacity: editSaving ? 0.7 : 1 }}>
                            {editSaving ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      // ── Read-only row ─────────────────────────────────────────
                      <div className="flex items-start gap-4">
                        {/* Weight badge */}
                        <div className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                          style={{ background: phase.bg, border: `1px solid ${phase.border}` }}>
                          <span className="text-lg font-bold leading-none" style={{ color: phase.color }}>
                            {Number(c.weight) % 1 === 0 ? Number(c.weight) : Number(c.weight).toFixed(1)}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: phase.color }}>%</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{c.name}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded-md"
                              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                              Max {c.maxScore} pts
                            </span>
                          </div>
                          {c.description && (
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={() => openEdit(c)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}
                            title="Edit criterion"
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(c)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                            style={{ background: 'rgba(220,38,38,0.06)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.15)' }}
                            title="Remove criterion"
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.13)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Weight summary footer */}
            {criteria.length > 0 && (
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg-subtle)', borderTop: '1px solid var(--border-light)' }}>
                <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Info size={12} />
                  {criteria.length} {criteria.length === 1 ? 'criterion' : 'criteria'}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: ws.bg, color: ws.color }}>
                  Total: {totalWeight.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Delete confirm modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => { if (!deleting) setDeleteTarget(null) }}
        title="Remove Criterion"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: '#dc2626', color: '#fff', opacity: deleting ? 0.7 : 1 }}>
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <div className="space-y-3">
            <div className="rounded-xl p-3.5"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>
                "{deleteTarget.name}"
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {phase.label} · {Number(deleteTarget.weight).toFixed(1)}% weight · Max {deleteTarget.maxScore} pts
              </p>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This cannot be undone. Existing ratings that reference this criterion will be preserved for historical records.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
