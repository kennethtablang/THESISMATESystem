import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { groupService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Badge from '../../components/ui/Badge'
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
  const [form, setForm] = useState({ name: '', thesisTitle: '', section: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)

  useEffect(() => {
    groupService.list()
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const g = await groupService.create(form)
      setGroups((prev) => [g, ...prev])
      setShowModal(false)
      setForm({ name: '', thesisTitle: '', section: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = groups.filter(
    (g) =>
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.thesisTitle?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <><TopBar title="Groups" /><PageLoader /></>

  return (
    <div>
      <TopBar
        title={isAdmin ? 'Manage Groups' : user?.role === 'Adviser' ? 'My Advisees' : user?.role === 'Student' ? 'My Group' : 'Groups'}
        subtitle={`${groups.length} capstone group${groups.length !== 1 ? 's' : ''}`}
      />
      <div className="p-8">
        {/* Toolbar */}
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
            <button className="btn-primary" onClick={() => setShowModal(true)}>
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
              <button className="btn-primary" onClick={() => setShowModal(true)}>
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Group Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Group Alpha"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Thesis Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter the thesis title"
              value={form.thesisTitle}
              onChange={(e) => setForm({ ...form, thesisTitle: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Section</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. BSIT 4-A"
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function GroupCard({ group, onClick }) {
  const progress = group.progress ?? Math.floor(Math.random() * 80) + 10

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
          {(group.name ?? 'G')[0]}
        </div>
        <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" style={{ color: 'var(--text-muted)' }} />
      </div>

      <h3 className="font-semibold mb-0.5" style={{ color: 'var(--text-heading)' }}>{group.name ?? 'Unnamed Group'}</h3>
      <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
        {group.thesisTitle ?? 'No thesis title set'}
      </p>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Users size={13} />
          <span>{group.memberCount ?? group.members?.length ?? 0} members</span>
        </div>
        {group.section && (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <BookOpen size={13} />
            <span>{group.section}</span>
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

