import { CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { decisionLabel } from '../../utils/documentReviews'

// Per-reviewer standing on a document (doc.reviews from the API): the adviser and each standing
// panel member approve or request a revision on their own. Reviewers who have not been asked
// yet (status null) are left out.

const STYLE = {
  Approved:      { color: '#16a34a', bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.25)',  Icon: CheckCircle },
  NeedsRevision: { color: '#d97706', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', Icon: AlertCircle },
  Pending:       { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.22)', Icon: Clock },
}

export default function ReviewerDecisions({ reviews, align = 'end', className = '' }) {
  const asked = (reviews ?? []).filter(r => r.status)
  if (asked.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${align === 'end' ? 'justify-end' : ''} ${className}`}>
      {asked.map(r => {
        const s = STYLE[r.status]
        return (
          <span key={r.reviewerId}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            title={`${r.label}: ${r.fullName}${r.reviewedVersion ? ` · v${r.reviewedVersion}` : ''}`}
            style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
            <s.Icon size={10} />
            {decisionLabel(r)}
          </span>
        )
      })}
    </div>
  )
}
