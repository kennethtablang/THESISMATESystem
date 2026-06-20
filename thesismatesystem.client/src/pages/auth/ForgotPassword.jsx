import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'
import { authService } from '../../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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
          {!sent ? (
            <>
              <div className="mb-6">
                <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
                  Forgot your password?
                </h1>
                <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-5 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    Email address
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@psu.edu.ph"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full h-11" style={{ fontSize: '15px' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><Mail size={16} /> Send Reset Link</span>
                  )}
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
                Check your inbox
              </h1>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                If <strong style={{ color: 'var(--text-primary)' }}>{email}</strong> is registered, you'll receive a password reset link shortly.
              </p>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Check your spam folder if you don't see it within a few minutes.
              </p>
              <button
                onClick={() => { setSent(false); setEmail('') }}
                className="btn-secondary w-full mb-3"
              >
                Try a different email
              </button>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Link to="/login" className="font-semibold inline-flex items-center gap-1" style={{ color: '#c9a84c' }}>
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
