import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, KeyRound, CheckCircle, Eye, EyeOff } from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'
import { authService } from '../../services/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const email = params.get('email') ?? ''
  const token = params.get('token') ?? ''

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/[A-Z]/.test(form.newPassword)) {
      setError('Password must contain at least one uppercase letter.')
      return
    }
    if (!/[0-9]/.test(form.newPassword)) {
      setError('Password must contain at least one number.')
      return
    }

    if (!email || !token) {
      setError('Invalid reset link. Please request a new one.')
      return
    }

    setLoading(true)
    try {
      await authService.resetPassword({ email, token, newPassword: form.newPassword })
      setDone(true)
    } catch (err) {
      setError(err.message || 'Password reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-[480px] animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="ThesisMate" className="w-10 h-10 rounded-xl object-contain" style={{ background: '#fff' }} />
          <div>
            <p className="font-display font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>ThesisMate</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em' }}>PSU LINGAYEN</p>
          </div>
        </div>

        <div className="rounded-2xl p-8" style={{ background: 'var(--bg-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border-main)' }}>
          {!done ? (
            <>
              <div className="mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
                  <KeyRound size={22} style={{ color: '#c9a84c' }} />
                </div>
                <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
                  Set new password
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Choose a strong password for <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>
                </p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="form-input pr-11"
                      placeholder="Min. 8 chars, 1 uppercase, 1 number"
                      value={form.newPassword}
                      onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                      required
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Confirm new password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full h-11 mt-2" style={{ fontSize: '15px' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Resetting...
                    </span>
                  ) : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <CheckCircle size={30} style={{ color: '#22c55e' }} />
              </div>
              <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
                Password reset!
              </h1>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Link to="/login" className="btn-primary w-full inline-flex items-center justify-center h-11" style={{ textDecoration: 'none', fontSize: '15px' }}>
                Go to sign in
              </Link>
            </div>
          )}
        </div>

        {!done && (
          <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            <Link to="/forgot-password" className="font-semibold inline-flex items-center gap-1" style={{ color: '#c9a84c' }}>
              <ArrowLeft size={13} /> Request a new link
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
