// Pickers shared by the create/edit group forms: panel members (with a chair) and students.

function Box({ children }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-light)', maxHeight: 220, overflowY: 'auto' }}>
      {children}
    </div>
  )
}

/**
 * Faculty checklist with a chair radio. The adviser is excluded because they cannot sit on
 * their own group's panel.
 */
export function PanelPicker({ faculty, adviserId, value, chairId, onChange }) {
  const options = faculty.filter(f => f.id !== adviserId)

  function toggle(id) {
    const next = value.includes(id) ? value.filter(x => x !== id) : [...value, id]
    const nextChair = next.includes(chairId) ? chairId : next[0] ?? ''
    onChange(next, nextChair)
  }

  return (
    <Box>
      {options.length === 0 ? (
        <p className="px-4 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>No other faculty available.</p>
      ) : options.map((f, idx) => {
        const checked = value.includes(f.id)
        return (
          <div key={f.id} className="flex items-center gap-3 px-3 py-2"
            style={{ borderBottom: idx < options.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
            <input type="checkbox" id={`panel-${f.id}`} checked={checked} onChange={() => toggle(f.id)} />
            <label htmlFor={`panel-${f.id}`} className="flex-1 min-w-0 text-sm truncate cursor-pointer" style={{ color: 'var(--text-primary)' }}>
              {f.fullName}
            </label>
            {checked && (
              <label className="flex items-center gap-1 text-xs shrink-0 cursor-pointer" style={{ color: chairId === f.id ? '#c9a84c' : 'var(--text-muted)' }}>
                <input type="radio" name="panel-chair" checked={chairId === f.id} onChange={() => onChange(value, f.id)} />
                Chair
              </label>
            )}
          </div>
        )
      })}
    </Box>
  )
}

/**
 * Student checklist. Students already in another active group are shown but disabled, so the
 * Admin sees why someone cannot be picked instead of the server rejecting the whole form.
 */
export function StudentPicker({ students, value, onChange, currentGroupId }) {
  return (
    <Box>
      {students.length === 0 ? (
        <p className="px-4 py-4 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
          No enrolled students in this section.
        </p>
      ) : students.map((s, idx) => {
        const taken = s.activeGroupId && s.activeGroupId !== currentGroupId
        return (
          <label key={s.id} className="flex items-center gap-3 px-3 py-2"
            style={{
              borderBottom: idx < students.length - 1 ? '1px solid var(--border-light)' : 'none',
              opacity: taken ? 0.5 : 1, cursor: taken ? 'not-allowed' : 'pointer',
            }}>
            <input type="checkbox" disabled={taken} checked={value.includes(s.id)}
              onChange={() => onChange(value.includes(s.id) ? value.filter(x => x !== s.id) : [...value, s.id])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{s.fullName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {s.studentId ? `ID: ${s.studentId}` : s.email}
                {taken ? ` · in ${s.activeGroupName}` : ''}
              </p>
            </div>
          </label>
        )
      })}
    </Box>
  )
}
