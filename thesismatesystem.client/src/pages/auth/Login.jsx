import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, GraduationCap, BookOpen, ArrowRight, Sparkles } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a1628 0%, #12213a 40%, #1e3350 100%)' }}
      >
        {/* Background decorative circles */}
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #c9a84c 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #c9a84c 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #c9a84c 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #d4b565 100%)' }}
            >
              <GraduationCap size={22} style={{ color: '#0a1628' }} />
            </div>
            <div>
              <p className="text-white font-display text-xl font-semibold">ThesisMate</p>
              <p style={{ color: '#c9a84c', fontSize: '11px', letterSpacing: '0.1em' }}>PSU LINGAYEN</p>
            </div>
          </div>
        </div>

        {/* Center quote */}
        <div className="relative z-10">
          <div className="mb-6">
            <Sparkles size={20} style={{ color: '#c9a84c', opacity: 0.7 }} className="mb-4" />
            <blockquote
              className="font-display text-3xl font-medium leading-snug"
              style={{ color: '#e2d5b8', letterSpacing: '-0.5px' }}
            >
              "Every great thesis begins with a single, well-documented step."
            </blockquote>
            <p className="mt-4 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              — ThesisMate Capstone Monitoring System
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { label: 'Active Groups', value: '42' },
              { label: 'Defenses Rated', value: '128' },
              { label: 'Chapters Approved', value: '310' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-display text-2xl font-semibold" style={{ color: '#c9a84c' }}>{stat.value}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <BookOpen size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Pangasinan State University — Lingayen Campus
            </p>
          </div>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.18)' }}>
            BSIT Capstone Management System · AY 2024–2025
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12" style={{ background: 'var(--bg-page)' }}>
        <div className="w-full max-w-[400px] animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #d4b565 100%)' }}
            >
              <GraduationCap size={16} style={{ color: '#0a1628' }} />
            </div>
            <span className="font-display text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>ThesisMate</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-semibold mb-2" style={{ color: 'var(--text-heading)', letterSpacing: '-0.8px' }}>
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Sign in to continue to your ThesisMate dashboard.
            </p>
          </div>

          {error && (
            <div
              className="mb-5 px-4 py-3 rounded-xl text-sm flex items-start gap-2"
              style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
            >
              <span className="mt-0.5">⚠</span>
              <span>{error}</span>
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
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Password
                </label>
                <a href="#" className="text-xs font-medium" style={{ color: '#c9a84c' }}>
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input pr-11"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 h-11"
              style={{ fontSize: '15px' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold" style={{ color: '#c9a84c' }}>
              Register here
            </Link>
          </p>

          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--border-main)' }}>
            <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
              ThesisMate v1.0 · BSIT Capstone Monitoring System<br />
              Pangasinan State University Lingayen
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
