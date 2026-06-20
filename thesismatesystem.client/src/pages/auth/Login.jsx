import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, ArrowRight, Mail, Lock, FileText, Calendar, BarChart3, AlertCircle } from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'

const FEATURES = [
  { icon: FileText, title: 'Chapter Submissions', desc: 'Submit & track manuscript chapters with version history' },
  { icon: Calendar,  title: 'Defense Scheduling', desc: 'Manage defense slots, panels, and rating sheets' },
  { icon: BarChart3, title: 'Progress Monitoring', desc: 'Gantt charts, milestones, and real-time reporting' },
]

const PARTICLES = [
  { left: '10%', size: 3, delay: '0s',   dur: '9s'  },
  { left: '25%', size: 2, delay: '2.5s', dur: '11s' },
  { left: '45%', size: 4, delay: '1s',   dur: '8s'  },
  { left: '62%', size: 2, delay: '3.5s', dur: '12s' },
  { left: '78%', size: 3, delay: '1.8s', dur: '10s' },
  { left: '90%', size: 2, delay: '0.5s', dur: '13s' },
]

const BUBBLES = [
  { left: '5%',  size: 5,  delay: '0s',   dur: '42s' },
  { left: '14%', size: 10, delay: '4s',   dur: '54s' },
  { left: '26%', size: 4,  delay: '1.5s', dur: '36s' },
  { left: '38%', size: 13, delay: '6.5s', dur: '60s' },
  { left: '52%', size: 7,  delay: '2.5s', dur: '45s' },
  { left: '65%', size: 15, delay: '3.2s', dur: '66s' },
  { left: '74%', size: 5,  delay: '7s',   dur: '39s' },
  { left: '83%', size: 9,  delay: '1s',   dur: '51s' },
  { left: '93%', size: 6,  delay: '5s',   dur: '48s' },
]

