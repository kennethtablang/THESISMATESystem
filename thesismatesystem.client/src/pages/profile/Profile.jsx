import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import { User, Mail, Hash, Shield, Camera, Save } from 'lucide-react'

const roleColors = {
  Student: { bg: '#dbeafe', text: '#1e40af' },
  Adviser: { bg: '#d1fae5', text: '#065f46' },
  Panelist: { bg: '#ede9fe', text: '#5b21b6' },
  Coordinator: { bg: '#fef3c7', text: '#92400e' },
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ fullName: user?.fullName ?? '', email: user?.email ?? '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const role = user?.role ?? 'Student'
  const roleStyle = roleColors[role] ?? roleColors.Student
  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'TM'

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    updateUser(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <TopBar title="My Profile" subtitle="Manage your account information" />
      <div className="p-8 max-w-2xl">
        {/* Avatar card */}
        <div
          className="rounded-2xl p-6 mb-6 flex items-center gap-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-bold text-3xl"
              style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3350 100%)', color: '#c9a84c', border: '3px solid #f4f0e6' }}
            >
              {initials}
            </div>
            <button
              className="absolute -bottom-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: '#c9a84c', color: '#0a1628' }}
            >
              <Camera size={13} />
            </button>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold" style={{ color: '#0f172a', letterSpacing: '-0.3px' }}>
              {user?.fullName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                style={{ background: roleStyle.bg, color: roleStyle.text }}
              >
                <Shield size={10} className="mr-1" /> {role}
              </span>
              <span className="text-sm" style={{ color: '#9ca3af' }}>PSU Lingayen</span>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <p className="font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>Account Information</p>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                <span className="flex items-center gap-1.5"><User size={13} /> Full Name</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                <span className="flex items-center gap-1.5"><Mail size={13} /> Email Address</span>
              </label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                <span className="flex items-center gap-1.5"><Shield size={13} /> Role</span>
              </label>
              <input type="text" className="form-input" value={role} disabled />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Saving...
                  </>
                ) : saved ? (
                  '✓ Saved'
                ) : (
                  <><Save size={15} /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div
          className="bg-white rounded-2xl p-6 mt-6"
          style={{ border: '1px solid #f0ebe0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <p className="font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>Change Password</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Current Password</label>
              <input type="password" className="form-input" placeholder="Enter current password" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>New Password</label>
              <input type="password" className="form-input" placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Confirm New Password</label>
              <input type="password" className="form-input" placeholder="Re-enter new password" />
            </div>
            <button className="btn-secondary">Update Password</button>
          </div>
        </div>
      </div>
    </div>
  )
}
