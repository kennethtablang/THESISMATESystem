import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import { User, Mail, Shield, Camera, Save, KeyRound, Eye, EyeOff } from 'lucide-react'

const roleColors = {
  Student:    { bg: 'rgba(59,130,246,0.12)',  text: '#3b82f6' },
  Adviser:    { bg: 'rgba(34,197,94,0.12)',   text: '#16a34a' },
  Panel:      { bg: 'rgba(124,58,237,0.12)',  text: '#7c3aed' },
  FacultyIC:  { bg: 'rgba(6,182,212,0.12)',   text: '#0891b2' },
  Admin:      { bg: 'rgba(245,158,11,0.12)',  text: '#f59e0b' },
  SuperAdmin: { bg: 'rgba(239,68,68,0.12)',   text: '#ef4444' },
}

export default function Profile() {
  const { user, updateUser } = useAuth()

  const [form, setForm] = useState({
    firstName: user?.firstName ?? '',
    middleName: user?.middleName ?? '',
    lastName: user?.lastName ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  const role = user?.role ?? 'Student'
  const roleStyle = roleColors[role] ?? roleColors.Student
  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'TM'

  async function handleSave(e) {
    e.preventDefault()
    setSaveError('')
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSaveError('First name and last name are required.')
      return
    }
    setSaving(true)
    try {
      const updated = await authService.updateProfile({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
      })
      const fullName = [updated.firstName, updated.middleName, updated.lastName].filter(Boolean).join(' ')
      updateUser({ firstName: updated.firstName, middleName: updated.middleName, lastName: updated.lastName, fullName })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('New passwords do not match.')
      return
    }
    if (pwForm.newPassword.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    setPwSaving(true)
    try {
      await authService.changePassword({
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPwSaved(true)
      setTimeout(() => setPwSaved(false), 2500)
    } catch (err) {
      setPwError(err.message || 'Password change failed. Please check your current password.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div>
      <TopBar title="My Profile" subtitle="Manage your account information" />
      <div className="p-4 sm:p-8 max-w-2xl">
        {/* Avatar card */}
        <div
          className="rounded-2xl p-6 mb-6 flex items-center gap-5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center font-display font-bold text-3xl"
              style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3350 100%)', color: '#c9a84c', border: '3px solid var(--border-light)' }}
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
            <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
              {user?.fullName}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold"
                style={{ background: roleStyle.bg, color: roleStyle.text }}
              >
                <Shield size={10} className="mr-1" /> {role}
              </span>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>PSU Lingayen</span>
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <p className="font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>Account Information</p>
          {saveError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {saveError}
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  <span className="flex items-center gap-1.5"><User size={13} /> First Name</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={form.firstName}
                  onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Last Name
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={form.lastName}
                  onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Middle Name <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(optional)</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={form.middleName}
                onChange={(e) => setForm(f => ({ ...f, middleName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                <span className="flex items-center gap-1.5"><Mail size={13} /> Email Address</span>
              </label>
              <input
                type="email"
                className="form-input"
                value={user?.email ?? ''}
                disabled
                style={{ opacity: 0.6 }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                <span className="flex items-center gap-1.5"><Shield size={13} /> Role</span>
              </label>
              <input type="text" className="form-input" value={role} disabled style={{ opacity: 0.6 }} />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Saving...
                  </>
                ) : saved ? (
                  <><span>✓</span> Saved</>
                ) : (
                  <><Save size={15} /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <p className="font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>Change Password</p>
          {pwError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {pwError}
            </div>
          )}
          {pwSaved && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              Password changed successfully.
            </div>
          )}
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Current Password</label>
              <div className="relative">
                <input
                  type={showPw.current ? 'text' : 'password'}
                  className="form-input pr-11"
                  placeholder="Enter current password"
                  value={pwForm.currentPassword}
                  onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}>
                  {showPw.current ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>New Password</label>
              <div className="relative">
                <input
                  type={showPw.new ? 'text' : 'password'}
                  className="form-input pr-11"
                  placeholder="Min. 8 characters"
                  value={pwForm.newPassword}
                  onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} onClick={() => setShowPw(s => ({ ...s, new: !s.new }))}>
                  {showPw.new ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPw.confirm ? 'text' : 'password'}
                  className="form-input pr-11"
                  placeholder="Re-enter new password"
                  value={pwForm.confirmPassword}
                  onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  required
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}>
                  {showPw.confirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={pwSaving} className="btn-secondary">
              {pwSaving ? 'Updating...' : <><KeyRound size={14} /> Update Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
