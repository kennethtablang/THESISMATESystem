import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { authService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import { User, Mail, Shield, Camera, Save, KeyRound, Eye, EyeOff, ShieldCheck, ShieldOff } from 'lucide-react'

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

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorLoading, setTwoFactorLoading] = useState(true)
  const [setupStep, setSetupStep] = useState(null) // null | 'code-sent' | 'disabling'
  const [setupCode, setSetupCode] = useState('')
  const [disablePassword, setDisablePassword] = useState('')
  const [twoFactorError, setTwoFactorError] = useState('')
  const [twoFactorMsg, setTwoFactorMsg] = useState('')
  const [twoFactorBusy, setTwoFactorBusy] = useState(false)

  const role = user?.role ?? 'Student'
  const roleStyle = roleColors[role] ?? roleColors.Student
  const initials = user?.fullName?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'TM'

  useEffect(() => {
    authService.twoFactorStatus()
      .then(res => setTwoFactorEnabled(res.enabled))
      .catch(() => {})
      .finally(() => setTwoFactorLoading(false))
  }, [])

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

  async function handleSendCode() {
    setTwoFactorError('')
    setTwoFactorMsg('')
    setTwoFactorBusy(true)
    try {
      await authService.twoFactorEnable()
      setSetupStep('code-sent')
      setTwoFactorMsg('A 6-digit code has been sent to your email.')
    } catch (err) {
      setTwoFactorError(err.message || 'Failed to send code.')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  async function handleVerifySetup(e) {
    e.preventDefault()
    setTwoFactorError('')
    setTwoFactorBusy(true)
    try {
      await authService.twoFactorVerifySetup(setupCode.trim())
      setTwoFactorEnabled(true)
      setSetupStep(null)
      setSetupCode('')
      setTwoFactorMsg('Two-factor authentication is now enabled.')
    } catch (err) {
      setTwoFactorError(err.message || 'Invalid code. Please try again.')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  async function handleDisable(e) {
    e.preventDefault()
    setTwoFactorError('')
    setTwoFactorBusy(true)
    try {
      await authService.twoFactorDisable(disablePassword)
      setTwoFactorEnabled(false)
      setSetupStep(null)
      setDisablePassword('')
      setTwoFactorMsg('Two-factor authentication has been disabled.')
    } catch (err) {
      setTwoFactorError(err.message || 'Incorrect password.')
    } finally {
      setTwoFactorBusy(false)
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

        {/* 2FA */}
        <div
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>Two-Factor Authentication</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                {twoFactorLoading ? 'Checking status...' : twoFactorEnabled ? 'Enabled — your account is protected with an email code on each login.' : 'Disabled — add an extra layer of security to your account.'}
              </p>
            </div>
            {!twoFactorLoading && (
              <span className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: twoFactorEnabled ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)', color: twoFactorEnabled ? '#16a34a' : '#6b7280' }}>
                {twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            )}
          </div>

          {twoFactorMsg && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
              {twoFactorMsg}
            </div>
          )}
          {twoFactorError && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {twoFactorError}
            </div>
          )}

          {!twoFactorLoading && !twoFactorEnabled && !setupStep && (
            <button onClick={handleSendCode} disabled={twoFactorBusy} className="btn-secondary flex items-center gap-2">
              <ShieldCheck size={15} />
              {twoFactorBusy ? 'Sending...' : 'Enable 2FA'}
            </button>
          )}

          {!twoFactorLoading && !twoFactorEnabled && setupStep === 'code-sent' && (
            <form onSubmit={handleVerifySetup} className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter the 6-digit code sent to your email:</p>
              <div className="flex gap-3">
                <input
                  className="form-input text-center font-display text-xl tracking-widest max-w-[160px]"
                  placeholder="000000"
                  value={setupCode}
                  onChange={e => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
                <button type="submit" disabled={twoFactorBusy || setupCode.length < 4} className="btn-primary flex items-center gap-2">
                  <ShieldCheck size={14} />
                  {twoFactorBusy ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => { setSetupStep(null); setSetupCode(''); setTwoFactorMsg('') }}>Cancel</button>
              </div>
              <button type="button" className="text-xs underline" style={{ color: 'var(--text-muted)' }} onClick={handleSendCode}>
                Resend code
              </button>
            </form>
          )}

          {!twoFactorLoading && twoFactorEnabled && setupStep !== 'disabling' && (
            <button onClick={() => { setSetupStep('disabling'); setTwoFactorError(''); setTwoFactorMsg('') }}
              className="btn-ghost flex items-center gap-2 text-sm" style={{ color: '#dc2626' }}>
              <ShieldOff size={14} /> Disable 2FA
            </button>
          )}

          {!twoFactorLoading && twoFactorEnabled && setupStep === 'disabling' && (
            <form onSubmit={handleDisable} className="space-y-3">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Enter your current password to confirm:</p>
              <div className="flex gap-3">
                <input
                  type="password"
                  className="form-input max-w-[240px]"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                  required
                />
                <button type="submit" disabled={twoFactorBusy || !disablePassword} className="btn-secondary flex items-center gap-2" style={{ color: '#dc2626' }}>
                  <ShieldOff size={14} />
                  {twoFactorBusy ? 'Disabling...' : 'Confirm Disable'}
                </button>
                <button type="button" className="btn-ghost" onClick={() => { setSetupStep(null); setDisablePassword('') }}>Cancel</button>
              </div>
            </form>
          )}
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