const PREVIEW = [
  { label: 'Chapter 1: Introduction',       state: 'done'    },
  { label: 'Chapter 2: Literature Review',  state: 'review'  },
  { label: 'Chapter 3: Methodology',        state: 'pending' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState('')
  const [errorKey, setErrorKey] = useState(0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(form.email, form.password)
      if (res?.twoFactorRequired) {
        sessionStorage.setItem('tm_2fa_uid', res.tempUserId)
        navigate('/2fa-verify', { replace: true })
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
      setErrorKey(k => k + 1)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left branding panel ───────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col w-[480px] shrink-0 relative overflow-hidden"
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
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(201,168,76,0.18) 0%, transparent 65%)',
          animation: 'auth-orb-drift 14s ease-in-out infinite',
        }} />
        {/* Orb 2 — bottom-left */}
        <div className="absolute w-80 h-80 rounded-full pointer-events-none" style={{
          bottom: 0, left: 0, transform: 'translate(-30%, 30%)',
          background: 'radial-gradient(circle, rgba(10,22,40,0.9) 0%, transparent 70%)',
          animation: 'auth-orb-drift-alt 18s ease-in-out infinite',
        }} />
        {/* Orb 3 — mid accent */}
        <div className="absolute w-64 h-64 rounded-full pointer-events-none" style={{
          top: '50%', left: '25%', transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(201,168,76,0.07) 0%, transparent 65%)',
          animation: 'auth-orb-drift 22s ease-in-out infinite reverse',
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
                Capstone Monitoring System
              </span>
            </div>
            <h2 className="font-display font-bold leading-tight" style={{ color: '#fff', fontSize: '2.5rem', letterSpacing: '-1.1px' }}>
              Manage your<br />
              <span style={{ color: '#c9a84c' }}>thesis journey</span><br />
              with ease.
            </h2>
            <p className="mt-3.5 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
              A comprehensive platform for BSIT capstone students, advisers, and faculty coordinators.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-3.5">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="flex items-start gap-3.5" style={{ animation: `auth-fade-right 0.5s ${0.25 + i * 0.12}s ease both` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{
                  background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.18)',
                }}>
                  <Icon size={16} style={{ color: '#c9a84c' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Progress preview card */}
          <div className="mt-5 rounded-xl p-3" style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            animation: 'auth-fade-up 0.5s 0.5s ease both',
          }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full" style={{ background: '#c9a84c' }} />
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Group Alpha · AY 2024–2025</span>
              </div>
              <span style={{ fontSize: '9.5px', padding: '1px 7px', borderRadius: '9999px', background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>Active</span>
            </div>
            <div className="space-y-1.5 mb-2">
              {PREVIEW.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-2">
                  <span className="truncate" style={{
                    fontSize: '10px',
                    color: item.state === 'done' ? 'rgba(255,255,255,0.5)' : item.state === 'review' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)',
                  }}>{item.label}</span>
                  {item.state === 'done'    && <span className="shrink-0" style={{ fontSize: '10px', color: '#22c55e' }}>✓</span>}
                  {item.state === 'review'  && <span className="shrink-0" style={{ fontSize: '9.5px', color: '#c9a84c' }}>In Review</span>}
                  {item.state === 'pending' && <span className="shrink-0" style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.18)' }}>Pending</span>}
                </div>
              ))}
            </div>
            <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <div className="h-full rounded-full" style={{ width: '45%', background: 'linear-gradient(90deg, #c9a84c, #d4b565)' }} />
            </div>
            <p style={{ fontSize: '9.5px', marginTop: '5px', color: 'rgba(255,255,255,0.22)' }}>45% complete · 3 chapters remaining</p>
          </div>

          <div className="flex-1" />

          {/* Footer */}
          <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', animation: 'auth-fade-up 0.5s 0.6s ease both' }}>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.22)' }}>
              Pangasinan State University — Lingayen Campus<br />
              BSIT Capstone Management System · AY 2024–2025
            </p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto relative"
        style={{ background: 'var(--bg-page)' }}
      >
        {/* Ambient glows */}
        <div className="absolute top-0 right-0 w-96 h-96 pointer-events-none" style={{
          background: 'radial-gradient(circle at top right, rgba(201,168,76,0.05) 0%, transparent 65%)',
        }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 pointer-events-none" style={{
          background: 'radial-gradient(circle at bottom left, rgba(201,168,76,0.03) 0%, transparent 65%)',
        }} />

        <div className="w-full max-w-[420px] animate-slide-up relative z-10">

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
            <div className="mb-7" style={{ animation: 'auth-fade-up 0.4s ease both' }}>
              <h1 className="font-display font-bold mb-1.5" style={{ color: 'var(--text-heading)', fontSize: '2rem', letterSpacing: '-0.8px' }}>
                Welcome back
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px' }}>
                Sign in to continue to your dashboard
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                key={errorKey}
                className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2.5 auth-error-shake"
                style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div style={{ animation: 'auth-fade-up 0.4s 0.05s ease both' }}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Mail size={15} style={{ color: focused === 'email' ? '#c9a84c' : 'var(--text-muted)', transition: 'color 0.2s' }} />
                  </div>
                  <input
                    type="email" className="form-input pl-10" placeholder="you@psu.edu.ph"
                    value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
                    required autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ animation: 'auth-fade-up 0.4s 0.1s ease both' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Password</label>
                  <Link to="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#c9a84c' }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                    <Lock size={15} style={{ color: focused === 'password' ? '#c9a84c' : 'var(--text-muted)', transition: 'color 0.2s' }} />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'} className="form-input pl-10 pr-11"
                    placeholder="Enter your password"
                    value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
                    required
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5"
                    style={{ color: 'var(--text-muted)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <div style={{ animation: 'auth-fade-up 0.4s 0.15s ease both' }}>
                <button
                  type="submit" disabled={loading}
                  className="btn-primary auth-btn-shimmer w-full"
                  style={{ height: '48px', fontSize: '15px', marginTop: '4px' }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">Sign in <ArrowRight size={16} /></span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Below-card links */}
          <div className="mt-6 text-center" style={{ animation: 'auth-fade-up 0.4s 0.2s ease both' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: '#c9a84c' }}>Register here</Link>
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
