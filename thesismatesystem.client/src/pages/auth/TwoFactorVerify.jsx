import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'
import { authService } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function TwoFactorVerify() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const userId = sessionStorage.getItem('tm_2fa_uid')

  useEffect(() => {
    if (!userId) navigate('/login', { replace: true })
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (code.trim().length < 4) return
    setError('')
    setLoading(true)
    try {
      const res = await authService.twoFactorLogin(userId, code.trim())
      sessionStorage.removeItem('tm_2fa_uid')
      setAuth(res.token, res.user)
      window.location.href = '/dashboard'
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.')
      setCode('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-[420px] animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="ThesisMate" className="w-10 h-10 rounded-xl object-contain" style={{ background: '#fff' }} />
          <div>
            <p className="font-display font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>ThesisMate</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em' }}>PSU LINGAYEN</p>
          </div>
        </div>

        <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bg-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border-main)' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}>
            <ShieldCheck size={26} style={{ color: '#c9a84c' }} />
          </div>

          <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
            Two-factor verification
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            We sent a verification code to your email address. Enter it below to complete sign-in.
          </p>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              ref={inputRef}
              type="text"
              className="form-input text-center font-display text-3xl tracking-widest"
              placeholder="000000"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              style={{ letterSpacing: '0.3em', fontSize: '1.75rem', height: '3.5rem' }}
              required
            />
            <button type="submit" disabled={loading || code.length < 4} className="btn-primary w-full h-11" style={{ fontSize: '15px' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Verifying...
                </span>
              ) : 'Verify Code'}
            </button>
          </form>

          <p className="text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
            Didn't receive the code? Check your spam folder or wait a moment and try signing in again.
          </p>
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          <Link to="/login" className="font-semibold inline-flex items-center gap-1" style={{ color: '#c9a84c' }}
            onClick={() => sessionStorage.removeItem('tm_2fa_uid')}>
            <ArrowLeft size={13} /> Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
