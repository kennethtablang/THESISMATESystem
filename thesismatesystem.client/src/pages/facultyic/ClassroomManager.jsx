import { useState, useEffect } from 'react'
import { Plus, Copy, Check, Users, Megaphone, RefreshCw, Send, UserX } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { classroomService, groupService } from '../../services/api'

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
  const [classrooms, setClassrooms] = useState([])
  const [selected, setSelected] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [groups, setGroups] = useState([])
  const [tab, setTab] = useState('students')
  const [loading, setLoading] = useState(true)

  // Create classroom form
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ className: '', academicYear: '' })
  const [creating, setCreating] = useState(false)

  // Announcement form
  const [annForm, setAnnForm] = useState({ title: '', content: '', targetGroupId: '' })
  const [posting, setPosting] = useState(false)

  // Assign group form
  const [assignStudentId, setAssignStudentId] = useState('')
  const [assignGroupId, setAssignGroupId] = useState('')
  const [assigning, setAssigning] = useState(false)

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
    try {
      const [enr, ann, grps] = await Promise.all([
        classroomService.enrollments(room.id),
        classroomService.announcements(room.id),
        groupService.list(),
      ])
      setEnrollments(Array.isArray(enr) ? enr : [])
      setAnnouncements(Array.isArray(ann) ? ann : [])
      setGroups(Array.isArray(grps) ? grps : [])
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

  async function handleAssign(e) {
    e.preventDefault()
    if (!assignStudentId || !assignGroupId) return
    setAssigning(true)
    try {
      await classroomService.assignGroup({
        groupId: parseInt(assignGroupId),
        studentIds: [assignStudentId],
      })
      setEnrollments(prev => prev.map(enr =>
        enr.student.id === assignStudentId
          ? { ...enr, groupId: parseInt(assignGroupId), groupName: groups.find(g => g.id === parseInt(assignGroupId))?.groupName }
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

  async function handleRegenerateCode() {
    if (!confirm('Regenerate join code? The old code will stop working.')) return
    try {
      await classroomService.regenerateCode(selected.id)
      // Reload classrooms to get the new code
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
            <p className="page-subtitle">Google Classroom-style class management</p>
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
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No classrooms yet</p>
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

            {/* Right: selected classroom content */}
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
                    { key: 'students', label: 'Students', icon: Users },
                    { key: 'groups', label: 'Assign Groups', icon: Users },
                    { key: 'announcements', label: 'Announcements', icon: Megaphone },
                  ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
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

                {/* Students tab */}
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
                              <th>Assigned Group</th>
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
                                    : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(107,114,128,0.1)', color: '#6b7280' }}>Unassigned</span>
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

                {/* Assign groups tab */}
                {tab === 'groups' && (
                  <div className="card">
                    <h3 className="font-semibold mb-4" style={{ color: 'var(--text-heading)' }}>Assign Students to Groups</h3>
                    {enrollments.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No students enrolled yet.</p>
                    ) : (
                      <form onSubmit={handleAssign} className="space-y-4">
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
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Assign to Group</label>
                            <select className="form-input" value={assignGroupId} onChange={e => setAssignGroupId(e.target.value)} required>
                              <option value="">Select group...</option>
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.groupName}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button type="submit" className="btn-primary" disabled={assigning}>{assigning ? 'Assigning...' : 'Assign Student'}</button>
                      </form>
                    )}

                    {enrollments.length > 0 && (
                      <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border-main)' }}>
                        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-heading)' }}>Current Assignments</h4>
                        <div className="space-y-2">
                          {enrollments.filter(e => e.groupName).length === 0 ? (
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No assignments yet.</p>
                          ) : (
                            enrollments.filter(e => e.groupName).map(enr => (
                              <div key={enr.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-subtle)' }}>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{enr.student?.fullName}</span>
                                <span className="text-sm" style={{ color: '#c9a84c' }}>{enr.groupName}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Announcements tab */}
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
