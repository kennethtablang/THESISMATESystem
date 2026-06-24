import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { groupService, authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { Users, Plus, Search, ChevronRight, BookOpen, FileText, Cpu, Pencil } from 'lucide-react'

export default function Groups() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ groupName: '', adviserId: '', academicYear: '' })
  const [advisers, setAdvisers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)
  const isStudent = user?.role === 'Student'

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionForm, setVersionForm] = useState({ manuscriptVersion: '', systemVersion: '' })
  const [versionSaving, setVersionSaving] = useState(false)
  const [versionError, setVersionError] = useState('')

  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ groupName: '', projectTitle: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    const fetch = isStudent
      ? groupService.myGroup().then(g => [g]).catch(() => [])
      : groupService.list().catch(() => [])
    fetch.then(setGroups).finally(() => setLoading(false))
  }, [isStudent])

  function openEditModal(group) {
    setEditTarget(group)
    setEditForm({ groupName: group.groupName ?? '', projectTitle: group.projectTitle ?? '' })
    setEditError('')
    setShowEditModal(true)
  }

  async function handleEditSave() {
    if (!editForm.groupName.trim()) {
      setEditError('Group name is required.')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await groupService.update(editTarget.id, {
        groupName: editForm.groupName.trim(),
        projectTitle: editForm.projectTitle.trim() || null,
      })
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      setShowEditModal(false)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

  function openVersionModal(group) {
    setVersionForm({
      manuscriptVersion: group.manuscriptVersion ?? '',
      systemVersion: group.systemVersion ?? '',
    })
    setVersionError('')
    setShowVersionModal(true)
  }

  async function handleVersionSave() {
    setVersionSaving(true)
    setVersionError('')
    try {
      const updated = await groupService.updateVersion({
        manuscriptVersion: versionForm.manuscriptVersion || null,
        systemVersion: versionForm.systemVersion || null,
      })
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      setShowVersionModal(false)
    } catch (err) {
      setVersionError(err.message)
    } finally {
      setVersionSaving(false)
    }
  }

  function openCreateModal() {
    setError('')
    setForm({ groupName: '', adviserId: '', academicYear: '' })
    setShowModal(true)
    if (advisers.length === 0) {
      authService.allUsers()
        .then(users => setAdvisers(users.filter(u => u.role === 'Adviser')))
        .catch(() => {})
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const g = await groupService.create({
        groupName: form.groupName,
        adviserId: form.adviserId,
        academicYear: form.academicYear,
        memberIds: [],
      })
      setGroups((prev) => [g, ...prev])
      setShowModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = groups.filter(
    (g) =>
      (g.groupName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (g.projectTitle ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <><TopBar title="Groups" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title={isAdmin ? 'Manage Groups' : user?.role === 'Adviser' ? 'My Advisees' : user?.role === 'Student' ? 'My Group' : 'Groups'}
        subtitle={`${groups.length} capstone group${groups.length !== 1 ? 's' : ''}`}
      />
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
            <input
              type="text"
              className="form-input pl-9"
              placeholder="Search groups..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={openCreateModal}>
              <Plus size={15} /> New Group
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No groups found"
            description={search ? 'Try a different search term.' : 'No capstone groups have been created yet.'}
            action={isAdmin && (
              <button className="btn-primary" onClick={openCreateModal}>
                <Plus size={15} /> Create Group
              </button>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                onClick={() => navigate(`/groups/${g.id}`)}
                onEditVersion={isStudent ? () => openVersionModal(g) : null}
                onEdit={isAdmin ? () => openEditModal(g) : null}
              />
            ))}
          </div>
        )}
      </div>

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
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {editError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Group Alpha, Group 1"
              value={editForm.groupName}
              onChange={e => setEditForm(f => ({ ...f, groupName: e.target.value }))}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Short identifier for the group.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Research Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the actual research/project title…"
              value={editForm.projectTitle}
              onChange={e => setEditForm(f => ({ ...f, projectTitle: e.target.value }))}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Displayed in place of the group name once set. Leave blank to use only the group name.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        title="Set Version Tags"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowVersionModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleVersionSave} disabled={versionSaving}>
              {versionSaving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        {versionError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {versionError}
          </div>
        )}
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
          Tag your group's current progress so your adviser and panel can track which version they're reviewing.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="flex items-center gap-1.5"><FileText size={13} /> Manuscript Version</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Draft 3, v1.2, Chapter 5 Final"
              value={versionForm.manuscriptVersion}
              onChange={e => setVersionForm(f => ({ ...f, manuscriptVersion: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="flex items-center gap-1.5"><Cpu size={13} /> System Version</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. v1.0.0, Beta 2, Alpha"
              value={versionForm.systemVersion}
              onChange={e => setVersionForm(f => ({ ...f, systemVersion: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Group"
        size="md"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creating...' : 'Create Group'}
            </button>
          </>
        }
      >
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Group Alpha"
              value={form.groupName}
              onChange={(e) => setForm(f => ({ ...f, groupName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Adviser *</label>
            {advisers.length > 0 ? (
              <select
                className="form-input"
                value={form.adviserId}
                onChange={e => setForm(f => ({ ...f, adviserId: e.target.value }))}
                required
              >
                <option value="">Select an adviser</option>
                {advisers.map(a => (
                  <option key={a.id} value={a.id}>{a.fullName}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="form-input"
                placeholder="Adviser ID"
                value={form.adviserId}
                onChange={(e) => setForm(f => ({ ...f, adviserId: e.target.value }))}
                required
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Academic Year *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 2024-2025"
              value={form.academicYear}
              onChange={(e) => setForm(f => ({ ...f, academicYear: e.target.value }))}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function GroupCard({ group, onClick, onEditVersion, onEdit }) {
  const progress = group.milestoneProgress?.completionPercentage ?? 0
  const displayName = group.projectTitle || group.groupName

  return (
    <div
      className="rounded-2xl p-5 cursor-pointer group transition-all duration-200"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1), 0 12px 32px rgba(0,0,0,0.06)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-semibold text-lg"
          style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}
        >
          {(group.groupName ?? 'G')[0]}
        </div>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-main)' }}
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              title="Edit group name / research title"
              onMouseEnter={(e) => { e.currentTarget.style.color = '#c9a84c'; e.currentTarget.style.borderColor = 'rgba(201,168,76,0.35)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-main)' }}
            >
              <Pencil size={12} />
            </button>
          )}
          <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Primary: research title if set, else group name */}
      <h3 className="font-semibold mb-0.5 line-clamp-2" style={{ color: 'var(--text-heading)', lineHeight: '1.4' }}>
        {displayName ?? 'Unnamed Group'}
      </h3>

      {/* Secondary: show group name tag when research title overrides it */}
      {group.projectTitle ? (
        <p className="text-xs mb-3 font-medium" style={{ color: 'var(--text-muted)' }}>
          {group.groupName}
        </p>
      ) : (
        <p className="text-xs mb-3 italic" style={{ color: 'var(--text-muted)' }}>
          No research title set
        </p>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Users size={13} />
          <span>{group.members?.length ?? 0} members</span>
        </div>
        {group.academicYear && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <BookOpen size={13} />
            <span>{group.academicYear}</span>
          </div>
        )}
      </div>

      {(group.manuscriptVersion || group.systemVersion || onEditVersion) && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(group.manuscriptVersion || onEditVersion) && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: group.manuscriptVersion ? 'rgba(201,168,76,0.12)' : 'var(--bg-subtle)',
                  color: group.manuscriptVersion ? '#a0832a' : 'var(--text-muted)',
                  border: `1px solid ${group.manuscriptVersion ? 'rgba(201,168,76,0.2)' : 'var(--border-main)'}`,
                }}
              >
                <FileText size={10} />
                MS {group.manuscriptVersion ?? '—'}
              </span>
            )}
            {(group.systemVersion || onEditVersion) && (
              <span
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: group.systemVersion ? 'rgba(99,102,241,0.08)' : 'var(--bg-subtle)',
                  color: group.systemVersion ? '#4f46e5' : 'var(--text-muted)',
                  border: `1px solid ${group.systemVersion ? 'rgba(99,102,241,0.18)' : 'var(--border-main)'}`,
                }}
              >
                <Cpu size={10} />
                SYS {group.systemVersion ?? '—'}
              </span>
            )}
            {onEditVersion && (
              <button
                className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium transition-opacity hover:opacity-70"
                style={{ color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)' }}
                onClick={(e) => { e.stopPropagation(); onEditVersion() }}
              >
                <Pencil size={10} /> Update
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Progress</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progress >= 70 ? '#16a34a' : progress >= 40 ? '#c9a84c' : '#e2cc91',
            }}
          />
        </div>
      </div>
    </div>
  )
}
