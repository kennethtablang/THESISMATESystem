import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Mail, ArrowLeft, AlertTriangle, RefreshCw } from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'
import { authService } from '../../services/api'

// Seconds before another resend is allowed, so a student cannot flood their own inbox.
const RESEND_COOLDOWN = 60

export default function CheckEmail() {
  const [params] = useSearchParams()
  const rawEmail = params.get('email')
  const email = rawEmail ?? 'your email'
  const [notSent, setNotSent] = useState(params.get('sent') === '0')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState(null) // { ok, text }
  const [cooldown, setCooldown] = useState(0)

  async function handleResend() {
    if (!rawEmail || resending || cooldown > 0) return
    setResending(true)
    setResendMsg(null)
    try {
      await authService.resendVerification(rawEmail)
      setNotSent(false)
      setResendMsg({ ok: true, text: 'A new verification link was sent. Check your inbox and spam folder.' })
      setCooldown(RESEND_COOLDOWN)
      const timer = setInterval(() => setCooldown(c => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      }), 1000)
    } catch (err) {
      setResendMsg({ ok: false, text: err.message || 'The email could not be sent. Please try again later.' })
    } finally {
      setResending(false)
    }
  }

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
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}
          >
            <Mail size={28} style={{ color: '#c9a84c' }} />
          </div>

          <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
            {notSent ? 'Almost there' : 'Check your inbox'}
          </h1>

          {notSent && (
            <div className="rounded-xl p-3 mb-4 text-left flex gap-2"
              style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertTriangle size={15} className="shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
              <p className="text-xs" style={{ color: '#dc2626', lineHeight: '1.5' }}>
                Your registration was saved, but the verification email could not be sent. Use
                <strong> Resend verification email</strong> below, or ask your subject teacher to check the system's email settings.
              </p>
            </div>
          )}

          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {notSent ? 'The verification link goes to' : 'We sent a verification link to'}
          </p>
          <p className="font-semibold text-sm mb-5" style={{ color: '#c9a84c' }}>
            {email}
          </p>

          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Click the <strong style={{ color: 'var(--text-primary)' }}>Verify Email Address</strong> button in the email. The link expires in 24 hours.
          </p>

          <div
            className="rounded-xl p-4 mb-4 text-left"
            style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)' }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Then wait for approval</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
              An administrator checks your Student ID against your section's class list before you can sign in.
              You will get an email when it is approved. Registrations not approved within 3 days are removed.
            </p>
          </div>

          <div
            className="rounded-xl p-4 mb-6 text-left"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Didn't receive the email?</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Check your spam or junk folder, or the Promotions tab in Gmail. It can take a few minutes to arrive.
            </p>
            {rawEmail && (
              <button type="button" onClick={handleResend} disabled={resending || cooldown > 0}
                className="btn-secondary text-xs w-full flex items-center justify-center gap-1.5">
                <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                {resending ? 'Sending…' : cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
              </button>
            )}
            {resendMsg && (
              <p className="text-xs mt-2" style={{ color: resendMsg.ok ? '#16a34a' : '#dc2626', lineHeight: '1.5' }}>
                {resendMsg.text}
              </p>
            )}
          </div>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
