import { useState, useEffect } from 'react'
import { Users, Shield, UserCheck, UserX, Search } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import { authService } from '../../services/api'

const roleColors = {
  SuperAdmin: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626' },
  Admin: { bg: 'rgba(249,115,22,0.1)', text: '#ea580c' },
  Adviser: { bg: 'rgba(34,197,94,0.1)', text: '#16a34a' },
  FacultyIC: { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' },
  Student: { bg: 'rgba(14,165,233,0.1)', text: '#0284c7' },
  Panel: { bg: 'rgba(139,92,246,0.1)', text: '#7c3aed' },
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')

  useEffect(() => {
    authService.allUsers().then(setUsers).finally(() => setLoading(false))
  }, [])

  async function handleToggleActive(user) {
    if (!confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.fullName}?`)) return
    try {
      if (user.isActive) {
        await authService.deactivate(user.id)
      } else {
        await authService.updateUser(user.id, { isActive: true })
      }
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u))
    } catch (err) { alert(err.message) }
  }

  const roles = [...new Set(users.map(u => u.role))].filter(Boolean)
  const filtered = users.filter(u => {
    const matchSearch = !search || u.fullName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'All' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  }

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{background:'#c9a84c',animationDelay:`${i*0.15}s`}} />)}</div></div>
  }

  return (
    <>
      <TopBar title="User Management" subtitle="Manage all system users" />
      <div className="p-8">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Users', value: stats.total, color: '#c9a84c', icon: Users },
            { label: 'Active', value: stats.active, color: '#16a34a', icon: UserCheck },
            { label: 'Inactive', value: stats.inactive, color: '#dc2626', icon: UserX },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className="stat-card flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}18` }}>
                  <Icon size={18} style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
              <Search size={15} style={{ color: 'var(--text-muted)' }} />
              <input className="bg-transparent text-sm outline-none flex-1" style={{ color: 'var(--text-primary)' }} placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['All', ...roles].map(r => (
                <button key={r} onClick={() => setRoleFilter(r)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{ background: roleFilter === r ? '#c9a84c' : 'var(--bg-subtle)', color: roleFilter === r ? '#0a1628' : 'var(--text-secondary)' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => {
                  const rc = roleColors[user.role] ?? { bg: 'rgba(107,114,128,0.1)', text: '#6b7280' }
                  return (
                    <tr key={user.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'linear-gradient(135deg,#c9a84c,#d4b565)', color: '#0a1628' }}>
                            {user.fullName?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() ?? '??'}
                          </div>
                          <span className="font-medium text-sm">{user.fullName}</span>
                        </div>
                      </td>
                      <td><span className="text-sm">{user.email}</span></td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: rc.bg, color: rc.text }}>{user.role}</span>
                      </td>
                      <td>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: user.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: user.isActive ? '#16a34a' : '#dc2626' }}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td><span className="text-sm">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span></td>
                      <td>
                        <button className="btn-ghost px-2 py-1 text-xs" onClick={() => handleToggleActive(user)}
                          style={{ color: user.isActive ? '#dc2626' : '#16a34a' }}>
                          {user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>No users found matching your criteria.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
