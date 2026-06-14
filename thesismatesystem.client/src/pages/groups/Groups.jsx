import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { groupService, authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { Users, Plus, Search, ChevronRight, BookOpen } from 'lucide-react'

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

  useEffect(() => {
    groupService.list()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

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
              <GroupCard key={g.id} group={g} onClick={() => navigate(`/groups/${g.id}`)} />
            ))}
          </div>
        )}
      </div>

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

function GroupCard({ group, onClick }) {
  const progress = group.milestoneProgress?.completionPercentage ?? 0

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
        <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" style={{ color: 'var(--text-muted)' }} />
      </div>

      <h3 className="font-semibold mb-0.5" style={{ color: 'var(--text-heading)' }}>{group.groupName ?? 'Unnamed Group'}</h3>
      <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
        {group.projectTitle ?? 'No thesis title set'}
      </p>

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
