import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'
import { authService } from '../../services/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('loading') // loading | success | error
  const [message, setMessage] = useState('')
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true

    const userId = params.get('userId')
    const token = params.get('token')

    if (!userId || !token) {
      setStatus('error')
      setMessage('Invalid verification link. Required parameters are missing.')
      return
    }

    authService
      .verifyEmail(userId, token)
      .then((res) => {
        setStatus('success')
        setMessage(res?.message ?? 'Email verified successfully.')
      })
      .catch((err) => {
        setStatus('error')
        setMessage(err?.message ?? 'The verification link is invalid or has expired.')
      })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-[480px] animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="ThesisMate" className="w-10 h-10 rounded-xl object-contain" style={{ background: '#fff' }} />
          <div>
            <p className="font-display font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>ThesisMate</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em' }}>PSU LINGAYEN</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--bg-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border-main)' }}
        >
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <svg className="animate-spin w-12 h-12" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#c9a84c" strokeWidth="3" />
                  <path className="opacity-75" fill="#c9a84c" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
              <h1 className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-heading)' }}>
                Verifying your email...
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Please wait while we confirm your account.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <CheckCircle size={30} style={{ color: '#22c55e' }} />
              </div>
              <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
                Email verified!
              </h1>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {message} You can now sign in to your ThesisMate student account.
              </p>
              <Link
                to="/login"
                className="btn-primary w-full inline-flex items-center justify-center h-11"
                style={{ fontSize: '15px', textDecoration: 'none' }}
              >
                Go to sign in
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <XCircle size={30} style={{ color: '#dc2626' }} />
              </div>
              <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
                Verification failed
              </h1>
              <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                {message} Check your inbox for a new verification email, or contact your administrator for assistance.
              </p>
              <Link
                to="/login"
                className="btn-secondary w-full inline-flex items-center justify-center h-10"
                style={{ textDecoration: 'none' }}
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
