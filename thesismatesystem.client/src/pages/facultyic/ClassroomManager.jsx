import { useState, useEffect } from 'react'
import { Plus, Copy, Check, Users, Megaphone, RefreshCw, Send, ChevronDown, ChevronUp } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { classroomService, groupService, authService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="btn-ghost px-2 py-1 flex items-center gap-1 text-xs" title="Copy join code">
      {copied ? <Check size={13} style={{ color: '#16a34a' }} /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function ClassroomManager() {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [selected, setSelected] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [groups, setGroups] = useState([])          // all existing groups (for assign tab)
  const [classroomGroups, setClassroomGroups] = useState([])  // groups created in this classroom
  const [facultyList, setFacultyList] = useState([])
  const [tab, setTab] = useState('students')
  const [loading, setLoading] = useState(true)

  // Create classroom form
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ className: '', academicYear: '' })
  const [creating, setCreating] = useState(false)

  // Announcement form
  const [annForm, setAnnForm] = useState({ title: '', content: '', targetGroupId: '' })
  const [posting, setPosting] = useState(false)

  // Assign existing group form
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignGroupId, setAssignGroupId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Create new group inside classroom
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupForm, setGroupForm] = useState({ groupName: '', adviserId: '', memberIds: [] })
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [groupError, setGroupError] = useState('')

  useEffect(() => {
    classroomService.myClassrooms().then(data => {
      const list = Array.isArray(data) ? data : []
      setClassrooms(list)
      if (list.length > 0) loadClassroom(list[0])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function loadClassroom(room) {
    setSelected(room)
    setEnrollments([])
    setAnnouncements([])
    setGroups([])
    setClassroomGroups([])
    try {
      const [enr, ann, grps] = await Promise.all([
        classroomService.enrollments(room.id),
        classroomService.announcements(room.id),
        groupService.list(),
      ])
      const enrList = Array.isArray(enr) ? enr : []
      const grpList = Array.isArray(grps) ? grps : []
      setEnrollments(enrList)
      setAnnouncements(Array.isArray(ann) ? ann : [])
      setGroups(grpList)

      // Derive which groups were created within this classroom:
      // groups whose members are all (or mostly) from this classroom's enrollment
      const enrolledIds = new Set(enrList.map(e => e.student?.id).filter(Boolean))
      const classroomGrps = grpList.filter(g =>
        g.members?.length > 0 && g.members.every(m => enrolledIds.has(m.userId ?? m.id))
      )
      setClassroomGroups(classroomGrps)
    } catch {}
  }

  // Load faculty list lazily when the groups tab is opened
  async function ensureFacultyLoaded() {
    if (facultyList.length > 0) return
    try {
      const users = await authService.allUsers()
      setFacultyList((Array.isArray(users) ? users : []).filter(u => u.role === 'Faculty'))
    } catch {}
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const room = await classroomService.create(createForm)
      const updated = [...classrooms, room]
      setClassrooms(updated)
      setCreateForm({ className: '', academicYear: '' })
      setShowCreate(false)
      loadClassroom(room)
    } catch (err) {
      alert(err.message || 'Failed to create classroom')
    } finally {
      setCreating(false)
    }
  }

  async function handlePostAnnouncement(e) {
    e.preventDefault()
    setPosting(true)
    try {
      const ann = await classroomService.postAnnouncement(selected.id, {
        title: annForm.title,
        content: annForm.content,
        targetGroupId: annForm.targetGroupId ? parseInt(annForm.targetGroupId) : null,
      })
      setAnnouncements(prev => [ann, ...prev])
      setAnnForm({ title: '', content: '', targetGroupId: '' })
    } catch (err) {
      alert(err.message || 'Failed to post announcement')
    } finally {
      setPosting(false)
    }
  }

  async function handleAssignExisting(e) {
    e.preventDefault()
    if (!assignStudentId || !assignGroupId) return
    setAssigning(true)
    try {
      await classroomService.assignGroup({
        groupId: parseInt(assignGroupId),
        studentIds: [assignStudentId],
      })
      const targetGroup = groups.find(g => g.id === parseInt(assignGroupId))
      setEnrollments(prev => prev.map(enr =>
        enr.student.id === assignStudentId
          ? { ...enr, groupId: parseInt(assignGroupId), groupName: targetGroup?.groupName }
          : enr
      ))
      setAssignStudentId('')
      setAssignGroupId('')
    } catch (err) {
      alert(err.message || 'Failed to assign student')
    } finally {
      setAssigning(false)
    }
  }

  async function handleCreateGroup(e) {
    e.preventDefault()
    if (!groupForm.groupName.trim()) {
      setGroupError('Group name is required.')
      return
    }
    setCreatingGroup(true)
    setGroupError('')
    try {
      const created = await classroomService.createGroup(selected.id, {
        groupName: groupForm.groupName.trim(),
        adviserId: groupForm.adviserId || null,
        memberIds: groupForm.memberIds,
      })

      // Update local state
      setGroups(prev => [...prev, created])
      setClassroomGroups(prev => [...prev, created])

      // Update enrollment records to reflect new group membership
      const newGroupId = created.id
      const newGroupName = created.groupName
      setEnrollments(prev => prev.map(enr =>
        groupForm.memberIds.includes(enr.student?.id)
          ? { ...enr, groupId: newGroupId, groupName: newGroupName }
          : enr
      ))

      setGroupForm({ groupName: '', adviserId: '', memberIds: [] })
      setShowCreateGroup(false)
    } catch (err) {
      setGroupError(err.message || 'Failed to create group.')
    } finally {
      setCreatingGroup(false)
    }
  }

  function toggleMember(studentId) {
    setGroupForm(f => ({
      ...f,
      memberIds: f.memberIds.includes(studentId)
        ? f.memberIds.filter(id => id !== studentId)
        : [...f.memberIds, studentId],
    }))
  }

  async function handleRegenerateCode() {
    if (!confirm('Regenerate join code? The old code will stop working.')) return
    try {
      await classroomService.regenerateCode(selected.id)
      const list = await classroomService.myClassrooms()
      const updated = Array.isArray(list) ? list : []
      setClassrooms(updated)
      const refreshed = updated.find(c => c.id === selected.id)
      if (refreshed) setSelected(refreshed)
    } catch (err) {
      alert(err.message || 'Failed to regenerate code')
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div>
      </div>
    )
  }

  return (
    <>
      <TopBar title="Classroom Manager" subtitle="Manage your class, groups, and announcements" />
      <div className="p-4 sm:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="page-title">Classroom Manager</h2>
            <p className="page-subtitle">Manage your class, create groups, and post announcements</p>
          </div>
          <button className="btn-primary flex items-center gap-2" onClick={() => setShowCreate(s => !s)}>
            <Plus size={16} />
            New Class
          </button>
        </div>

        {showCreate && (
          <div className="card mb-6">
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Create Classroom</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Class Name *</label>
                  <input className="form-input" placeholder="e.g. BSIT 4A Capstone" value={createForm.className}
                    onChange={e => setCreateForm(f => ({...f, className: e.target.value}))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Academic Year *</label>
                  <input className="form-input" placeholder="e.g. 2024-2025" value={createForm.academicYear}
                    onChange={e => setCreateForm(f => ({...f, academicYear: e.target.value}))} required />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Create Classroom'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {classrooms.length === 0 ? (
          <div className="card text-center py-16">
            <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-heading)' }}>No classrooms yet</p>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Create your first classroom to get started</p>
            <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={15} /> Create Classroom</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left: classroom list */}
            <div className="space-y-2">
              {classrooms.map(room => (
                <button key={room.id} onClick={() => loadClassroom(room)}
                  className="w-full text-left px-4 py-3 rounded-xl transition-all"
                  style={{
                    background: selected?.id === room.id ? 'rgba(201,168,76,0.12)' : 'var(--bg-card)',
                    border: `1.5px solid ${selected?.id === room.id ? 'rgba(201,168,76,0.4)' : 'var(--border-main)'}`,
                  }}>
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-heading)' }}>{room.className}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{room.academicYear}</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{room.enrollmentCount} students</p>
                </button>
              ))}
            </div>

            {selected && (
              <div className="lg:col-span-3 space-y-5">
                {/* Join code card */}
                <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,#0a1628,#12213a)', border: '1px solid rgba(201,168,76,0.2)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Class Join Code</p>
                      <p className="font-display text-4xl font-bold tracking-widest" style={{ color: '#c9a84c', letterSpacing: '0.2em' }}>
                        {selected.joinCode}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Share this code with your students to join the class</p>
                    </div>
                    <div className="flex flex-col gap-2 mt-1">
                      <CopyButton text={selected.joinCode} />
                      <button onClick={handleRegenerateCode} className="btn-ghost px-2 py-1 flex items-center gap-1 text-xs">
                        <RefreshCw size={12} /> Regenerate
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    <div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Class</p>
                      <p className="text-sm font-medium text-white">{selected.className}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Academic Year</p>
                      <p className="text-sm font-medium text-white">{selected.academicYear}</p>
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Students</p>
                      <p className="text-sm font-medium text-white">{enrollments.length}</p>
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
                  {[
                    { key: 'students',      label: 'Students',   icon: Users },
                    { key: 'groups',        label: 'Groups',     icon: Users },
                    { key: 'announcements', label: 'Announcements', icon: Megaphone },
                  ].map(t => (
                    <button key={t.key}
                      onClick={() => { setTab(t.key); if (t.key === 'groups') ensureFacultyLoaded() }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                      style={{
                        background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                        color: tab === t.key ? 'var(--text-heading)' : 'var(--text-secondary)',
                        boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                      }}>
                      <t.icon size={15} />
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── Students tab ── */}
                {tab === 'students' && (
                  <div className="card">
                    <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
                      Enrolled Students ({enrollments.length})
                    </h3>
                    {enrollments.length === 0 ? (
                      <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                        No students have joined yet. Share the join code above.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="data-table w-full">
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Joined</th>
                              <th>Group</th>
                            </tr>
                          </thead>
                          <tbody>
                            {enrollments.map(enr => (
                              <tr key={enr.id}>
                                <td>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                      style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
                                      {enr.student?.fullName?.[0] ?? '?'}
                                    </div>
                                    <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>{enr.student?.fullName}</span>
                                  </div>
                                </td>
                                <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                  {new Date(enr.joinedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </td>
                                <td>
                                  {enr.groupName
                                    ? <span className="text-sm font-medium" style={{ color: '#c9a84c' }}>{enr.groupName}</span>
                                    : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}>Unassigned</span>
                                  }
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Groups tab ── */}
                {tab === 'groups' && (
                  <div className="space-y-4">

                    {/* Create new group */}
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-main)', background: 'var(--bg-card)' }}>
                      <button
                        className="w-full flex items-center justify-between px-5 py-4"
                        onClick={() => { setShowCreateGroup(s => !s); setGroupError('') }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(201,168,76,0.12)' }}>
                            <Plus size={16} style={{ color: '#c9a84c' }} />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>Create New Group</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Name a group and pick students from this class</p>
                          </div>
                        </div>
                        {showCreateGroup
                          ? <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />
                          : <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} />
                        }
                      </button>

                      {showCreateGroup && (
                        <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid var(--border-light)' }}>
                          {groupError && (
                            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                              {groupError}
                            </div>
                          )}
                          <form onSubmit={handleCreateGroup} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Group Name *</label>
                                <input
                                  className="form-input"
                                  placeholder="e.g. Group Alpha"
                                  value={groupForm.groupName}
                                  onChange={e => setGroupForm(f => ({ ...f, groupName: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Adviser</label>
                                <select
                                  className="form-input"
                                  value={groupForm.adviserId}
                                  onChange={e => setGroupForm(f => ({ ...f, adviserId: e.target.value }))}
                                >
                                  <option value="">— Me ({user?.fullName}) —</option>
                                  {facultyList
                                    .filter(f => f.id !== user?.id)
                                    .map(f => (
                                      <option key={f.id} value={f.id}>{f.fullName}</option>
                                    ))
                                  }
                                </select>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                  Leave blank to assign yourself as adviser. Academic year is inherited from this classroom ({selected.academicYear}).
                                </p>
                              </div>
                            </div>

                            {/* Student picker */}
                            <div>
                              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                Select Members
                                {groupForm.memberIds.length > 0 && (
                                  <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                                    {groupForm.memberIds.length} selected
                                  </span>
                                )}
                              </label>

                              {enrollments.length === 0 ? (
                                <p className="text-sm py-3" style={{ color: 'var(--text-muted)' }}>No students enrolled yet.</p>
                              ) : (
                                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-main)' }}>
                                  {enrollments.map((enr, idx) => {
                                    const sid = enr.student?.id
                                    const checked = groupForm.memberIds.includes(sid)
                                    const alreadyInGroup = !!enr.groupName
                                    return (
                                      <label
                                        key={enr.id}
                                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${alreadyInGroup ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        style={{
                                          background: checked ? 'rgba(201,168,76,0.06)' : 'transparent',
                                          borderTop: idx > 0 ? '1px solid var(--border-light)' : 'none',
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={alreadyInGroup}
                                          onChange={() => !alreadyInGroup && toggleMember(sid)}
                                          className="w-4 h-4 rounded"
                                          style={{ accentColor: '#c9a84c' }}
                                        />
                                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                          style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
                                          {enr.student?.fullName?.[0] ?? '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-heading)' }}>
                                            {enr.student?.fullName}
                                          </p>
                                          {alreadyInGroup && (
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Already in {enr.groupName}</p>
                                          )}
                                        </div>
                                      </label>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-3 pt-1">
                              <button
                                type="submit"
                                className="btn-primary"
                                disabled={creatingGroup || !groupForm.groupName.trim()}
                              >
                                {creatingGroup ? 'Creating...' : 'Create Group'}
                              </button>
                              <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => { setShowCreateGroup(false); setGroupError(''); setGroupForm({ groupName: '', adviserId: '', memberIds: [] }) }}
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Groups created in this classroom */}
                    {classroomGroups.length > 0 && (
                      <div className="card">
                        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>
                          Groups in This Class ({classroomGroups.length})
                        </h3>
                        <div className="space-y-3">
                          {classroomGroups.map(g => (
                            <div key={g.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-base shrink-0"
                                style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                                {(g.groupName ?? 'G')[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{g.groupName}</p>
                                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                                  Adviser: {g.adviser?.fullName ?? '—'} · {g.members?.length ?? 0} member{(g.members?.length ?? 0) !== 1 ? 's' : ''}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(g.members ?? []).map(m => (
                                    <span key={m.userId ?? m.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                                      style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-main)' }}>
                                      {m.fullName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Assign student to an existing group */}
                    <div className="card">
                      <h3 className="font-semibold mb-1" style={{ color: 'var(--text-heading)' }}>Assign to Existing Group</h3>
                      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Move a student into a group that was created outside this classroom.</p>
                      {enrollments.length === 0 ? (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No students enrolled yet.</p>
                      ) : (
                        <form onSubmit={handleAssignExisting} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Student</label>
                              <select className="form-input" value={assignStudentId} onChange={e => setAssignStudentId(e.target.value)} required>
                                <option value="">Select student...</option>
                                {enrollments.map(enr => (
                                  <option key={enr.student?.id} value={enr.student?.id}>{enr.student?.fullName}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Group</label>
                              <select className="form-input" value={assignGroupId} onChange={e => setAssignGroupId(e.target.value)} required>
                                <option value="">Select group...</option>
                                {groups.map(g => (
                                  <option key={g.id} value={g.id}>{g.groupName}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="btn-primary" disabled={assigning}>{assigning ? 'Assigning...' : 'Assign'}</button>
                        </form>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Announcements tab ── */}
                {tab === 'announcements' && (
                  <div className="space-y-4">
                    <div className="card">
                      <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Post Announcement</h3>
                      <form onSubmit={handlePostAnnouncement} className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title *</label>
                          <input className="form-input" placeholder="Announcement title" value={annForm.title}
                            onChange={e => setAnnForm(f => ({...f, title: e.target.value}))} required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Message *</label>
                          <textarea className="form-input" rows={3} placeholder="Write your announcement..." value={annForm.content}
                            onChange={e => setAnnForm(f => ({...f, content: e.target.value}))} required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Target (optional)</label>
                          <select className="form-input" value={annForm.targetGroupId} onChange={e => setAnnForm(f => ({...f, targetGroupId: e.target.value}))}>
                            <option value="">Whole class</option>
                            {groups.map(g => (
                              <option key={g.id} value={g.id}>{g.groupName}</option>
                            ))}
                          </select>
                          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Leave blank to post to the entire class</p>
                        </div>
                        <button type="submit" className="btn-primary flex items-center gap-2" disabled={posting}>
                          <Send size={14} />
                          {posting ? 'Posting...' : 'Post Announcement'}
                        </button>
                      </form>
                    </div>

                    <div className="space-y-3">
                      {announcements.length === 0 ? (
                        <div className="card text-center py-10" style={{ color: 'var(--text-muted)' }}>
                          <Megaphone size={32} className="mx-auto mb-2" />
                          <p className="text-sm">No announcements yet</p>
                        </div>
                      ) : (
                        announcements.map(ann => (
                          <div key={ann.id} className="card">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{ann.title}</h4>
                                  {ann.targetGroupId ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                                      {ann.targetGroupName}
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                                      Whole class
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{ann.content}</p>
                                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                  {ann.postedBy?.fullName} · {new Date(ann.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
