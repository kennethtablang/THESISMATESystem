import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  Eye, EyeOff, ArrowRight, ArrowLeft,
  User, Mail, IdCard, Lock, CheckCircle2, AlertCircle,
} from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'

const STEPS = [
  { num: 1, label: 'Create account',    sub: 'Fill in your account details'  },
  { num: 2, label: 'Verify email',       sub: 'Check your inbox for a link'   },
  { num: 3, label: 'Start your journey', sub: 'Join your group and adviser'   },
]

const PARTICLES = [
  { left: '8%',  size: 2.5, delay: '0s',   dur: '10s' },
  { left: '22%', size: 2,   delay: '2s',   dur: '12s' },
  { left: '42%', size: 3.5, delay: '1.2s', dur: '9s'  },
  { left: '60%', size: 2,   delay: '3.8s', dur: '11s' },
  { left: '75%', size: 3,   delay: '1.5s', dur: '13s' },
  { left: '88%', size: 2,   delay: '0.8s', dur: '10s' },
]

const BUBBLES = [
  { left: '4%',  size: 6,  delay: '0s',   dur: '45s' },
  { left: '16%', size: 11, delay: '3.5s', dur: '57s' },
  { left: '28%', size: 5,  delay: '1.8s', dur: '39s' },
  { left: '41%', size: 14, delay: '6s',   dur: '63s' },
  { left: '55%', size: 8,  delay: '2.2s', dur: '48s' },
  { left: '67%', size: 16, delay: '4s',   dur: '69s' },
  { left: '78%', size: 5,  delay: '7.5s', dur: '42s' },
  { left: '87%', size: 10, delay: '1s',   dur: '54s' },
  { left: '95%', size: 7,  delay: '5.5s', dur: '51s' },
]

