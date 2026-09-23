import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { authService, sectionService } from '../../services/api'
import { passwordError } from '../../utils/passwordPolicy'
import { toast } from '../../utils/toast'

const EMPTY = {
  firstName: '', middleName: '', lastName: '', email: '',
  password: '', role: 'Faculty', sectionIds: [],
}

// SuperAdmin-only, and staff-only: the SuperAdmin creates Admin/subject teacher and Faculty
// accounts and nothing else. Students self-register and are approved by their block's Admin.
// Accounts made here skip email verification because the SuperAdmin is vouching for them;
// share the temporary password with the person directly.
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
  const isAdmin = form.role === 'Admin'

  function toggleSection(id) {
    setForm(f => ({
      ...f,
      sectionIds: f.sectionIds.includes(id) ? f.sectionIds.filter(x => x !== id) : [...f.sectionIds, id],
    }))
  }

  async function submit() {
    setError('')
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) { setError('Name and email are required.'); return }
    const pw = passwordError(form.password)
    if (pw) { setError(pw); return }
    // Without a block the Admin has no registrations to review, so it is required whenever
    // blocks exist at all.
    if (isAdmin && sections.length > 0 && form.sectionIds.length === 0) {
      setError('Pick at least one block for this Admin/subject teacher to handle.'); return
    }

    setSaving(true)
    try {
      const created = await authService.createUser({
        firstName: form.firstName.trim(),
        middleName: form.middleName.trim() || null,
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        sectionIds: isAdmin ? form.sectionIds : [],
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
            <option value="Admin">Admin / Subject teacher</option>
          </select>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
            Students register themselves and are approved by their block&apos;s Admin.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>{label('First name *')}<input className="form-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} /></div>
          <div>{label('Last name *')}<input className="form-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} /></div>
        </div>
        <div>{label('Middle name')}<input className="form-input" value={form.middleName} onChange={e => set('middleName', e.target.value)} /></div>
        <div>{label('Email *')}<input type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        {isAdmin && (
          <div>
            {label('Blocks handled *')}
            {sections.length === 0 ? (
              <p className="text-sm px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                No blocks exist yet. Create the account now, then assign blocks from the user list
                once an Admin has added them.
              </p>
            ) : (
              <>
                <div className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--border-light)', maxHeight: 180, overflowY: 'auto' }}>
                  {sections.map((s, idx) => (
                    <div key={s.id} className="flex items-center gap-3 px-3 py-2"
                      style={{ borderBottom: idx < sections.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                      <input type="checkbox" id={`block-${s.id}`}
                        checked={form.sectionIds.includes(s.id)} onChange={() => toggleSection(s.id)} />
                      <label htmlFor={`block-${s.id}`} className="flex-1 min-w-0 text-sm truncate cursor-pointer"
                        style={{ color: 'var(--text-primary)' }}>
                        {s.name} · {s.academicYear}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  This Admin reviews the student registrations for the blocks ticked here.
                </p>
              </>
            )}
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
