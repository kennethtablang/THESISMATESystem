import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { groupService, authService, classroomService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import {
  ArrowLeft, Users, BookOpen, FileText, Calendar, MessageSquare,
  TrendingUp, Pencil, UserPlus, UserMinus, Search, Image,
  GraduationCap, Archive, CheckCircle2, Clock, AlertCircle, Cpu,
  ChevronRight, CalendarDays,
} from 'lucide-react'

function deadlineInfo(dueDate) {
  if (!dueDate) return { label: 'Not set', color: 'var(--text-muted)', bg: 'var(--bg-subtle)', border: 'var(--border-light)' }
  const diffDays = Math.ceil((new Date(dueDate) - new Date()) / 86400000)
  if (diffDays < 0)  return { label: 'Overdue',          color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.2)' }
  if (diffDays === 0) return { label: 'Due today',        color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.2)' }
  if (diffDays <= 7)  return { label: `Due in ${diffDays}d`, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' }
  return { label: `${diffDays}d left`, color: '#16a34a', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' }
}

function fmt(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    Active:   { color: '#16a34a', bg: 'rgba(34,197,94,0.10)',   label: 'Active' },
    Archived: { color: '#6b7280', bg: 'rgba(107,114,128,0.10)', label: 'Archived' },
    Completed:{ color: '#3b82f6', bg: 'rgba(59,130,246,0.10)',  label: 'Completed' },
  }
  const s = map[status] ?? map.Active
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}30` }}
    >
      {s.label}
    </span>
  )
}

// ── Member row ────────────────────────────────────────────────────────────────
function MemberRow({ member, canRemove, onRemove, removing }) {
  const initials = member.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
  return (
    <div
      className="flex items-center gap-3 px-5 py-3 transition-colors duration-100"
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {member.fullName}
        </p>
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{member.email}</p>
      </div>
      {canRemove && (
        <button
          onClick={() => onRemove(member)}
          disabled={removing === member.id}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-all duration-150"
          style={{ color: '#dc2626', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.18)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.14)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.07)'}
        >
          {removing === member.id
            ? <span className="animate-pulse">Removing…</span>
            : <><UserMinus size={12} /> Remove</>
          }
        </button>
      )}
    </div>
  )
}

// ── Quick link card ────────────────────────────────────────────────────────────
function QuickLink({ icon: Icon, label, desc, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all duration-150"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--bg-card)'
        e.currentTarget.style.borderColor = `${color}40`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--bg-subtle)'
        e.currentTarget.style.borderColor = 'var(--border-main)'
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
      <ChevronRight size={14} className="ml-auto shrink-0" style={{ color: 'var(--text-muted)' }} />
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group,      setGroup]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [notFound,   setNotFound]   = useState(false)

  // Member management
  const [showAddModal,  setShowAddModal]  = useState(false)
  const [allStudents,   setAllStudents]   = useState([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [memberSearch,  setMemberSearch]  = useState('')
  const [addingId,      setAddingId]      = useState(null)
  const [removingId,      setRemovingId]      = useState(null)
  const [memberError,     setMemberError]     = useState('')
  const [confirmRemove,   setConfirmRemove]   = useState(null)  // member object | null
  const [confirmArchive,  setConfirmArchive]  = useState(false)

  // Edit modal (reuses Groups.jsx logic via a lightweight inline form)
  const [showEditModal, setShowEditModal] = useState(false)
  const [advisers,      setAdvisers]      = useState([])
  const [editForm,      setEditForm]      = useState({ groupName: '', projectTitle: '', adviserId: '' })
  const [editSaving,    setEditSaving]    = useState(false)
  const [editError,     setEditError]     = useState('')

  // Logo upload
  const fileRef = useRef(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,     setLogoError]     = useState(false)

  // Deadlines
  const [showDeadlineModal, setShowDeadlineModal] = useState(false)
  const [deadlineForm,      setDeadlineForm]      = useState({ manuscriptDueDate: '', systemFeaturesDueDate: '' })
  const [deadlineSaving,    setDeadlineSaving]    = useState(false)
  const [deadlineError,     setDeadlineError]     = useState('')

  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)
  const canManageDeadlines = ['Admin', 'SuperAdmin', 'Faculty'].includes(user?.role)

  // ── Load group ──────────────────────────────────────────────────────────────
  useEffect(() => {
    groupService.get(id)
      .then(setGroup)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // ── Add member modal ────────────────────────────────────────────────────────
  function openAddModal() {
    setMemberError('')
    setMemberSearch('')
    setShowAddModal(true)
    if (allStudents.length === 0) {
      setStudentsLoading(true)
      classroomService.activeStudents()
        .then(setAllStudents)
        .catch(() => {})
        .finally(() => setStudentsLoading(false))
    }
  }

  const currentMemberIds = new Set(group?.members?.map(m => m.id) ?? [])
  const availableStudents = allStudents.filter(
    s => !currentMemberIds.has(s.id) &&
      (memberSearch === '' ||
        s.fullName?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(memberSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(memberSearch.toLowerCase()))
  )

  async function handleAddMember(student) {
    setAddingId(student.id)
    setMemberError('')
    try {
      const updated = await groupService.addMember(id, student.id)
      setGroup(updated)
    } catch (err) {
      setMemberError(err.message || 'Failed to add member.')
    } finally {
      setAddingId(null)
    }
  }

  function handleRemoveMember(member) {
    setConfirmRemove(member)
  }

  async function doRemoveMember() {
    if (!confirmRemove) return
    setRemovingId(confirmRemove.id)
    setConfirmRemove(null)
    try {
      const updated = await groupService.removeMember(id, confirmRemove.id)
      setGroup(updated)
    } catch (err) {
      setMemberError(err.message || 'Failed to remove member.')
    } finally {
      setRemovingId(null)
    }
  }

  // ── Edit group ──────────────────────────────────────────────────────────────
  function openEditModal() {
    setEditForm({
      groupName:   group.groupName    ?? '',
      projectTitle: group.projectTitle ?? '',
      adviserId:   group.adviser?.id  ?? '',
    })
    setEditError('')
    setShowEditModal(true)
    if (advisers.length === 0) {
      authService.allUsers()
        .then(users => setAdvisers(users.filter(u => u.role === 'Faculty')))
        .catch(() => {})
    }
  }

  async function handleEditSave() {
    if (!editForm.groupName.trim()) { setEditError('Group name is required.'); return }
    if (!editForm.adviserId)        { setEditError('Please select an adviser.'); return }
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await groupService.update(id, {
        groupName:    editForm.groupName.trim(),
        projectTitle: editForm.projectTitle.trim() || null,
        adviserId:    editForm.adviserId,
      })
      setGroup(updated)
      setShowEditModal(false)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  // ── Archive ─────────────────────────────────────────────────────────────────
  function handleArchive() {
    setConfirmArchive(true)
  }

  async function doArchive() {
    setConfirmArchive(false)
    try {
      await groupService.archive(id)
      navigate('/groups')
    } catch (err) {
      setMemberError(err.message || 'Failed to archive group.')
    }
  }

  // ── Logo upload ─────────────────────────────────────────────────────────────
  async function handleLogoUpload(file) {
    if (!file) return
    setLogoUploading(true)
    setLogoError(false)
    try {
      const updated = await groupService.uploadLogo(id, file)
      setGroup(updated)
    } catch (err) {
      alert(err.message || 'Failed to upload logo.')
    } finally {
      setLogoUploading(false)
    }
  }

  // ── Deadlines ────────────────────────────────────────────────────────────────
  function openDeadlineModal() {
    const toInput = (iso) => iso ? new Date(iso).toISOString().split('T')[0] : ''
    setDeadlineForm({
      manuscriptDueDate:     toInput(group.manuscriptDueDate),
      systemFeaturesDueDate: toInput(group.systemFeaturesDueDate),
    })
    setDeadlineError('')
    setShowDeadlineModal(true)
  }

  async function handleDeadlineSave() {
    setDeadlineSaving(true)
    setDeadlineError('')
    try {
      const updated = await groupService.setDeadlines(id, {
        manuscriptDueDate:     deadlineForm.manuscriptDueDate     || null,
        systemFeaturesDueDate: deadlineForm.systemFeaturesDueDate || null,
      })
      setGroup(updated)
      setShowDeadlineModal(false)
    } catch (err) {
      setDeadlineError(err.message || 'Failed to save deadlines.')
    } finally {
      setDeadlineSaving(false)
    }
  }

  // ── Render states ───────────────────────────────────────────────────────────
  if (loading) return <><TopBar title="Group Details" /><PageLoader /></>

  if (notFound) return (
    <>
      <TopBar title="Group Not Found" />
      <div className="p-8 text-center">
        <AlertCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>Group not found</p>
        <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
          This group does not exist or you don't have access to it.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/groups')}>
          <ArrowLeft size={14} /> Back to Groups
        </button>
      </div>
    </>
  )

  const progress     = group.milestoneProgress?.completionPercentage ?? 0
  const displayName  = group.projectTitle || group.groupName
  const progressColor = progress >= 70 ? '#16a34a' : progress >= 40 ? '#c9a84c' : '#e2cc91'

  return (
    <div>
      <TopBar
        title={group.groupName}
        subtitle={group.projectTitle ?? 'No research title set'}
      />

      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">

        {/* ── Back + action row ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            className="btn-ghost text-sm flex items-center gap-1.5"
            onClick={() => navigate('/groups')}
          >
            <ArrowLeft size={15} /> All Groups
          </button>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button className="btn-secondary text-sm flex items-center gap-1.5" onClick={openEditModal}>
                <Pencil size={13} /> Edit
              </button>
              {group.status === 'Active' && (
                <button
                  className="text-sm flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-150"
                  style={{ color: '#6b7280', background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
                  onClick={handleArchive}
                  onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseLeave={e => e.currentTarget.style.color = '#6b7280'}
                >
                  <Archive size={13} /> Archive
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Group header card ─────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}
        >
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="relative shrink-0" onClick={e => e.stopPropagation()}>
              {group.systemLogoUrl && !logoError ? (
                <img
                  src={group.systemLogoUrl}
                  alt={group.groupName}
                  onError={() => setLogoError(true)}
                  style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--border-light)' }}
                />
              ) : (
                <div
                  className="w-15 h-15 rounded-xl flex items-center justify-center font-display font-bold text-2xl"
                  style={{ width: 60, height: 60, background: 'rgba(201,168,76,0.12)', color: '#c9a84c', borderRadius: 14 }}
                >
                  {(group.groupName ?? 'G')[0]}
                </div>
              )}
              {isAdmin && (
                <>
                  <input
                    ref={fileRef} type="file" accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }}
                  />
                  <button
                    title="Upload logo"
                    disabled={logoUploading}
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                    style={{ background: '#c9a84c', color: '#0a1628', border: '2px solid var(--bg-card)' }}
                  >
                    <Image size={9} />
                  </button>
                </>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>
                  {displayName}
                </h2>
                <StatusBadge status={group.status} />
                {group.titleApproved && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: 'rgba(34,197,94,0.10)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <CheckCircle2 size={10} /> Title Approved
                  </span>
                )}
              </div>
              {group.projectTitle && (
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>{group.groupName}</p>
              )}

              <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={14} style={{ color: '#c9a84c' }} />
                  {group.adviser?.fullName ?? '—'}
                </span>
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} />
                  {group.academicYear}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {group.members?.length ?? 0} member{group.members?.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Milestone Progress</span>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={11} style={{ color: '#16a34a' }} />
                  {group.milestoneProgress?.approvedChapters ?? 0} / 5 chapters
                </span>
                {group.milestoneProgress?.defenseCompleted && (
                  <span className="flex items-center gap-1" style={{ color: '#3b82f6' }}>
                    <CheckCircle2 size={11} /> Defense done
                  </span>
                )}
                {group.milestoneProgress?.defenseScheduled && !group.milestoneProgress?.defenseCompleted && (
                  <span className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
                    <Clock size={11} /> Defense scheduled
                  </span>
                )}
                <span className="font-bold" style={{ color: progressColor }}>{progress}%</span>
              </div>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
              <div className="h-2 rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: progressColor }} />
            </div>
          </div>

          {/* Version tags */}
          {(group.manuscriptVersion || group.systemVersion) && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {group.manuscriptVersion && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: 'rgba(201,168,76,0.10)', color: '#a0832a', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <FileText size={11} /> MS {group.manuscriptVersion}
                </span>
              )}
              {group.systemVersion && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: 'rgba(99,102,241,0.08)', color: '#4f46e5', border: '1px solid rgba(99,102,241,0.18)' }}>
                  <Cpu size={11} /> SYS {group.systemVersion}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Deadlines card ────────────────────────────────────────────── */}
        {(() => {
          const msInfo  = deadlineInfo(group.manuscriptDueDate)
          const sfInfo  = deadlineInfo(group.systemFeaturesDueDate)
          return (
            <div className="rounded-2xl p-5"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} style={{ color: '#c9a84c' }} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Deadlines</h3>
                </div>
                {canManageDeadlines && group.status === 'Active' && (
                  <button
                    onClick={openDeadlineModal}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  >
                    <Pencil size={11} /> Set Deadlines
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Manuscript',      icon: FileText, info: msInfo, date: group.manuscriptDueDate },
                  { label: 'System Features', icon: Cpu,      info: sfInfo, date: group.systemFeaturesDueDate },
                ].map(({ label, icon: Icon, info, date }) => (
                  <div key={label} className="rounded-xl p-4 flex items-start gap-3"
                    style={{ background: info.bg, border: `1px solid ${info.border}` }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--bg-card)' }}>
                      <Icon size={15} style={{ color: info.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <p className="text-sm font-semibold" style={{ color: date ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {fmt(date) ?? 'No deadline set'}
                      </p>
                      {date && (
                        <span className="inline-block text-xs font-semibold mt-1 px-2 py-0.5 rounded-full"
                          style={{ background: info.bg, color: info.color, border: `1px solid ${info.border}` }}>
                          {info.label}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Members — takes 2 cols */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                Members <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                  ({group.members?.length ?? 0})
                </span>
              </h3>
              {isAdmin && group.status === 'Active' && (
                <button className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5" onClick={openAddModal}>
                  <UserPlus size={13} /> Add Student
                </button>
              )}
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              {(!group.members || group.members.length === 0) ? (
                <div className="px-5 py-8 text-center">
                  <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>No members yet</p>
                  {isAdmin && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Click "Add Student" to assign students to this group.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  {group.members.map((m, idx) => (
                    <div key={m.id} style={{ borderBottom: idx < group.members.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <MemberRow
                        member={m}
                        canRemove={isAdmin && group.status === 'Active'}
                        onRemove={handleRemoveMember}
                        removing={removingId}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick links — 1 col */}
          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Quick Links</h3>
            <div className="space-y-2">
              <QuickLink icon={FileText}    label="Chapters"        desc="Chapter submissions & reviews"  color="#c9a84c"  onClick={() => navigate('/chapters')} />
              <QuickLink icon={BookOpen}    label="Manuscript"      desc="Collaborative manuscript editor" color="#7c3aed"  onClick={() => navigate('/manuscript')} />
              <QuickLink icon={Calendar}    label="Defense"         desc="Defense schedules & ratings"    color="#3b82f6"  onClick={() => navigate('/defenses')} />
              <QuickLink icon={MessageSquare} label="Consultations" desc="Log & view consultations"       color="#16a34a"  onClick={() => navigate('/consultations')} />
              <QuickLink icon={TrendingUp}  label="Monitoring"      desc="Group health & progress"        color="#f59e0b"  onClick={() => navigate('/monitoring')} />
              {isAdmin && (
                <QuickLink icon={Cpu}       label="System Features" desc="Feature tracker"                color="#ec4899"  onClick={() => navigate(`/system-features`)} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Member modal ─────────────────────────────────────────────── */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Student to Group"
        size="md"
        footer={
          <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Close</button>
        }
      >
        {memberError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {memberError}
          </div>
        )}

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input pl-9"
            placeholder="Search by name, email, or student ID…"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)', maxHeight: 340, overflowY: 'auto' }}>
          {studentsLoading ? (
            <div className="px-5 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Loading students…</div>
          ) : availableStudents.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {memberSearch ? 'No students match your search.' : 'All active students are already in this group.'}
              </p>
            </div>
          ) : (
            availableStudents.map((s, idx) => {
              const initials = s.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'
              const isAdding = addingId === s.id
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-3 px-4 py-3 transition-colors duration-100"
                  style={{ borderBottom: idx < availableStudents.length - 1 ? '1px solid var(--border-light)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                    style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6' }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {s.fullName}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {s.studentId ? `ID: ${s.studentId} · ` : ''}{s.email}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddMember(s)}
                    disabled={isAdding}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all duration-150"
                    style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.22)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.12)'}
                  >
                    {isAdding ? <span className="animate-pulse">Adding…</span> : <><UserPlus size={12} /> Add</>}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Only active students not yet in this group are shown. A student can only be added to one active group at a time via the system workflow.
        </p>
      </Modal>

      {/* ── Edit Group modal ──────────────────────────────────────────────── */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Group"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            {editError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group Name *</label>
            <input
              type="text" className="form-input"
              placeholder="e.g. Group Alpha"
              value={editForm.groupName}
              onChange={e => setEditForm(f => ({ ...f, groupName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Adviser *</label>
            <select
              className="form-input"
              value={editForm.adviserId}
              onChange={e => setEditForm(f => ({ ...f, adviserId: e.target.value }))}
            >
              <option value="">Select an adviser</option>
              {advisers.map(a => (
                <option key={a.id} value={a.id}>{a.fullName}</option>
              ))}
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              A faculty member can advise multiple groups simultaneously.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Research Title</label>
            <input
              type="text" className="form-input"
              placeholder="Enter the project/research title…"
              value={editForm.projectTitle}
              onChange={e => setEditForm(f => ({ ...f, projectTitle: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── Confirm Remove Member modal ───────────────────────────────────── */}
      <Modal
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title="Remove Member"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmRemove(null)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{ background: 'rgba(220,38,38,0.12)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.25)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'}
              onClick={doRemoveMember}
            >
              Remove
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <UserMinus size={16} style={{ color: '#dc2626' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
              Remove {confirmRemove?.fullName}?
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              This student will be removed from the group. They can be added back at any time.
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Set Deadlines modal ──────────────────────────────────────────── */}
      <Modal
        open={showDeadlineModal}
        onClose={() => setShowDeadlineModal(false)}
        title="Set Deadlines"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowDeadlineModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleDeadlineSave} disabled={deadlineSaving}>
              {deadlineSaving ? 'Saving…' : 'Save Deadlines'}
            </button>
          </>
        }
      >
        {deadlineError && (
          <div className="mb-4 px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
            style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
            <AlertCircle size={13} /> {deadlineError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}>
              <FileText size={13} style={{ color: '#c9a84c' }} /> Manuscript Due Date
            </label>
            <input
              type="date"
              className="form-input"
              value={deadlineForm.manuscriptDueDate}
              onChange={e => setDeadlineForm(f => ({ ...f, manuscriptDueDate: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}>
              <Cpu size={13} style={{ color: '#ec4899' }} /> System Features Due Date
            </label>
            <input
              type="date"
              className="form-input"
              value={deadlineForm.systemFeaturesDueDate}
              onChange={e => setDeadlineForm(f => ({ ...f, systemFeaturesDueDate: e.target.value }))}
            />
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Leave a field blank to clear that deadline. Deadlines are visible to all group members.
          </p>
        </div>
      </Modal>

      {/* ── Confirm Archive modal ─────────────────────────────────────────── */}
      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="Archive Group"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setConfirmArchive(false)}>Cancel</button>
            <button
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
              style={{ background: 'rgba(107,114,128,0.12)', color: '#6b7280', border: '1px solid rgba(107,114,128,0.25)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,114,128,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(107,114,128,0.12)'}
              onClick={doArchive}
            >
              Archive
            </button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.2)' }}>
            <Archive size={16} style={{ color: '#6b7280' }} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
              Archive "{group?.groupName}"?
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
              This group will be marked as archived and removed from the active groups list. This action cannot be undone from the UI.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
