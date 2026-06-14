import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'
import logo from '../../assets/ThesisMate-logo.png'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter.')
      return
    }
    if (!/[0-9]/.test(form.password)) {
      setError('Password must contain at least one number.')
      return
    }
    setLoading(true)
    try {
      await register({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || undefined,
        lastName: form.lastName.trim(),
        email: form.email,
        password: form.password,
        role: 'Student',
      })
      navigate(`/check-email?email=${encodeURIComponent(form.email)}`)
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-[480px] animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <img src={logo} alt="ThesisMate" className="w-10 h-10 rounded-xl object-contain" style={{ background: '#fff' }} />
          <div>
            <p className="font-display font-semibold text-lg" style={{ color: 'var(--text-heading)' }}>ThesisMate</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.06em' }}>PSU LINGAYEN</p>
          </div>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--bg-card)', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid var(--border-main)' }}
        >
          <div className="mb-6">
            <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--text-heading)', letterSpacing: '-0.5px' }}>
              Student registration
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Create your student account to manage your capstone journey.
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>First name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Juan"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Last name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="dela Cruz"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Middle name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Santos"
                value={form.middleName}
                onChange={(e) => set('middleName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@psu.edu.ph"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Student ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="2021-12345"
                value={form.studentId}
                onChange={(e) => set('studentId', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input pr-11"
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Confirm password</label>
              <input
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                required
              />
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
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account
                  <ArrowRight size={16} />
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold inline-flex items-center gap-1" style={{ color: '#c9a84c' }}>
            <ArrowLeft size={13} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