function StrengthBar({ password }) {
  const { score, label, color } = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' }
    let s = 0
    if (password.length >= 8) s++
    if (/[A-Z]/.test(password)) s++
    if (/[0-9]/.test(password)) s++
    if (password.length >= 12) s++
    const levels = [
      { label: 'Too short', color: '#ef4444' },
      { label: 'Weak',      color: '#f97316' },
      { label: 'Fair',      color: '#eab308' },
      { label: 'Good',      color: '#22c55e' },
      { label: 'Strong',    color: '#16a34a' },
    ]
    return { score: s, ...levels[s] }
  }, [password])

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? color : 'var(--border-main)' }} />
        ))}
      </div>
      <p className="text-xs" style={{ color }}>{label}</p>
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', password: '', confirmPassword: '', studentId: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState('')
  const [errorKey, setErrorKey] = useState(0)

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function triggerError(msg) {
    setError(msg)
    setErrorKey(k => k + 1)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { triggerError('Passwords do not match.'); return }
    if (form.password.length < 8) { triggerError('Password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(form.password)) { triggerError('Password must contain at least one uppercase letter.'); return }
    if (!/[0-9]/.test(form.password)) { triggerError('Password must contain at least one number.'); return }
    setLoading(true)
    try {
      await register({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || undefined,
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: 'Student',
      })
      navigate(`/check-email?email=${encodeURIComponent(form.email.trim())}`)
    } catch (err) {
      triggerError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const iconColor = (field) => ({
    color: focused === field ? '#c9a84c' : 'var(--text-muted)',
    transition: 'color 0.2s',
  })

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ───────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col w-[440px] shrink-0 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #04090f 0%, #0a1628 40%, #0d1d34 100%)' }}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(201,168,76,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.06) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }} />

        {/* Rising particles — tiny dots */}
        {PARTICLES.map((p, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            left: p.left, bottom: 0, width: p.size, height: p.size,
            background: '#c9a84c',
            animation: `auth-particle-rise ${p.dur} ease-in ${p.delay} infinite backwards`,
          }} />
        ))}

        {/* Rising bubbles — gold rings */}
        {BUBBLES.map((b, i) => (
          <div key={i} className="absolute rounded-full pointer-events-none" style={{
            left: b.left, bottom: 0, width: b.size, height: b.size,
            background: 'rgba(201,168,76,0.03)',
            border: '1px solid rgba(201,168,76,0.18)',
            boxShadow: '0 0 4px rgba(201,168,76,0.06)',
            animation: `auth-bubble-float ${b.dur} ease-in ${b.delay} infinite backwards`,
          }} />
        ))}

        {/* Orb 1 — top-right */}
        <div className="absolute -top-32 right-0 w-96 h-96 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 65%)',
          transform: 'translateX(35%)',
          animation: 'auth-orb-drift 13s ease-in-out infinite',
        }} />
        {/* Orb 2 — bottom-left */}
        <div className="absolute w-80 h-80 rounded-full pointer-events-none" style={{
          bottom: 0, left: 0, transform: 'translate(-30%, 30%)',
          background: 'radial-gradient(circle, rgba(10,22,40,0.9) 0%, transparent 70%)',
          animation: 'auth-orb-drift-alt 17s ease-in-out infinite',
        }} />
        {/* Orb 3 — mid accent */}
        <div className="absolute w-56 h-56 rounded-full pointer-events-none" style={{
          top: '50%', left: '30%', transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%)',
          animation: 'auth-orb-drift 20s ease-in-out infinite reverse',
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10">

          {/* Logo */}
          <div className="flex items-center gap-3" style={{ animation: 'auth-fade-up 0.5s ease both' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fff' }}>
              <img src={logo} alt="ThesisMate" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <p className="font-display font-bold text-white" style={{ fontSize: '16px', lineHeight: 1 }}>ThesisMate</p>
              <p style={{ color: '#c9a84c', fontSize: '9.5px', letterSpacing: '0.14em', marginTop: 3 }}>PSU LINGAYEN</p>
            </div>
          </div>

          {/* Hero */}
          <div className="mt-12 mb-8" style={{ animation: 'auth-fade-up 0.55s 0.1s ease both' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5" style={{
              background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.22)',
            }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#c9a84c', animation: 'auth-dot-pulse 2s ease-in-out infinite' }} />
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(201,168,76,0.9)' }}>
                Student Registration
              </span>
            </div>
            <h2 className="font-display font-bold leading-tight" style={{ color: '#fff', fontSize: '2.4rem', letterSpacing: '-1px' }}>
              Join the<br />
              <span style={{ color: '#c9a84c' }}>ThesisMate</span><br />
              community.
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Create your student account and connect with your adviser, group, and faculty coordinator.
            </p>
          </div>

          {/* Steps with connector lines */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.28)' }}>
              Getting started
            </p>
            {STEPS.map((step, idx) => (
              <div key={step.num} className="flex items-start gap-3.5" style={{ animation: `auth-fade-right 0.5s ${0.3 + idx * 0.12}s ease both` }}>
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={idx === 0
                      ? { background: '#c9a84c', color: '#0a1628', boxShadow: '0 0 14px rgba(201,168,76,0.4)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)' }
                    }
                  >
                    {step.num}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className="absolute left-1/2 -translate-x-1/2" style={{
                      top: '100%', marginTop: '4px', width: '1px', height: '22px',
                      background: idx === 0
                        ? 'linear-gradient(to bottom, rgba(201,168,76,0.45), rgba(201,168,76,0.05))'
                        : 'rgba(255,255,255,0.07)',
                    }} />
                  )}
                </div>
                <div className={idx < STEPS.length - 1 ? 'pb-8' : ''}>
                  <p className="text-sm font-medium" style={{ color: idx === 0 ? '#fff' : 'rgba(255,255,255,0.28)' }}>
                    {step.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: idx === 0 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.18)' }}>
                    {step.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex-1" />

          {/* Footer */}
          <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', animation: 'auth-fade-up 0.5s 0.7s ease both' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Pangasinan State University — Lingayen Campus<br />
              BSIT Capstone Management System · AY 2024–2025
            </p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div
        className="flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto relative"
        style={{ background: 'var(--bg-page)' }}
      >
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none" style={{
          background: 'radial-gradient(circle at top right, rgba(201,168,76,0.05) 0%, transparent 65%)',
        }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 pointer-events-none" style={{
          background: 'radial-gradient(circle at bottom left, rgba(201,168,76,0.03) 0%, transparent 65%)',
        }} />

        <div className="w-full max-w-[460px] animate-slide-up relative z-10">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fff' }}>
              <img src={logo} alt="ThesisMate" className="w-7 h-7 object-contain" />
            </div>
            <div>
              <p className="font-display font-bold" style={{ color: 'var(--text-heading)', fontSize: '15px' }}>ThesisMate</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '9.5px', letterSpacing: '0.1em' }}>PSU LINGAYEN</p>
            </div>
          </div>

          {/* Form card */}
          <div className="rounded-2xl p-8" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            boxShadow: '0 4px 32px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)',
          }}>

            {/* Heading */}
            <div className="mb-6" style={{ animation: 'auth-fade-up 0.4s ease both' }}>
              <h1 className="font-display font-bold mb-1.5" style={{ color: 'var(--text-heading)', fontSize: '1.85rem', letterSpacing: '-0.7px' }}>
                Create your account
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Fill in the details below to register as a student.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                key={errorKey}
                className="mb-5 px-4 py-3 rounded-xl text-sm flex items-start gap-2.5 auth-error-shake"
                style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* ── Personal information ── */}
              <div className="mb-5" style={{ animation: 'auth-fade-up 0.4s 0.05s ease both' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#c9a84c', opacity: 0.85 }}>
                  Personal information
                </p>
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>First name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                          <User size={14} style={iconColor('firstName')} />
                        </div>
                        <input type="text" className="form-input pl-9" placeholder="Juan"
                          value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                          onFocus={() => setFocused('firstName')} onBlur={() => setFocused('')}
                          required autoFocus />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Last name</label>
                      <input type="text" className="form-input" placeholder="dela Cruz"
                        value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                        onFocus={() => setFocused('lastName')} onBlur={() => setFocused('')}
                        required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Middle name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input type="text" className="form-input" placeholder="Santos"
                      value={form.middleName} onChange={(e) => set('middleName', e.target.value)}
                      onFocus={() => setFocused('middleName')} onBlur={() => setFocused('')} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                      Student ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <IdCard size={14} style={iconColor('studentId')} />
                      </div>
                      <input type="text" className="form-input pl-9" placeholder="2021-12345"
                        value={form.studentId} onChange={(e) => set('studentId', e.target.value)}
                        onFocus={() => setFocused('studentId')} onBlur={() => setFocused('')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--border-main)' }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>credentials</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border-main)' }} />
              </div>

              {/* ── Account credentials ── */}
              <div className="mb-6" style={{ animation: 'auth-fade-up 0.4s 0.1s ease both' }}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#c9a84c', opacity: 0.85 }}>
                  Account credentials
                </p>
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Email address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Mail size={14} style={iconColor('email')} />
                      </div>
                      <input type="email" className="form-input pl-9" placeholder="you@psu.edu.ph"
                        value={form.email} onChange={(e) => set('email', e.target.value)}
                        onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                        required />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Lock size={14} style={iconColor('password')} />
                      </div>
                      <input
                        type={showPass ? 'text' : 'password'} className="form-input pl-9 pr-11"
                        placeholder="Min. 8 chars, 1 uppercase, 1 number"
                        value={form.password} onChange={(e) => set('password', e.target.value)}
                        onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                        required />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3.5"
                        style={{ color: 'var(--text-muted)' }}>
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <StrengthBar password={form.password} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Confirm password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                        <Lock size={14} style={iconColor('confirmPassword')} />
                      </div>
                      <input
                        type={showPass ? 'text' : 'password'} className="form-input pl-9 pr-10"
                        placeholder="Re-enter your password"
                        value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)}
                        onFocus={() => setFocused('confirmPassword')} onBlur={() => setFocused('')}
                        required />
                      {form.confirmPassword && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none">
                          <CheckCircle2 size={15} style={{ color: form.confirmPassword === form.password ? '#22c55e' : '#ef4444' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div style={{ animation: 'auth-fade-up 0.4s 0.15s ease both' }}>
                <button type="submit" disabled={loading}
                  className="btn-primary auth-btn-shimmer w-full"
                  style={{ height: '48px', fontSize: '15px' }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Create account <ArrowRight size={16} />
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Below-card links */}
          <div className="mt-6 text-center" style={{ animation: 'auth-fade-up 0.4s 0.2s ease both' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-semibold inline-flex items-center gap-1 hover:underline" style={{ color: '#c9a84c' }}>
                <ArrowLeft size={13} /> Sign in
              </Link>
            </p>
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ThesisMate v1.0 · PSU Lingayen BSIT Capstone System
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
