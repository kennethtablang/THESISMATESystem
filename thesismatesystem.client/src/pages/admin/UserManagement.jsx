import { useState, useEffect } from 'react'
import { Users, UserCheck, UserX, Search } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { PageLoader } from '../../components/ui/Spinner'
import { authService } from '../../services/api'

const PAGE_SIZE = 10

const roleColors = {
  SuperAdmin: { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626' },
  Admin:      { bg: 'rgba(249,115,22,0.1)',   text: '#ea580c' },
  Adviser:    { bg: 'rgba(34,197,94,0.1)',    text: '#16a34a' },
  FacultyIC:  { bg: 'rgba(59,130,246,0.1)',   text: '#3b82f6' },
  Student:    { bg: 'rgba(14,165,233,0.1)',   text: '#0284c7' },
  Panel:      { bg: 'rgba(139,92,246,0.1)',   text: '#7c3aed' },
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState('')

  useEffect(() => {
    authService.allUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  function handleToggleActive(user) {
    setToggleError('')
    setConfirmTarget(user)
  }

  async function confirmToggle() {
    if (!confirmTarget) return
    setToggling(true)
    setToggleError('')
    try {
      if (confirmTarget.isActive) {
        await authService.deactivate(confirmTarget.id)
      } else {
        await authService.updateUser(confirmTarget.id, { isActive: true })
      }
      setUsers(prev => prev.map(u => u.id === confirmTarget.id ? { ...u, isActive: !u.isActive } : u))
      setConfirmTarget(null)
    } catch (err) {
      setToggleError(err.message)
    } finally {
      setToggling(false)
    }
  }

  const roles = [...new Set(users.map(u => u.role))].filter(Boolean)

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchRole = roleFilter === 'All' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = {
    total:    users.length,
    active:   users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  }

  if (loading) {
    return (
      <>
        <TopBar title="User Management" subtitle="Manage all system users" />
        <PageLoader />
      </>
    )
  }

  return (
    <>
      <TopBar title="User Management" subtitle="Manage all system users" />
      <div className="p-4 sm:p-8">

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Users', value: stats.total,    color: '#c9a84c', icon: Users },
            { label: 'Active',      value: stats.active,   color: '#16a34a', icon: UserCheck },
            { label: 'Inactive',    value: stats.inactive, color: '#dc2626', icon: UserX },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="stat-card flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18` }}
              >
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold font-display" style={{ color }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card — edge-to-edge, no padding wrapper */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          {/* Filter bar */}
          <div
            className="flex gap-3 px-5 py-4 flex-wrap border-b"
            style={{ borderColor: 'var(--border-light)' }}
          >
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-[180px]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
            >
              <Search size={14} style={{ color: 'var(--text-muted)' }} />
              <input
                className="bg-transparent text-sm outline-none flex-1"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Search by name or email…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {['All', ...roles].map(r => (
                <button
                  key={r}
                  onClick={() => { setRoleFilter(r); setPage(1) }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: roleFilter === r ? '#c9a84c' : 'var(--bg-subtle)',
                    color: roleFilter === r ? '#0a1628' : 'var(--text-secondary)',
                    border: `1px solid ${roleFilter === r ? '#c9a84c' : 'var(--border-main)'}`,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
                >
                  <Users size={20} style={{ color: 'var(--text-muted)' }} strokeWidth={1.5} />
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  No users found
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Try a different search term or role filter.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="hidden sm:table-cell">Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th className="hidden md:table-cell">Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(user => {
                    const rc = roleColors[user.role] ?? { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' }
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}
                            >
                              {user.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '??'}
                            </div>
                            <span className="font-medium text-sm" style={{ color: 'var(--text-heading)' }}>
                              {user.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user.email}</span>
                        </td>
                        <td>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: rc.bg, color: rc.text }}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: user.isActive ? '#16a34a' : '#dc2626' }}
                            />
                            <span
                              className="text-xs font-medium"
                              style={{ color: user.isActive ? '#16a34a' : '#dc2626' }}
                            >
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            {user.createdAt
                              ? new Date(user.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{
                              background: user.isActive ? 'rgba(220,38,38,0.08)' : 'rgba(34,197,94,0.08)',
                              color: user.isActive ? '#dc2626' : '#16a34a',
                              border: `1px solid ${user.isActive ? 'rgba(220,38,38,0.2)' : 'rgba(34,197,94,0.2)'}`,
                            }}
                          >
                            {user.isActive
                              ? <><UserX size={12} /> <span className="hidden sm:inline">Deactivate</span></>
                              : <><UserCheck size={12} /> <span className="hidden sm:inline">Activate</span></>}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      <Modal
        open={!!confirmTarget}
        onClose={() => { setConfirmTarget(null); setToggleError('') }}
        title={confirmTarget?.isActive ? 'Deactivate User' : 'Activate User'}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setConfirmTarget(null); setToggleError('') }}>
              Cancel
            </button>
            <button
              className="btn-primary"
              style={confirmTarget?.isActive ? { background: '#dc2626', borderColor: '#dc2626' } : {}}
              onClick={confirmToggle}
              disabled={toggling}
            >
              {toggling
                ? 'Saving…'
                : confirmTarget?.isActive
                  ? 'Deactivate'
                  : 'Activate'}
            </button>
          </>
        }
      >
        {toggleError && (
          <div className="mb-3 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
            {toggleError}
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {confirmTarget?.isActive
            ? <>Are you sure you want to deactivate <strong style={{ color: 'var(--text-primary)' }}>{confirmTarget?.fullName}</strong>? They will no longer be able to log in.</>
            : <>Reactivate <strong style={{ color: 'var(--text-primary)' }}>{confirmTarget?.fullName}</strong>? They will regain access to the system.</>
          }
        </p>
      </Modal>
    </>
  )
}
