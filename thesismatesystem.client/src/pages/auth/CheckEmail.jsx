import { useSearchParams, Link } from 'react-router-dom'
import { GraduationCap, Mail, ArrowLeft } from 'lucide-react'

export default function CheckEmail() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? 'your email'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-[480px] animate-slide-up">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #d4b565 100%)' }}
          >
            <GraduationCap size={20} style={{ color: '#0a1628' }} />
          </div>
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
            Check your inbox
          </h1>

          <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            We sent a verification link to
          </p>
          <p className="font-semibold text-sm mb-5" style={{ color: '#c9a84c' }}>
            {email}
          </p>

          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Click the <strong style={{ color: 'var(--text-primary)' }}>Verify Email Address</strong> button in the email to activate your account. The link expires in 24 hours.
          </p>

          <div
            className="rounded-xl p-4 mb-6 text-left"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Didn't receive the email?</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Check your spam or junk folder. If you still can't find it, contact your system administrator.
            </p>
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
