import clsx from 'clsx'

const variants = {
  pending: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  submitted: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  under_review: { bg: '#ede9fe', text: '#5b21b6', border: '#ddd6fe' },
  approved: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' },
  revision: { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  scheduled: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd' },
  completed: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  cancelled: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  active: { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' },
  inactive: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
  gold: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
}

const sizeStyles = {
  sm: { fontSize: '11px', padding: '2px 8px', borderRadius: '6px' },
  md: { fontSize: '12px', padding: '3px 10px', borderRadius: '8px' },
}

export default function Badge({ variant = 'pending', size = 'md', children, className }) {
  const style = variants[variant] ?? variants.pending
  const sizeStyle = sizeStyles[size]

  return (
    <span
      className={clsx('inline-flex items-center gap-1 font-semibold border', className)}
      style={{
        background: style.bg,
        color: style.text,
        borderColor: style.border,
        ...sizeStyle,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: style.text, opacity: 0.6 }}
      />
      {children}
    </span>
  )
}

export function statusLabel(status) {
  const labels = {
    PendingReview: 'Pending Review',
    UnderRevision: 'Needs Revision',
    Approved: 'Approved',
    Pending: 'Pending',
    Submitted: 'Submitted',
    UnderReview: 'Under Review',
    NeedsRevision: 'Needs Revision',
    Scheduled: 'Scheduled',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
    Active: 'Active',
    Archived: 'Archived',
  }
  return labels[status] ?? status
}

export function statusVariant(status) {
  const map = {
    PendingReview: 'pending',
    UnderRevision: 'revision',
    Approved: 'approved',
    Pending: 'pending',
    Submitted: 'submitted',
    UnderReview: 'under_review',
    NeedsRevision: 'revision',
    Scheduled: 'scheduled',
    Completed: 'completed',
    Cancelled: 'cancelled',
    Active: 'active',
    Archived: 'inactive',
  }
  return map[status] ?? 'pending'
}
