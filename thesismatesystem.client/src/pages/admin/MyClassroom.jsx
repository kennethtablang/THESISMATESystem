import { useState, useEffect, useMemo, useRef } from 'react'
import { sectionService, classroomService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import {
  School, Plus, ListChecks, Users, Trash2, Search, CheckCircle2,
} from 'lucide-react'
import { toast } from '../../utils/toast'
import { STUDENT_ID_EXAMPLE, isValidStudentId } from '../../utils/studentId'

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

// The Admin/subject teacher's own block. The SuperAdmin creates the block with the account,
// so there is nothing to create here: the page shows the students accepted into the block
// (with the group each one is in) and the official class list registrations are checked against.
export default function MyClassroom() {
  const [blocks,   setBlocks]   = useState([])
  const [selected, setSelected] = useState(null)
  const [tab,      setTab]      = useState('students')
  const [loading,  setLoading]  = useState(true)

  const [roster,   setRoster]   = useState([])
  const [students, setStudents] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [search,   setSearch]   = useState('')

  // Class list import
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importing,  setImporting]  = useState(false)

  const activeId = useRef(null)

  async function loadBlocks(selectId) {
    const data = await sectionService.mine()
    const list = Array.isArray(data) ? data : []
    setBlocks(list)
    const next = list.find(s => s.id === selectId) ?? list[0]
    if (next) selectBlock(next)
    return list
  }

  useEffect(() => {
    sectionService.mine()
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setBlocks(list)
        if (list[0]) selectBlock(list[0])
      })
      .catch(err => toast.error(err.message || 'Failed to load your classroom.'))
      .finally(() => setLoading(false))
  }, [])

  async function selectBlock(block) {
    activeId.current = block.id
    setSelected(block)
    setSearch('')
    setDetailLoading(true)
    try {
      // activeStudents is already limited to this Admin's block(s) and carries each student's group.
      const [r, st] = await Promise.all([sectionService.roster(block.id), classroomService.activeStudents()])
      if (activeId.current !== block.id) return
      setRoster(Array.isArray(r) ? r : [])
      setStudents((Array.isArray(st) ? st : []).filter(s => s.sectionId === block.id))
    } catch (err) {
      toast.error(err.message || 'Failed to load the classroom.')
    } finally {
      if (activeId.current === block.id) setDetailLoading(false)
    }
  }

  async function importRoster() {
    const entries = parseRoster(importText)
    if (entries.length === 0) { toast.error('Paste at least one Student ID.'); return }
    // Registration only accepts the official format, so a class-list ID in any other shape
    // could never be matched. Stop here and name them rather than sending them off.
    const invalid = entries.filter(e => !isValidStudentId(e.studentNumber)).map(e => e.studentNumber)
    if (invalid.length > 0) {
      toast.error(`Not in the ${STUDENT_ID_EXAMPLE} format: ${invalid.join(', ')}`)
      return
    }
    setImporting(true)
    try {
      const res = await sectionService.addRoster(selected.id, entries)
      toast.success(`${res.added} added to the class list.`)
      if (res.skipped?.length) toast.info(`Skipped (already listed in a block): ${res.skipped.join(', ')}`)
      if (res.invalid?.length) toast.error(`Skipped (not in the ${STUDENT_ID_EXAMPLE} format): ${res.invalid.join(', ')}`)
      setShowImport(false)
      setImportText('')
      await loadBlocks(selected.id)
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
      setBlocks(prev => prev.map(s => s.id === selected.id ? { ...s, rosterCount: s.rosterCount - 1 } : s))
      setSelected(s => s && { ...s, rosterCount: s.rosterCount - 1 })
    } catch (err) {
      toast.error(err.message || 'Failed to remove entry.')
    }
  }

  const q = search.trim().toLowerCase()
  const filteredRoster = useMemo(() => roster.filter(e => q === '' ||
    e.studentNumber.toLowerCase().includes(q) || e.fullName?.toLowerCase().includes(q)), [roster, q])
  const filteredStudents = useMemo(() => students.filter(s => q === '' ||
    s.fullName?.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q) ||
    s.email?.toLowerCase().includes(q) || s.activeGroupName?.toLowerCase().includes(q)), [students, q])

  if (loading) return <><TopBar title="My Classroom" /><PageLoader /></>

  if (!selected) return (
    <div>
      <TopBar title="My Classroom" />
      <div className="flex flex-col items-center justify-center gap-3 py-24 px-6 text-center">
        <School size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>You have no block yet</p>
        <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
          The Super Admin assigns your block when creating your account. Ask them to set it from User Management.
        </p>
      </div>
    </div>
  )

  const withGroup = students.filter(s => s.activeGroupName).length

  return (
    <div>
      <TopBar title="My Classroom" subtitle={`${selected.name} · ${selected.academicYear}`} />

      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        {/* Only accounts created before one-block-per-Admin can hold more than one */}
        {blocks.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {blocks.map(b => (
              <button key={b.id} onClick={() => selectBlock(b)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                style={selected.id === b.id
                  ? { background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.3)' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
                {b.name} · {b.academicYear}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
          <div className="mb-4">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>{selected.name}</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {selected.academicYear} · {selected.isActive ? 'Open for registration' : 'Closed — hidden from registration'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Students', value: selected.studentCount, color: '#3b82f6' },
              { label: 'Groups', value: selected.groupCount, color: '#16a34a' },
              { label: 'On class list', value: selected.rosterCount, color: '#c9a84c' },
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
              { key: 'students', label: 'Students', icon: Users },
              { key: 'roster', label: 'Class list', icon: ListChecks },
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
            {tab === 'roster' && (
              <button className="btn-primary text-xs" onClick={() => { setImportText(''); setShowImport(true) }}><Plus size={12} /> Add IDs</button>
            )}
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
                {students.length === 0
                  ? 'No accepted students yet. Students appear here once you approve their registration.'
                  : 'No students match your search.'}
              </p>
            ) : filteredStudents.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-2.5"
                style={{ borderBottom: idx < filteredStudents.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  {s.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.fullName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.studentId ? `ID: ${s.studentId} · ` : ''}{s.email}</p>
                </div>
                {s.activeGroupName ? (
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(99,102,241,0.08)', color: '#4f46e5' }}>
                    {s.activeGroupName}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                    No group
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {tab === 'students' && students.length > 0 && (
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            {withGroup} of {students.length} student{students.length !== 1 ? 's' : ''} already in a group. Form groups from Manage Groups.
          </p>
        )}
      </div>

      {/* ── Class list import ───────────────────────────────── */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title={`Add to ${selected.name} class list`} size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
          <button className="btn-primary" onClick={importRoster} disabled={importing}>
            {importing ? 'Adding…' : `Add ${parseRoster(importText).length || ''} ID${parseRoster(importText).length === 1 ? '' : 's'}`}
          </button>
        </>}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          One student per line: <code>Student ID, Full Name</code>, with the ID in the <code>{STUDENT_ID_EXAMPLE}</code> format.
          You can paste two columns straight from a spreadsheet.
          The name is optional and is shown next to registrations for comparison.
        </p>
        <textarea className="form-input font-mono text-xs" rows={10} value={importText}
          placeholder={'23-LN-5825, Juan Dela Cruz\n23-LN-5826, Maria Santos'}
          onChange={e => setImportText(e.target.value)} />
      </Modal>
    </div>
  )
}
