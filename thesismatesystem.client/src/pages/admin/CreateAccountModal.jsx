import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { authService, sectionService } from '../../services/api'
import { passwordError } from '../../utils/passwordPolicy'
import { toast } from '../../utils/toast'

const EMPTY = {
  firstName: '', middleName: '', lastName: '', email: '',
  password: '', role: 'Faculty', studentId: '', sectionId: '',
}

// SuperAdmin-only. Accounts made here skip email verification and approval because the
// SuperAdmin is vouching for them; share the temporary password with the person directly.
export default function CreateAccountModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [sections, setSections] = useState([])
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(EMPTY)
    setError('')
    sectionService.options().then(list => setSections(Array.isArray(list) ? list : [])).catch(() => setSections([]))
  }, [open])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))
  const isStudent = form.role === 'Student'

  async function submit() {
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    const pw = passwordError(form.password)
    if (pw) { setError(pw); return }
    if (isStudent && (!form.studentId.trim() || !form.sectionId)) { setError('Student ID and block/section are required for students.'); return }

    setSaving(true)
    try {
      const created = await authService.createUser({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        studentId: isStudent ? form.studentId.trim() : null,
        sectionId: isStudent ? Number(form.sectionId) : null,
      })
      toast.success(`Account created for ${created.fullName}.`)
      onCreated?.(created)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create account.')
    } finally {
      setSaving(false)
    }
  }

  const label = (text) => (
    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{text}</label>
  )

  return (
    <Modal open={open} onClose={onClose} title="Create Account" size="md"
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create account'}</button>
      </>}>
      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-xl text-sm"
          style={{ background: 'rgba(220,38,38,0.07)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          {label('Role *')}
          <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="Faculty">Faculty</option>
            <option value="Admin">Admin</option>
            <option value="Student">Student</option>
            <option value="SuperAdmin">Super Admin</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>{label('First name *')}<input className="form-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
          <div>{label('Last name *')}<input className="form-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
        </div>
        <div>{label('Middle name')}<input className="form-input" value={form.middleName} onChange={e => set('middleName', e.target.value)} /></div>
        <div>{label('Email *')}<input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        {isStudent && (
          <div className="grid grid-cols-2 gap-3">
            <div>{label('Student ID *')}<input className="form-input" placeholder="2022-00123" value={form.studentId} onChange={e => set('studentId', e.target.value)} /></div>
            <div>
              {label('Block / Section *')}
              <select className="form-input" value={form.sectionId} onChange={e => set('sectionId', e.target.value)}>
                <option value="">Select</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name} · {s.academicYear}</option>)}
              </select>
            </div>
          </div>
        )}
        <div>
          {label('Temporary password *')}
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="form-input pr-10" placeholder="Min. 8 chars, 1 uppercase, 1 number"
              value={form.password} onChange={e => set('password', e.target.value)} />
            <button type="button" className="absolute inset-y-0 right-0 flex items-center pr-3" style={{ color: 'var(--text-muted)' }}
              onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            The account is active immediately. Share this password with the user and ask them to change it after signing in.
          </p>
        </div>
      </div>
    </Modal>
  )
}
