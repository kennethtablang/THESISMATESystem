import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useMatch } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { groupService, authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import { PageLoader } from '../../components/ui/Spinner'
import { Users, Plus, Search, FileText, Cpu, Pencil, Image } from 'lucide-react'
import { toast } from '../../utils/toast'

export default function GroupsLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const match = useMatch('/groups/:id')
  const selectedId = match ? parseInt(match.params.id) : null

  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ groupName: '', adviserId: '', academicYear: '' })
  const [advisers, setAdvisers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [showVersionModal, setShowVersionModal] = useState(false)
  const [versionForm, setVersionForm] = useState({ manuscriptVersion: '', systemVersion: '' })
  const [versionSaving, setVersionSaving] = useState(false)
  const [versionError, setVersionError] = useState('')

  const [showEditModal, setShowEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ groupName: '', projectTitle: '', adviserId: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)
  const isStudent = user?.role === 'Student'

  useEffect(() => {
    const fetch = isStudent
      ? groupService.myGroup().then(g => [g]).catch(() => [])
      : groupService.list().catch(() => [])
    fetch.then(setGroups).finally(() => setLoading(false))
  }, [isStudent])

  function openEditModal(group) {
    setEditTarget(group)
    setEditForm({ groupName: group.groupName ?? '', projectTitle: group.projectTitle ?? '', adviserId: group.adviser?.id ?? '' })
    setEditError('')
    setShowEditModal(true)
    if (advisers.length === 0)
      authService.allUsers().then(us => setAdvisers(us.filter(u => u.role === 'Faculty'))).catch(() => {})
  }

  async function handleEditSave() {
    if (!editForm.groupName.trim()) { setEditError('Group name is required.'); return }
    if (!editForm.adviserId)        { setEditError('Please select an adviser.'); return }
    setEditSaving(true); setEditError('')
    try {
      const updated = await groupService.update(editTarget.id, {
        groupName: editForm.groupName.trim(), projectTitle: editForm.projectTitle.trim() || null, adviserId: editForm.adviserId,
      })
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      setShowEditModal(false)
      toast.success('Group updated.')
    } catch (err) { setEditError(err.message); toast.error(err.message || 'Failed to update group.') }
    finally { setEditSaving(false) }
  }

  function openVersionModal(group) {
    setVersionForm({ manuscriptVersion: group.manuscriptVersion ?? '', systemVersion: group.systemVersion ?? '' })
    setVersionError(''); setShowVersionModal(true)
  }

  async function handleVersionSave() {
    setVersionSaving(true); setVersionError('')
    try {
      const updated = await groupService.updateVersion({
        manuscriptVersion: versionForm.manuscriptVersion || null, systemVersion: versionForm.systemVersion || null,
      })
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      setShowVersionModal(false); toast.success('Version tags updated.')
    } catch (err) { setVersionError(err.message); toast.error(err.message || 'Failed to update.') }
    finally { setVersionSaving(false) }
  }

  async function handleLogoUpload(groupId, file) {
    if (!file) return
    setLogoUploading(true)
    try {
      const updated = await groupService.uploadLogo(groupId, file)
      setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
      toast.success('Logo uploaded.')
    } catch (err) { toast.error(err.message || 'Failed to upload logo.') }
    finally { setLogoUploading(false) }
  }

  function openCreateModal() {
    setError(''); setForm({ groupName: '', adviserId: '', academicYear: '' }); setShowModal(true)
    if (advisers.length === 0)
      authService.allUsers().then(us => setAdvisers(us.filter(u => u.role === 'Faculty'))).catch(() => {})
  }

  async function handleCreate(e) {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const g = await groupService.create({ groupName: form.groupName, adviserId: form.adviserId, academicYear: form.academicYear, memberIds: [] })
      setGroups(prev => [g, ...prev]); setShowModal(false); toast.success('Group created.')
    } catch (err) { setError(err.message); toast.error(err.message || 'Failed to create group.') }
    finally { setSaving(false) }
  }

  const filtered = groups.filter(g =>
    (g.groupName ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (g.projectTitle ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const title = isAdmin ? 'Manage Groups' : user?.role === 'Faculty' ? 'My Groups' : 'My Group'

  if (loading) return <><TopBar title={title} /><PageLoader /></>

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <TopBar
        title={title}
        subtitle={`${groups.length} capstone group${groups.length !== 1 ? 's' : ''}`}
      />

      {/* Split pane — fills remaining viewport height */}
      <div style={{ display: 'flex', height: 'calc(100vh - 68px)', overflow: 'hidden' }}>

        {/* ── Left panel: Group list ──────────────────────────────────────── */}
        <div
          className={selectedId ? 'hidden md:flex md:flex-col' : 'flex flex-col w-full md:w-auto'}
          style={{
            width: 300, minWidth: 300, flexShrink: 0,
            borderRight: '1px solid var(--border-light)',
            overflowY: 'auto',
            background: 'var(--bg-card)',
          }}
        >
          {/* Search + New Group — sticky header */}
          <div className="p-3 space-y-2 sticky top-0 z-10"
            style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#9ca3af' }} />
              <input
                type="text"
                className="form-input pl-8"
                style={{ fontSize: 13, padding: '7px 10px 7px 30px' }}
                placeholder="Search groups..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button className="btn-primary w-full" style={{ fontSize: 13, padding: '7px 12px' }} onClick={openCreateModal}>
                <Plus size={13} /> New Group
              </button>
            )}
          </div>

          {/* Group list items */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'No groups match your search.' : isAdmin ? 'No groups yet. Create one above.' : 'No groups found.'}
                </p>
              </div>
            ) : filtered.map(g => (
              <GroupListItem
                key={g.id}
                group={g}
                selected={selectedId === g.id}
                onClick={() => navigate(`/groups/${g.id}`)}
                onEdit={isAdmin ? () => openEditModal(g) : null}
                onEditVersion={isStudent ? () => openVersionModal(g) : null}
                onUploadLogo={(isAdmin || isStudent) ? file => handleLogoUpload(g.id, file) : null}
                logoUploading={logoUploading}
              />
            ))}
          </div>
        </div>

        {/* ── Right panel: Group detail or empty state ──────────────────── */}
        <div
          className={selectedId ? 'flex flex-col flex-1 min-w-0' : 'hidden md:flex md:flex-col md:flex-1 md:min-w-0'}
          style={{ overflowY: 'auto', background: 'var(--bg-page)' }}
        >
          {selectedId ? (
            <Outlet context={{ groups, setGroups }} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)' }}
              >
                <Users size={28} style={{ color: '#c9a84c', opacity: 0.7 }} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Select a group
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Choose a group from the list to view its details.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Edit Group modal ─────────────────────────────────────────────────── */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Group" size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleEditSave} disabled={editSaving}>
            {editSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </>}
      >
        {editError && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {editError}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group Name *</label>
            <input type="text" className="form-input" placeholder="e.g. Group Alpha, Group 1"
              value={editForm.groupName} onChange={e => setEditForm(f => ({ ...f, groupName: e.target.value }))} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Short identifier for the group.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Adviser *</label>
            <select className="form-input" value={editForm.adviserId}
              onChange={e => setEditForm(f => ({ ...f, adviserId: e.target.value }))}>
              <option value="">Select an adviser</option>
              {advisers.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
            </select>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>A faculty member can advise multiple groups.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Research Title</label>
            <input type="text" className="form-input" placeholder="Enter the actual research/project title…"
              value={editForm.projectTitle} onChange={e => setEditForm(f => ({ ...f, projectTitle: e.target.value }))} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Displayed in place of the group name once set. Leave blank to use only the group name.
            </p>
          </div>
        </div>
      </Modal>

      {/* ── Version Tags modal ───────────────────────────────────────────────── */}
      <Modal open={showVersionModal} onClose={() => setShowVersionModal(false)} title="Set Version Tags" size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setShowVersionModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleVersionSave} disabled={versionSaving}>
            {versionSaving ? 'Saving…' : 'Save'}
          </button>
        </>}
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
            <input type="text" className="form-input" placeholder="e.g. Draft 3, v1.2, Chapter 5 Final"
              value={versionForm.manuscriptVersion}
              onChange={e => setVersionForm(f => ({ ...f, manuscriptVersion: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="flex items-center gap-1.5"><Cpu size={13} /> System Version</span>
            </label>
            <input type="text" className="form-input" placeholder="e.g. v1.0.0, Beta 2, Alpha"
              value={versionForm.systemVersion}
              onChange={e => setVersionForm(f => ({ ...f, systemVersion: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* ── Create Group modal ───────────────────────────────────────────────── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Group" size="md"
        footer={<>
          <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Group'}
          </button>
        </>}
      >
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group Name *</label>
            <input type="text" className="form-input" placeholder="e.g. Group Alpha"
              value={form.groupName} onChange={e => setForm(f => ({ ...f, groupName: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Adviser *</label>
            {advisers.length > 0 ? (
              <select className="form-input" value={form.adviserId}
                onChange={e => setForm(f => ({ ...f, adviserId: e.target.value }))} required>
                <option value="">Select an adviser</option>
                {advisers.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}
              </select>
            ) : (
              <input type="text" className="form-input" placeholder="Adviser ID"
                value={form.adviserId} onChange={e => setForm(f => ({ ...f, adviserId: e.target.value }))} required />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Academic Year *</label>
            <input type="text" className="form-input" placeholder="e.g. 2024-2025"
              value={form.academicYear} onChange={e => setForm(f => ({ ...f, academicYear: e.target.value }))} required />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Left panel list item ──────────────────────────────────────────────────────
function GroupListItem({ group, selected, onClick, onEdit, onEditVersion, onUploadLogo, logoUploading }) {
  const fileRef = useRef(null)
  const [logoError, setLogoError] = useState(false)
  const progress = group.milestoneProgress?.completionPercentage ?? 0
  const displayName = group.projectTitle || group.groupName
  const progressColor = progress >= 70 ? '#16a34a' : progress >= 40 ? '#c9a84c' : '#e2cc91'

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors duration-100"
      style={{
        background: selected ? 'rgba(201,168,76,0.08)' : 'transparent',
        borderLeft: `3px solid ${selected ? '#c9a84c' : 'transparent'}`,
        borderBottom: '1px solid var(--border-light)',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg-subtle)' }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Logo / avatar */}
      <div className="relative shrink-0 mt-0.5" onClick={e => e.stopPropagation()}>
        {group.systemLogoUrl && !logoError ? (
          <img
            src={group.systemLogoUrl}
            alt={group.groupName}
            onError={() => setLogoError(true)}
            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border-light)' }}
          />
        ) : (
          <div
            className="flex items-center justify-center font-bold text-sm"
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}
          >
            {(group.groupName ?? 'G')[0]}
          </div>
        )}
        {onUploadLogo && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) onUploadLogo(f); e.target.value = '' }} />
            <button
              title="Upload logo"
              disabled={logoUploading}
              onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: '#c9a84c', color: '#0a1628', border: '1.5px solid var(--bg-card)' }}
            >
              <Image size={7} />
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1">
          <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--text-heading)' }}>
            {displayName}
          </p>
          {onEdit && (
            <button
              onClick={e => { e.stopPropagation(); onEdit() }}
              className="w-5 h-5 shrink-0 flex items-center justify-center rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#c9a84c'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              title="Edit group"
            >
              <Pencil size={11} />
            </button>
          )}
        </div>

        {group.projectTitle ? (
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{group.groupName}</p>
        ) : (
          <p className="text-xs italic" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>No research title</p>
        )}

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {group.members?.length ?? 0} members
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-md font-medium"
            style={{
              background: group.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
              color: group.status === 'Active' ? '#16a34a' : '#6b7280',
            }}
          >
            {group.status}
          </span>
          {group.academicYear && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{group.academicYear}</span>
          )}
          {onEditVersion && (
            <button
              onClick={e => { e.stopPropagation(); onEditVersion() }}
              className="ml-auto text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
              style={{ color: '#c9a84c', border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.06)' }}
            >
              v
            </button>
          )}
        </div>

        {/* Mini progress bar */}
        <div className="mt-1.5 h-1 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
          <div className="h-1 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: progressColor }} />
        </div>
      </div>
    </div>
  )
}
