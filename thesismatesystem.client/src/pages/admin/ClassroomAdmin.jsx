import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { classroomService, authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import {
  School, Plus, Copy, Check, Users, Search, Mail, RefreshCw,
  Clock, CheckCircle2, AlertCircle, ChevronRight, UserPlus,
} from 'lucide-react'
import { toast } from '../../utils/toast'

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  async function handle() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} title="Copy code"
      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all"
      style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.2)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.18)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.1)'}>
      {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> {text}</>}
    </button>
  )
}

// ── Enrollment row ────────────────────────────────────────────────────────────
function EnrollmentRow({ e }) {
  const statusColor = e.status === 'Active' ? '#16a34a' : '#f59e0b'
  const statusBg    = e.status === 'Active' ? 'rgba(34,197,94,0.08)' : 'rgba(245,158,11,0.08)'
  return (
    <div className="flex items-center gap-3 px-5 py-3 transition-colors"
      onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-subtle)'}
      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
        style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
        {e.student?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {e.student?.fullName}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
          {e.student?.studentId ? `ID: ${e.student.studentId} · ` : ''}{e.student?.email}
        </p>
      </div>
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: statusBg, color: statusColor }}>
        {e.status === 'Active' ? 'Active' : 'Invited'}
      </span>
      {e.groupName && (
        <span className="text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'rgba(99,102,241,0.08)', color: '#4f46e5' }}>
          {e.groupName}
        </span>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClassroomAdmin() {
  const navigate = useNavigate()

  const [classrooms,   setClassrooms]   = useState([])
  const [selected,     setSelected]     = useState(null)
  const [enrollments,  setEnrollments]  = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState('')
  const [enrLoading,   setEnrLoading]   = useState(false)

  // Create classroom
  const [showCreate,   setShowCreate]   = useState(false)
  const [createForm,   setCreateForm]   = useState({ className: '', academicYear: '' })
  const [creating,     setCreating]     = useState(false)
  const [createError,  setCreateError]  = useState('')

  // Invite students
  const [showInvite,   setShowInvite]   = useState(false)
  const [allStudents,  setAllStudents]  = useState([])
  const [studLoading,  setStudLoading]  = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [inviting,     setInviting]     = useState(null)
  const [inviteMsg,    setInviteMsg]    = useState('')

  // Search enrollments
  const [enrSearch,    setEnrSearch]    = useState('')

  useEffect(() => {
    async function load() {
      try {
        let data
        try {
          data = await classroomService.allClassrooms()
        } catch {
          // allClassrooms requires a server restart to activate; fall back to own classrooms
          data = await classroomService.myClassrooms()
        }
        const list = Array.isArray(data) ? data : []
        setClassrooms(list)
        if (list.length > 0) selectClassroom(list[0])
      } catch (err) {
        setLoadError(err.message || 'Failed to load classrooms.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function selectClassroom(cls) {
    setSelected(cls)
    setEnrSearch('')
    setEnrLoading(true)
    try {
      const data = await classroomService.enrollments(cls.id)
      setEnrollments(Array.isArray(data) ? data : [])
    } catch {
      setEnrollments([])
    } finally {
      setEnrLoading(false)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!createForm.className.trim() || !createForm.academicYear.trim()) {
      setCreateError('Both fields are required.'); return
    }
    setCreating(true); setCreateError('')
    try {
      const cls = await classroomService.create(createForm)
      setClassrooms(prev => [cls, ...prev])
      setShowCreate(false)
      setCreateForm({ className: '', academicYear: '' })
      selectClassroom(cls)
      toast.success('Classroom created.')
    } catch (err) {
      setCreateError(err.message || 'Failed to create classroom.')
      toast.error(err.message || 'Failed to create classroom.')
    } finally {
      setCreating(false)
    }
  }

  // ── Invite flow ─────────────────────────────────────────────────────────────
  function openInvite() {
    setInviteMsg('')
    setInviteSearch('')
    setShowInvite(true)
    if (allStudents.length === 0) {
      setStudLoading(true)
      authService.allUsers()
        .then(users => setAllStudents(users.filter(u => u.role === 'Student' && u.isActive)))
        .catch(() => {})
        .finally(() => setStudLoading(false))
    }
  }

  const enrolledIds = useMemo(() => new Set(enrollments.map(e => e.student?.id)), [enrollments])

  const uninvited = useMemo(() => {
    const q = inviteSearch.toLowerCase()
    return allStudents.filter(s =>
      !enrolledIds.has(s.id) &&
      (q === '' || s.fullName?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) ||
        s.studentId?.toLowerCase().includes(q))
    )
  }, [allStudents, enrolledIds, inviteSearch])

  async function handleInvite(student) {
    setInviting(student.id)
    setInviteMsg('')
    try {
      await classroomService.invite(selected.id, { studentIds: [student.id] })
      const data = await classroomService.enrollments(selected.id)
      setEnrollments(Array.isArray(data) ? data : [])
      setInviteMsg(`Invitation sent to ${student.fullName}`)
      toast.success(`Invitation sent to ${student.fullName}.`)
    } catch (err) {
      setInviteMsg(`Error: ${err.message}`)
      toast.error(err.message || 'Failed to send invitation.')
    } finally {
      setInviting(null)
    }
  }

  // ── Filtered enrollments ────────────────────────────────────────────────────
  const filteredEnr = useMemo(() => {
    const q = enrSearch.toLowerCase()
    return enrollments.filter(e =>
      q === '' ||
      e.student?.fullName?.toLowerCase().includes(q) ||
      e.student?.email?.toLowerCase().includes(q) ||
      e.student?.studentId?.toLowerCase().includes(q)
    )
  }, [enrollments, enrSearch])

  const activeCount  = enrollments.filter(e => e.status === 'Active').length
  const invitedCount = enrollments.filter(e => e.status === 'Invited').length

  if (loading) return <><TopBar title="Classrooms" /><PageLoader /></>

  return (
    <div>
      <TopBar title="Classrooms" subtitle={`${classrooms.length} classroom${classrooms.length !== 1 ? 's' : ''}`} />
      {loadError && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          <AlertCircle size={14} />
          {loadError}
        </div>
      )}

      <div className="flex h-[calc(100vh-68px)] overflow-hidden">

        {/* ── Left: classroom list ──────────────────────────────────────── */}
        <aside className="flex-shrink-0 flex flex-col"
          style={{ width: 280, borderRight: '1px solid var(--border-light)', background: 'var(--bg-page)' }}>

          <div className="p-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
            <button className="btn-primary w-full text-sm flex items-center justify-center gap-2"
              onClick={() => { setShowCreate(true); setCreateError('') }}>
              <Plus size={14} /> New Classroom
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {classrooms.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <School size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No classrooms yet</p>
              </div>
            ) : classrooms.map(cls => {
              const isSelected = selected?.id === cls.id
              return (
                <button key={cls.id} onClick={() => selectClassroom(cls)}
                  className="w-full text-left p-3 rounded-xl transition-all duration-150 mb-1"
                  style={{
                    background: isSelected ? 'rgba(201,168,76,0.08)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(201,168,76,0.25)' : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-subtle)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <School size={13} style={{ color: isSelected ? '#c9a84c' : 'var(--text-muted)', flexShrink: 0 }} />
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
                      {cls.className}
                    </p>
                    {!cls.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cls.academicYear} · {cls.enrollmentCount} enrolled</p>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Right: classroom detail ───────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <School size={40} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a classroom to manage it</p>
            </div>
          ) : (
            <div className="p-6 max-w-3xl mx-auto">

              {/* ── Classroom header ─────────────────────────────────── */}
              <div className="rounded-2xl p-5 mb-6"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>{selected.className}</h2>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {selected.academicYear} · FIC: {selected.facultyIC?.fullName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyBtn text={selected.joinCode} />
                    <button
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}
                      onClick={openInvite}
                    >
                      <UserPlus size={12} /> Invite Students
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Enrolled', value: enrollments.length, color: '#3b82f6' },
                    { label: 'Active',          value: activeCount,        color: '#16a34a' },
                    { label: 'Invited (pending)',value: invitedCount,      color: '#f59e0b' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center"
                      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                      <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Enrollments ──────────────────────────────────────── */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                  Students <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>({enrollments.length})</span>
                </h3>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input pl-8 text-xs py-1.5"
                    style={{ width: 200 }}
                    placeholder="Search students…"
                    value={enrSearch}
                    onChange={e => setEnrSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                {enrLoading ? (
                  <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
                ) : filteredEnr.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.35 }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {enrollments.length === 0 ? 'No students enrolled yet. Use the Invite button or share the join code.' : 'No students match your search.'}
                    </p>
                    {enrollments.length === 0 && (
                      <button className="btn-primary mt-3 text-sm" onClick={openInvite}>
                        <UserPlus size={13} /> Invite Students
                      </button>
                    )}
                  </div>
                ) : (
                  filteredEnr.map((e, idx) => (
                    <div key={e.id}
                      style={{ borderBottom: idx < filteredEnr.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <EnrollmentRow e={e} />
                    </div>
                  ))
                )}
              </div>

              <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                Share the join code <strong>{selected.joinCode}</strong> with students, or send direct invitations above.
                Only <strong>Active</strong> students appear in the Add Student list when managing groups.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ── Create Classroom modal ────────────────────────────────────────── */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Classroom" size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </>
        }
      >
        {createError && (
          <div className="mb-4 px-3 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            {createError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Class Name *</label>
            <input type="text" className="form-input" placeholder="e.g. BSIT Capstone 2025-2026"
              value={createForm.className}
              onChange={e => setCreateForm(f => ({ ...f, className: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Academic Year *</label>
            <input type="text" className="form-input" placeholder="e.g. 2025-2026"
              value={createForm.academicYear}
              onChange={e => setCreateForm(f => ({ ...f, academicYear: e.target.value }))} />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            A unique join code will be auto-generated. Students can join via code or by accepting an invitation.
          </p>
        </div>
      </Modal>

      {/* ── Invite Students modal ─────────────────────────────────────────── */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite Students" size="md"
        footer={<button className="btn-secondary" onClick={() => setShowInvite(false)}>Close</button>}
      >
        {inviteMsg && (
          <div className="mb-4 px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
            style={{
              background: inviteMsg.startsWith('Error') ? 'rgba(220,38,38,0.07)' : 'rgba(34,197,94,0.07)',
              color: inviteMsg.startsWith('Error') ? '#dc2626' : '#16a34a',
              border: `1px solid ${inviteMsg.startsWith('Error') ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.2)'}`,
            }}>
            {inviteMsg.startsWith('Error') ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
            {inviteMsg}
          </div>
        )}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input type="text" className="form-input pl-9" autoFocus
            placeholder="Search by name, email, or student ID…"
            value={inviteSearch} onChange={e => setInviteSearch(e.target.value)} />
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)', maxHeight: 340, overflowY: 'auto' }}>
          {studLoading ? (
            <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading students…</div>
          ) : uninvited.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {inviteSearch ? 'No students match your search.' : 'All active students have already been invited or enrolled.'}
              </p>
            </div>
          ) : uninvited.map((s, idx) => {
            const initials = s.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
            return (
              <div key={s.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors"
                style={{ borderBottom: idx < uninvited.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-subtle)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.fullName}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {s.studentId ? `ID: ${s.studentId} · ` : ''}{s.email}
                  </p>
                </div>
                <button
                  onClick={() => handleInvite(s)}
                  disabled={inviting === s.id}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.12)'}
                >
                  {inviting === s.id ? <span className="animate-pulse">Sending…</span> : <><Mail size={12} /> Invite</>}
                </button>
              </div>
            )
          })}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Students will receive a notification and can accept the invitation from their "My Class" page.
          Once accepted, they appear as eligible for group assignment.
        </p>
      </Modal>
    </div>
  )
}
