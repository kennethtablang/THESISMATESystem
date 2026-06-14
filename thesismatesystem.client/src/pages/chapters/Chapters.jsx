import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { groupService, chapterService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusLabel, statusVariant } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { FileText, Plus, Upload, Eye, MessageSquare, CheckCircle, XCircle } from 'lucide-react'

const CHAPTER_LABELS = [
  'Chapter 1 — Introduction',
  'Chapter 2 — Review of Related Literature',
  'Chapter 3 — Research Methodology',
  'Chapter 4 — Results and Discussion',
  'Chapter 5 — Conclusion and Recommendations',
]

export default function Chapters() {
  const { user } = useAuth()
  const [chapters, setChapters] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [reviewForm, setReviewForm] = useState({ status: 'Approved', note: '' })
  const [saving, setSaving] = useState(false)

  const isAdviser = user?.role === 'Adviser'
  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)
  const isStudent = user?.role === 'Student'

  useEffect(() => {
    groupService.myGroup()
      .then((group) => {
        if (group?.id) return chapterService.listByGroup(group.id)
        return []
      })
      .then((data) => setChapters(data ?? []))
      .catch(() => setChapters([]))
      .finally(() => setLoading(false))
  }, [])

  const title = isAdviser ? 'Review Submissions' : isAdmin ? 'Chapter Submissions' : 'My Chapters'

  if (loading) return <><TopBar title={title} /><PageLoader /></>

  return (
    <div>
      <TopBar
        title={title}
        subtitle={isStudent ? `${chapters.length} chapters` : `${chapters.filter(c => c.status === 'Submitted').length} awaiting review`}
      />
      <div className="p-8">
        {isStudent && (
          <div className="flex justify-end mb-6">
            <button className="btn-primary" onClick={() => setShowSubmit(true)}>
              <Upload size={15} /> Submit Chapter
            </button>
          </div>
        )}

        {isStudent ? (
          <div className="space-y-3">
            {chapters.map((c) => (
              <StudentChapterRow key={c.id} chapter={c} onView={() => setSelected(c)} />
            ))}
          </div>
        ) : chapters.length === 0 ? (
          <EmptyState icon={FileText} title="No chapter submissions" description="Chapter submissions from students will appear here." />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Group</th>
                  {(isAdviser || isAdmin) && <th>Student</th>}
                  <th>Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {chapters.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium" style={{ color: 'var(--text-heading)' }}>Chapter {c.chapterNumber}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.title}</p>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{c.groupName}</td>
                    {(isAdviser || isAdmin) && <td style={{ color: 'var(--text-secondary)' }}>{c.studentName ?? '—'}</td>}
                    <td style={{ color: 'var(--text-secondary)' }}>{c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td><Badge variant={statusVariant(c.status)} size="sm">{statusLabel(c.status)}</Badge></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button className="btn-ghost text-xs" onClick={() => setSelected(c)}>
                          <Eye size={13} /> View
                        </button>
                        {(isAdviser || isAdmin) && c.status === 'Submitted' && (
                          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => { setSelected(c); setShowReview(true) }}>
                            Review
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Modal */}
      <Modal
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        title="Submit Chapter"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowSubmit(false)}>Cancel</button>
            <button className="btn-primary" disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Chapter</label>
            <select className="form-input">
              {CHAPTER_LABELS.map((l, i) => (
                <option key={i} value={i + 1}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Upload File</label>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-all"
              style={{ borderColor: '#e8e1d0' }}
            >
              <Upload size={24} className="mx-auto mb-2" style={{ color: '#c9a84c' }} />
              <p className="text-sm font-medium mb-1" style={{ color: '#374151' }}>Click to upload or drag and drop</p>
              <p className="text-xs" style={{ color: '#9ca3af' }}>PDF, DOCX up to 50MB</p>
              <input type="file" className="hidden" accept=".pdf,.docx" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Notes (optional)</label>
            <textarea className="form-input resize-none" rows={3} placeholder="Any notes for your adviser..." />
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        open={showReview && !!selected}
        onClose={() => { setShowReview(false); setSelected(null) }}
        title={`Review: Chapter ${selected?.chapterNumber} — ${selected?.groupName}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowReview(false); setSelected(null) }}>Cancel</button>
            <button className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Submit Review'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>Decision</label>
            <div className="flex gap-3">
              {[
                { v: 'Approved', icon: CheckCircle, color: '#16a34a', bg: '#d1fae5' },
                { v: 'NeedsRevision', icon: MessageSquare, color: '#d97706', bg: '#fef3c7' },
                { v: 'Rejected', icon: XCircle, color: '#dc2626', bg: '#fee2e2' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setReviewForm({ ...reviewForm, status: opt.v })}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all"
                  style={
                    reviewForm.status === opt.v
                      ? { background: opt.bg, borderColor: opt.color, color: opt.color }
                      : { background: '#faf8f3', borderColor: '#e8e1d0', color: '#6b7280' }
                  }
                >
                  <opt.icon size={16} />
                  {opt.v === 'NeedsRevision' ? 'Needs Revision' : opt.v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>
              {reviewForm.status === 'Approved' ? 'Feedback (optional)' : 'Revision Notes *'}
            </label>
            <textarea
              className="form-input resize-none"
              rows={4}
              placeholder={reviewForm.status === 'NeedsRevision' ? 'Describe what needs to be revised...' : 'Add any comments or feedback...'}
              value={reviewForm.note}
              onChange={(e) => setReviewForm({ ...reviewForm, note: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function StudentChapterRow({ chapter, onView }) {
  const isSubmitted = !!chapter.submittedAt

  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4 transition-all duration-150 cursor-pointer"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      onClick={onView}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-lg shrink-0"
        style={{
          background: chapter.status === 'Approved' ? '#d1fae5' : chapter.status === 'NeedsRevision' ? '#fff7ed' : 'var(--bg-subtle)',
          color: chapter.status === 'Approved' ? '#16a34a' : chapter.status === 'NeedsRevision' ? '#ea580c' : '#c9a84c',
        }}
      >
        {chapter.chapterNumber}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>
            Chapter {chapter.chapterNumber} — {chapter.title}
          </p>
          <Badge variant={statusVariant(chapter.status)} size="sm">{statusLabel(chapter.status)}</Badge>
        </div>
        {chapter.submittedAt && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Submitted {new Date(chapter.submittedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {chapter.adviserNote && (
          <div className="mt-3 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--text-primary)' }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#c9a84c' }}>Adviser Note:</p>
            {chapter.adviserNote}
          </div>
        )}
      </div>
    </div>
  )
}
