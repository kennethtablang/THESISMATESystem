import { useState, useEffect, useMemo, useRef } from 'react'
import { sectionService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import {
  Layers, Plus, Pencil, ListChecks, Users, Trash2, Search, UserPlus, CheckCircle2,
} from 'lucide-react'
import { toast } from '../../utils/toast'

const EMPTY_SECTION = { name: '', academicYear: '', isActive: true }

// One "Student ID, Full Name" per line; tabs and semicolons also work so a column pasted
// from a spreadsheet goes straight in.
function parseRoster(text) {
  return text.split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [studentNumber, ...rest] = line.split(/[,\t;]/)
      return { studentNumber: studentNumber.trim(), fullName: rest.join(' ').trim() || null }
    })
    .filter(e => e.studentNumber)
}

export default function Sections() {
  const [sections, setSections] = useState([])
  const [selected, setSelected] = useState(null)
  const [tab,      setTab]      = useState('roster')
  const [loading,  setLoading]  = useState(true)

  const [roster,   setRoster]   = useState([])
  const [students, setStudents] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [search,   setSearch]   = useState('')

  // Section create/edit
  const [editing,  setEditing]  = useState(null) // null = closed, {} = new, section = edit
  const [form,     setForm]     = useState(EMPTY_SECTION)
  const [saving,   setSaving]   = useState(false)

  // Roster import
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing,  setImporting]  = useState(false)

  // Assign existing students
  const [showAssign, setShowAssign] = useState(false)
  const [unassigned, setUnassigned] = useState([])
  const [picked,     setPicked]     = useState(new Set())
  const [assigning,  setAssigning]  = useState(false)

  const activeId = useRef(null)

  async function loadSections(selectId) {
    const data = await sectionService.list()
    const list = Array.isArray(data) ? data : []
    setSections(list)
    const next = list.find(s => s.id === selectId) ?? list[0]
    if (next) selectSection(next)
    return list
  }

  useEffect(() => {
    sectionService.list()
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setSections(list)
        if (list[0]) selectSection(list[0])
      })
      .catch(err => toast.error(err.message || 'Failed to load sections.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function selectSection(sec) {
    activeId.current = sec.id
    setSelected(sec)
    setSearch('')
    setDetailLoading(true)
    try {
      const [r, st] = await Promise.all([sectionService.roster(sec.id), sectionService.students(sec.id)])
      if (activeId.current !== sec.id) return
      setRoster(Array.isArray(r) ? r : [])
      setStudents(Array.isArray(st) ? st : [])
    } catch (err) {
      toast.error(err.message || 'Failed to load section details.')
    } finally {
      if (activeId.current === sec.id) setDetailLoading(false)
    }
  }

  function openEdit(sec) {
    setEditing(sec ?? {})
    setForm(sec ? { name: sec.name, academicYear: sec.academicYear, isActive: sec.isActive } : EMPTY_SECTION)
  }

  async function saveSection() {
    if (!form.name.trim() || !form.academicYear.trim()) { toast.error('Name and academic year are required.'); return }
    setSaving(true)
    try {
      const saved = editing?.id
        ? await sectionService.update(editing.id, form)
        : await sectionService.create(form)
      await loadSections(saved.id)
      setEditing(null)
      toast.success(editing?.id ? 'Section updated.' : 'Section created.')
    } catch (err) {
      toast.error(err.message || 'Failed to save section.')
    } finally {
      setSaving(false)
    }
  }

  async function importRoster() {
    const entries = parseRoster(importText)
    if (entries.length === 0) { toast.error('Paste at least one Student ID.'); return }
    setImporting(true)
    try {
      const res = await sectionService.addRoster(selected.id, entries)
      toast.success(`${res.added} added to the class list.`)
      if (res.skipped?.length) toast.info(`Skipped (already listed in a section): ${res.skipped.join(', ')}`)
      setShowImport(false)
      setImportText('')
      await loadSections(selected.id)
    } catch (err) {
      toast.error(err.message || 'Failed to update the class list.')
    } finally {
      setImporting(false)
    }
  }

  async function removeEntry(entry) {
    try {
      await sectionService.removeRoster(selected.id, entry.id)
      setRoster(prev => prev.filter(e => e.id !== entry.id))
      setSections(prev => prev.map(s => s.id === selected.id ? { ...s, rosterCount: s.rosterCount - 1 } : s))
    } catch (err) {
      toast.error(err.message || 'Failed to remove entry.')
    }
  }

  async function openAssign() {
    setPicked(new Set())
    setShowAssign(true)
    try {
      const data = await sectionService.unassignedStudents()
      setUnassigned(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error(err.message || 'Failed to load students.')
    }
  }

  async function assignPicked() {
    if (picked.size === 0) return
    setAssigning(true)
    try {
      await sectionService.assignStudents(selected.id, [...picked])
      toast.success(`${picked.size} student${picked.size !== 1 ? 's' : ''} assigned to ${selected.name}.`)
      setShowAssign(false)
      await loadSections(selected.id)
    } catch (err) {
      toast.error(err.message || 'Failed to assign students.')
    } finally {
      setAssigning(false)
    }
  }

  const q = search.trim().toLowerCase()
  const filteredRoster = useMemo(() => roster.filter(e => q === '' ||
    e.studentNumber.toLowerCase().includes(q) || e.fullName?.toLowerCase().includes(q)), [roster, q])
  const filteredStudents = useMemo(() => students.filter(s => q === '' ||
    s.fullName?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)), [students, q])

  if (loading) return <><TopBar title="Sections" /><PageLoader /></>

  return (
    <div>
      <TopBar title="Sections" subtitle="Blocks, their official class lists, and their students" />

      <div className="flex flex-col md:flex-row md:h-[calc(100vh-68px)] md:overflow-hidden">
        {/* ── Left: sections ─────────────────────────────────────── */}
        <aside className="md:w-[280px] shrink-0 flex flex-col"
          style={{ borderRight: '1px solid var(--border-light)', background: 'var(--bg-page)' }}>
          <div className="p-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <button className="btn-primary w-full text-sm flex items-center justify-center gap-2" onClick={() => openEdit(null)}>
              <Plus size={14} /> New Section
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {sections.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Layers size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sections yet</p>
              </div>
            ) : sections.map(sec => {
              const isSel = selected?.id === sec.id
              return (
                <button key={sec.id} onClick={() => selectSection(sec)}
                  className="w-full text-left p-3 rounded-xl transition-all duration-150 mb-1"
                  style={{
                    background: isSel ? 'rgba(201,168,76,0.08)' : 'transparent',
                    border: `1px solid ${isSel ? 'rgba(201,168,76,0.25)' : 'transparent'}`,
                  }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Layers size={13} style={{ color: isSel ? '#c9a84c' : 'var(--text-muted)' }} />
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>{sec.name}</p>
                    {!sec.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>Inactive</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {sec.academicYear} · {sec.studentCount} students · {sec.rosterCount} on list
                  </p>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Right: detail ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <Layers size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Create a section to get started</p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 max-w-3xl mx-auto">
              <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>{selected.name}</h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {selected.academicYear} · {selected.isActive ? 'Open for registration' : 'Inactive — hidden from registration'}
                    </p>
                  </div>
                  <button className="btn-secondary text-xs" onClick={() => openEdit(selected)}><Pencil size={12} /> Edit</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'On class list', value: selected.rosterCount, color: '#c9a84c' },
                    { label: 'Students', value: selected.studentCount, color: '#3b82f6' },
                    { label: 'Classrooms', value: selected.classroomCount, color: '#16a34a' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                  {[
                    { key: 'roster', label: 'Class list', icon: ListChecks },
                    { key: 'students', label: 'Students', icon: Users },
                  ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
                      style={tab === t.key
                        ? { background: 'var(--bg-card)', color: 'var(--text-heading)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
                        : { color: 'var(--text-muted)' }}>
                      <t.icon size={12} /> {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="text" className="form-input pl-8 text-xs py-1.5" style={{ width: 180 }}
                      placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  {tab === 'roster'
                    ? <button className="btn-primary text-xs" onClick={() => { setImportText(''); setShowImport(true) }}><Plus size={12} /> Add IDs</button>
                    : <button className="btn-primary text-xs" onClick={openAssign}><UserPlus size={12} /> Assign students</button>}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                {detailLoading ? (
                  <p className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
                ) : tab === 'roster' ? (
                  filteredRoster.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      {roster.length === 0
                        ? 'The class list is empty. Add the Student IDs of everyone officially enrolled in this block — registrations are only approved against this list.'
                        : 'No entries match your search.'}
                    </p>
                  ) : filteredRoster.map((e, idx) => (
                    <div key={e.id} className="flex items-center gap-3 px-5 py-2.5"
                      style={{ borderBottom: idx < filteredRoster.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
                        {e.studentNumber}
                      </span>
                      <p className="flex-1 min-w-0 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{e.fullName ?? '—'}</p>
                      {e.registeredUserId ? (
                        <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a' }}>
                          <CheckCircle2 size={11} /> Registered
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                          Not registered
                        </span>
                      )}
                      <button className="p-1 rounded-lg" title="Remove from class list" aria-label="Remove from class list"
                        style={{ color: 'var(--text-muted)' }} onClick={() => removeEntry(e)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                ) : (
                  filteredStudents.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      {students.length === 0 ? 'No approved students in this section yet.' : 'No students match your search.'}
                    </p>
                  ) : filteredStudents.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-3 px-5 py-2.5"
                      style={{ borderBottom: idx < filteredStudents.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.fullName}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.studentId ? `ID: ${s.studentId} · ` : ''}{s.email}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Section create/edit ─────────────────────────────── */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Section' : 'New Section'} size="sm"
        footer={<>
          <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          <button className="btn-primary" onClick={saveSection} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Section name *</label>
            <input className="form-input" placeholder="e.g. BSIT 4A" maxLength={100}
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Academic year *</label>
            <input className="form-input" placeholder="e.g. 2025-2026" maxLength={20}
              value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
            Open for registration
          </label>
        </div>
      </Modal>

      {/* ── Class list import ───────────────────────────────── */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title={`Add to ${selected?.name ?? ''} class list`} size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
          <button className="btn-primary" onClick={importRoster} disabled={importing}>
            {importing ? 'Adding…' : `Add ${parseRoster(importText).length || ''} ID${parseRoster(importText).length === 1 ? '' : 's'}`}
          </button>
        </>}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          One student per line: <code>Student ID, Full Name</code>. You can paste two columns straight from a spreadsheet.
          The name is optional and is shown next to registrations for comparison.
        </p>
        <textarea className="form-input font-mono text-xs" rows={10} value={importText}
          placeholder={'2022-00123, Juan Dela Cruz\n2022-00124, Maria Santos'}
          onChange={e => setImportText(e.target.value)} />
      </Modal>

      {/* ── Assign existing students ────────────────────────── */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title={`Assign students to ${selected?.name ?? ''}`} size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setShowAssign(false)}>Cancel</button>
          <button className="btn-primary" onClick={assignPicked} disabled={assigning || picked.size === 0}>
            {assigning ? 'Assigning…' : `Assign ${picked.size || ''}`}
          </button>
        </>}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Existing student accounts that have no section yet. New registrations get their section when they are approved.
        </p>
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)', maxHeight: 340, overflowY: 'auto' }}>
          {unassigned.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Every student already has a section.</p>
          ) : unassigned.map((s, idx) => (
            <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
              style={{ borderBottom: idx < unassigned.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
              <input type="checkbox" checked={picked.has(s.id)}
                onChange={() => setPicked(prev => {
                  const next = new Set(prev)
                  next.has(s.id) ? next.delete(s.id) : next.add(s.id)
                  return next
                })} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.fullName}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.studentId ? `ID: ${s.studentId} · ` : ''}{s.email}</p>
              </div>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  )
}
