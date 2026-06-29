import { useState, useEffect } from 'react'
import { Users, UserCheck, UserX, Search, Pencil, Eye, EyeOff } from 'lucide-react'
import { toast } from '../../utils/toast'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import Pagination from '../../components/ui/Pagination'
import { PageLoader } from '../../components/ui/Spinner'
import { authService } from '../../services/api'
import { useSort, SortIcon } from '../../hooks/useSort.jsx'
import { useAuth } from '../../contexts/AuthContext'

const roleColors = {
  SuperAdmin: { bg: 'rgba(239,68,68,0.1)',   text: '#dc2626' },
  Admin:      { bg: 'rgba(249,115,22,0.1)',   text: '#ea580c' },
  Faculty:    { bg: 'rgba(34,197,94,0.1)',    text: '#16a34a' },
  Student:    { bg: 'rgba(14,165,233,0.1)',   text: '#0284c7' },
}

const ROLE_LABELS = {
  SuperAdmin: 'Super Admin',
}
const roleLabel = (r) => ROLE_LABELS[r] ?? r

const VALID_ROLES = new Set(['SuperAdmin', 'Admin', 'Faculty', 'Student'])

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const isSuperAdmin = currentUser?.role === 'SuperAdmin'

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [page,     setPage]     = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [toggleError, setToggleError] = useState('')

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ firstName: '', middleName: '', lastName: '', phoneNumber: '', email: '', role: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const [pwForm, setPwForm] = useState({ newPassword: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwVisible, setPwVisible] = useState({ newPassword: false, confirm: false })

  const [twoFaDisabling, setTwoFaDisabling] = useState(false)
  const [twoFaError, setTwoFaError] = useState('')

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
      const wasActive = confirmTarget.isActive
      setUsers(prev => prev.map(u => u.id === confirmTarget.id ? { ...u, isActive: !u.isActive } : u))
      setConfirmTarget(null)
      toast.success(wasActive ? 'User deactivated.' : 'User activated.')
    } catch (err) {
      setToggleError(err.message)
      toast.error(err.message || 'Failed to update user status.')
    } finally {
      setToggling(false)
    }
  }

  function handleEditOpen(user) {
    setEditError('')
    setEditForm({
      firstName:   user.firstName   ?? '',
      middleName:  user.middleName  ?? '',
      lastName:    user.lastName    ?? '',
      phoneNumber: user.phoneNumber ?? '',
      email:       user.email       ?? '',
      role:        user.role        ?? '',
    })
    setPwForm({ newPassword: '', confirm: '' })
    setPwError('')
    setPwSuccess(false)
    setPwVisible({ newPassword: false, confirm: false })
    setTwoFaError('')
    setEditTarget(user)
  }

  async function handleEditSave() {
    if (!editTarget) return
    setEditSaving(true)
    setEditError('')
    try {
      const payload = {
        firstName:   editForm.firstName.trim()   || undefined,
        middleName:  editForm.middleName.trim()  || undefined,
        lastName:    editForm.lastName.trim()    || undefined,
        phoneNumber: editForm.phoneNumber.trim() || undefined,
      }
      if (isSuperAdmin && editForm.role && editForm.role !== editTarget.role)
        payload.role = editForm.role

      let updated = await authService.updateUser(editTarget.id, payload)

      // Email change is a separate call (SuperAdmin only)
      const newEmail = editForm.email.trim()
      if (isSuperAdmin && newEmail && newEmail !== editTarget.email) {
        updated = await authService.adminSetEmail(editTarget.id, newEmail)
      }

      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
      setEditTarget(null)
      toast.success('User updated.')
    } catch (err) {
      setEditError(err.message || 'Failed to update user.')
      toast.error(err.message || 'Failed to update user.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handlePasswordReset() {
    if (!editTarget) return
    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError('Passwords do not match.')
      return
    }
    setPwSaving(true)
    setPwError('')
    setPwSuccess(false)
    try {
      await authService.adminResetPassword(editTarget.id, pwForm.newPassword)
      setPwForm({ newPassword: '', confirm: '' })
      setPwSuccess(true)
      toast.success('Password reset successfully.')
    } catch (err) {
      setPwError(err.message || 'Failed to reset password.')
      toast.error(err.message || 'Failed to reset password.')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleToggle2fa() {
    if (!editTarget) return
    const enabling = !editTarget.twoFactorEnabled
    setTwoFaDisabling(true)
    setTwoFaError('')
    try {
      if (enabling) {
        await authService.adminEnable2fa(editTarget.id)
      } else {
        await authService.adminDisable2fa(editTarget.id)
      }
      const next = { ...editTarget, twoFactorEnabled: enabling }
      setUsers(prev => prev.map(u => u.id === editTarget.id ? { ...u, twoFactorEnabled: enabling } : u))
      setEditTarget(next)
      toast.success(`2FA ${enabling ? 'enabled' : 'disabled'}.`)
    } catch (err) {
      setTwoFaError(err.message || `Failed to ${enabling ? 'enable' : 'disable'} 2FA.`)
      toast.error(err.message || `Failed to ${enabling ? 'enable' : 'disable'} 2FA.`)
    } finally {
      setTwoFaDisabling(false)
    }
  }

  const roles = [...new Set(users.map(u => u.role))].filter(r => r && VALID_ROLES.has(r))

  const filtered = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    const matchRole = roleFilter === 'All' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const { sorted: sortedUsers, sortKey, sortDir, toggle } = useSort(filtered, 'fullName')
  const totalPages = Math.ceil(sortedUsers.length / pageSize)
  const paginated  = sortedUsers.slice((page - 1) * pageSize, page * pageSize)

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
                  {r === 'All' ? 'All' : roleLabel(r)}
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
                    {[
                      { key: 'fullName', label: 'Name' },
                      { key: 'email',    label: 'Email', cls: 'hidden sm:table-cell' },
                      { key: 'role',     label: 'Role' },
                      { key: 'isActive', label: 'Status' },
                      { key: 'createdAt',label: 'Joined', cls: 'hidden md:table-cell' },
                    ].map(({ key, label, cls }) => (
                      <th key={key} className={cls}
                        onClick={() => toggle(key)}
                        style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                        {label}<SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />
                      </th>
                    ))}
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
                            {roleLabel(user.role)}
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditOpen(user)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                              style={{
                                background: 'rgba(201,168,76,0.08)',
                                color: '#c9a84c',
                                border: '1px solid rgba(201,168,76,0.25)',
                              }}
                            >
                              <Pencil size={12} />
                              <span className="hidden sm:inline">Edit</span>
                            </button>
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
                          </div>
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
            totalItems={sortedUsers.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={n => { setPageSize(n); setPage(1) }}
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

      {/* Edit user modal */}
      <Modal
        open={!!editTarget}
        onClose={() => { setEditTarget(null); setEditError('') }}
        title={`Edit User — ${editTarget?.fullName ?? ''}`}
        size={isSuperAdmin ? 'lg' : 'md'}
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setEditTarget(null); setEditError('') }}>
              Cancel
            </button>
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

        <div className={isSuperAdmin ? 'grid grid-cols-2 gap-6' : 'space-y-3'}>

          {/* ── Left column: user info ──────────────────────────────── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
              User Information
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>First Name</label>
                <input
                  className="form-input w-full"
                  value={editForm.firstName}
                  onChange={e => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
                <input
                  className="form-input w-full"
                  value={editForm.lastName}
                  onChange={e => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Middle Name <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <input
                className="form-input w-full"
                value={editForm.middleName}
                onChange={e => setEditForm(f => ({ ...f, middleName: e.target.value }))}
                placeholder="Middle name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Phone Number <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <input
                className="form-input w-full"
                value={editForm.phoneNumber}
                onChange={e => setEditForm(f => ({ ...f, phoneNumber: e.target.value }))}
                placeholder="e.g. 09XXXXXXXXX"
              />
            </div>

            {isSuperAdmin && (
              <>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                  <input
                    type="email"
                    className="form-input w-full"
                    value={editForm.email}
                    onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Role</label>
                  <select
                    className="form-input w-full"
                    value={editForm.role}
                    onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  >
                    {[...VALID_ROLES].map(r => (
                      <option key={r} value={r}>{roleLabel(r)}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* ── Right column: admin actions (SuperAdmin only) ───────── */}
          {isSuperAdmin && (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--text-muted)' }}>
                Admin Actions
              </p>

              {/* Reset password */}
              <div
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Reset Password</p>

                {/* New password */}
                <div className="relative">
                  <input
                    type={pwVisible.newPassword ? 'text' : 'password'}
                    className="form-input w-full pr-10"
                    value={pwForm.newPassword}
                    onChange={e => { setPwForm(f => ({ ...f, newPassword: e.target.value })); setPwSuccess(false) }}
                    placeholder="New password (min 8 chars)"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPwVisible(v => ({ ...v, newPassword: !v.newPassword }))}
                    className="absolute inset-y-0 right-0 flex items-center px-3"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {pwVisible.newPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Confirm password */}
                <div className="relative">
                  <input
                    type={pwVisible.confirm ? 'text' : 'password'}
                    className="form-input w-full pr-10"
                    value={pwForm.confirm}
                    onChange={e => { setPwForm(f => ({ ...f, confirm: e.target.value })); setPwSuccess(false) }}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setPwVisible(v => ({ ...v, confirm: !v.confirm }))}
                    className="absolute inset-y-0 right-0 flex items-center px-3"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    {pwVisible.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {pwError   && <p className="text-xs" style={{ color: '#dc2626' }}>{pwError}</p>}
                {pwSuccess && <p className="text-xs" style={{ color: '#16a34a' }}>Password reset successfully.</p>}
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={pwSaving || !pwForm.newPassword || !pwForm.confirm}
                  className="btn-primary w-full"
                  style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                >
                  {pwSaving ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>

              {/* 2FA toggle */}
              <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
              >
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Two-Factor Authentication</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: editTarget?.twoFactorEnabled ? '#16a34a' : '#9ca3af' }}
                    />
                    <span className="text-sm font-medium" style={{ color: editTarget?.twoFactorEnabled ? '#16a34a' : 'var(--text-muted)' }}>
                      {editTarget?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggle2fa}
                    disabled={twoFaDisabling}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={editTarget?.twoFactorEnabled
                      ? { background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }
                      : { background: 'rgba(34,197,94,0.08)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.2)' }
                    }
                  >
                    {twoFaDisabling
                      ? (editTarget?.twoFactorEnabled ? 'Disabling…' : 'Enabling…')
                      : (editTarget?.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA')
                    }
                  </button>
                </div>
                {twoFaError && <p className="text-xs mt-2" style={{ color: '#dc2626' }}>{twoFaError}</p>}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
