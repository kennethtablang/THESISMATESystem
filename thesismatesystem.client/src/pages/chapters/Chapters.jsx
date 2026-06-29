import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { groupService, chapterService, documentService } from '../../services/api'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusLabel, statusVariant } from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import { FileText, Upload, Eye, MessageSquare, CheckCircle, Download, History, FileUp } from 'lucide-react'
import { toast } from '../../utils/toast'

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
  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [submitForm, setSubmitForm] = useState({ chapterNumber: 1, file: null })
  const [reviewForm, setReviewForm] = useState({ status: 'Approved', note: '' })
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [chapterHistory, setChapterHistory] = useState([])
  const [finalizingChapter, setFinalizingChapter] = useState(null)
  const fileRef = useRef()

  const isAdviser = user?.role === 'Faculty'
  const isAdmin = ['Admin', 'SuperAdmin'].includes(user?.role)
  const isStudent = user?.role === 'Student'

  useEffect(() => {
    if (isStudent) {
      groupService.myGroup()
        .then((g) => {
          setGroup(g)
          if (g?.id) return chapterService.listByGroup(g.id)
          return []
        })
        .then((data) => setChapters(data ?? []))
        .catch(() => setChapters([]))
        .finally(() => setLoading(false))
    } else if (isAdmin || isAdviser) {
      groupService.list()
        .then(async (groups) => {
          const results = await Promise.all(
            groups.map(g =>
              chapterService.listByGroup(g.id)
                .then(chs => chs.map(c => ({ ...c, groupName: g.groupName })))
                .catch(() => [])
            )
          )
          return results.flat()
        })
        .then(setChapters)
        .catch(() => setChapters([]))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [isStudent, isAdmin, isAdviser])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!submitForm.file || !group?.id) return
    setSubmitError('')
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('ChapterNumber', submitForm.chapterNumber)
      fd.append('File', submitForm.file)
      const chapter = await chapterService.submit(group.id, fd)
      setChapters(prev => {
        const idx = prev.findIndex(c => c.chapterNumber === chapter.chapterNumber)
        if (idx >= 0) {
          const updated = [...prev]
          updated[idx] = chapter
          return updated
        }
        return [...prev, chapter].sort((a, b) => a.chapterNumber - b.chapterNumber)
      })
      setSubmitForm({ chapterNumber: 1, file: null })
      if (fileRef.current) fileRef.current.value = ''
      setShowSubmit(false)
      toast.success('Chapter submitted.')
    } catch (err) {
      setSubmitError(err.message)
      toast.error(err.message || 'Failed to submit chapter.')
    } finally {
      setSaving(false)
    }
  }

  async function handleReview(e) {
    e.preventDefault()
    if (!selected) return
    if (reviewForm.status === 'UnderRevision' && !reviewForm.note.trim()) {
      setReviewError('Please provide revision notes so the student knows what to fix.')
      return
    }
    setSaving(true)
    setReviewError('')
    try {
      const groupId = selected.capstoneGroupId
      await chapterService.updateStatus(groupId, selected.id, { status: reviewForm.status })
      if (reviewForm.note.trim()) {
        await chapterService.addRevisionNote(groupId, selected.id, { notes: reviewForm.note.trim() })
      }
      const refreshed = await chapterService.listByGroup(groupId)
        .then(chs => chs.map(c => ({ ...c, groupName: selected.groupName })))
      setChapters(prev => {
        const others = prev.filter(c => c.capstoneGroupId !== groupId)
        return [...others, ...refreshed].sort((a, b) => {
          if (a.groupName !== b.groupName) return (a.groupName ?? '').localeCompare(b.groupName ?? '')
          return a.chapterNumber - b.chapterNumber
        })
      })
      setShowReview(false)
      setSelected(null)
      setReviewForm({ status: 'Approved', note: '' })
      toast.success('Review submitted.')
    } catch (err) {
      setReviewError(err.message)
      toast.error(err.message || 'Failed to submit review.')
    } finally {
      setSaving(false)
    }
  }

  async function openView(c) {
    setSelected(c)
    setChapterHistory([])
    try {
      const gid = c.capstoneGroupId ?? group?.id
      if (gid) {
        const history = await chapterService.history(gid, c.chapterNumber)
        setChapterHistory(history ?? [])
      }
    } catch {
      // ignore — history is optional
    }
  }

  async function handleFinalize(chapter) {
    if (!group?.id || finalizingChapter) return
    setFinalizingChapter(chapter.chapterNumber)
    try {
      await documentService.finalizeChapter(group.id, chapter.chapterNumber)
      toast.success(`Chapter ${chapter.chapterNumber} sent to Upload Documents.`)
    } catch (err) {
      toast.error(err.message || 'Could not finalize chapter.')
    } finally {
      setFinalizingChapter(null)
    }
  }

  const title = isAdviser ? 'Review Submissions' : isAdmin ? 'Chapter Submissions' : 'My Chapters'

  if (loading) return <><TopBar title={title} /><PageLoader /></>

  return (
    <div>
      <TopBar
        title={title}
        subtitle={isStudent ? `${chapters.length} chapters` : `${chapters.filter(c => c.status === 'PendingReview').length} awaiting review`}
      />
      <div className="p-4 sm:p-8">
        {isStudent && (
          <div className="flex justify-end mb-6">
            <button className="btn-primary" onClick={() => { setSubmitError(''); setShowSubmit(true) }}>
              <Upload size={15} /> Submit Chapter
            </button>
          </div>
        )}

        {isStudent ? (
          chapters.length === 0 ? (
            <EmptyState icon={FileText} title="No chapters yet" description="Submit your first chapter for adviser review." />
          ) : (
            <div className="space-y-3">
              {chapters
                .slice()
                .sort((a, b) => a.chapterNumber - b.chapterNumber)
                .map((c) => (
                  <StudentChapterRow
                    key={c.id}
                    chapter={c}
                    onView={() => openView(c)}
                    onFinalize={handleFinalize}
                    finalizing={finalizingChapter === c.chapterNumber}
                  />
                ))}
            </div>
          )
        ) : chapters.length === 0 ? (
          <EmptyState icon={FileText} title="No chapter submissions" description="Chapter submissions from students will appear here." />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Chapter</th>
                  <th>Group</th>
                  <th>Student</th>
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
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{CHAPTER_LABELS[c.chapterNumber - 1]}</p>
                    </td>
                    <td style={{ color: 'var(--text-primary)' }}>{c.groupName ?? '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.submittedBy?.fullName ?? '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.submittedAt ? new Date(c.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—'}</td>
                    <td><Badge variant={statusVariant(c.status)} size="sm">{statusLabel(c.status)}</Badge></td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button className="btn-ghost text-xs" onClick={() => openView(c)}>
                          <Eye size={13} /> View
                        </button>
                        {isAdviser && c.status === 'PendingReview' && (
                          <button className="btn-primary text-xs px-3 py-1.5" onClick={() => { openView(c); setShowReview(true) }}>
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
            <button className="btn-primary" onClick={handleSubmit} disabled={saving || !submitForm.file}>
              {saving ? 'Submitting...' : 'Submit'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {submitError && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {submitError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Chapter</label>
            <select
              className="form-input"
              value={submitForm.chapterNumber}
              onChange={e => setSubmitForm(f => ({ ...f, chapterNumber: Number(e.target.value) }))}
            >
              {CHAPTER_LABELS.map((l, i) => (
                <option key={i} value={i + 1}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Upload File <span className="font-normal text-xs" style={{ color: 'var(--text-muted)' }}>(PDF, DOCX up to 50MB)</span>
            </label>
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer"
              style={{ borderColor: submitForm.file ? '#c9a84c' : 'var(--border-light)' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={24} className="mx-auto mb-2" style={{ color: '#c9a84c' }} />
              {submitForm.file ? (
                <p className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>{submitForm.file.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Click to upload or drag and drop</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>PDF, DOCX up to 50MB</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx"
                onChange={e => setSubmitForm(f => ({ ...f, file: e.target.files[0] ?? null }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        open={showReview && !!selected}
        onClose={() => { setShowReview(false); setSelected(null); setReviewForm({ status: 'Approved', note: '' }); setReviewError('') }}
        title={`Review: Chapter ${selected?.chapterNumber} — ${selected?.groupName ?? ''}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => { setShowReview(false); setSelected(null); setReviewError('') }}>Cancel</button>
            <button className="btn-primary" onClick={handleReview} disabled={saving}>
              {saving ? 'Saving...' : 'Submit Review'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {reviewError && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
              {reviewError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Decision</label>
            <div className="flex gap-3">
              {[
                { v: 'Approved', label: 'Approve', icon: CheckCircle, color: '#16a34a', activeBg: 'rgba(34,197,94,0.12)' },
                { v: 'UnderRevision', label: 'Needs Revision', icon: MessageSquare, color: '#d97706', activeBg: 'rgba(245,158,11,0.12)' },
              ].map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setReviewForm(f => ({ ...f, status: opt.v }))}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all"
                  style={
                    reviewForm.status === opt.v
                      ? { background: opt.activeBg, borderColor: opt.color, color: opt.color }
                      : { background: 'var(--bg-subtle)', borderColor: 'var(--border-light)', color: 'var(--text-muted)' }
                  }
                >
                  <opt.icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              {reviewForm.status === 'Approved' ? 'Feedback (optional)' : 'Revision Notes *'}
            </label>
            <textarea
              className="form-input resize-none"
              rows={4}
              placeholder={reviewForm.status === 'UnderRevision' ? 'Describe what needs to be revised...' : 'Add any comments or feedback...'}
              value={reviewForm.note}
              onChange={(e) => setReviewForm(f => ({ ...f, note: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        open={!!selected && !showReview}
        onClose={() => setSelected(null)}
        title={selected ? `Chapter ${selected.chapterNumber} — ${CHAPTER_LABELS[selected.chapterNumber - 1]}` : ''}
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Status</span>
              <Badge variant={statusVariant(selected.status)} size="sm">{statusLabel(selected.status)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Submitted By</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{selected.submittedBy?.fullName ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Date</span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {selected.submittedAt ? new Date(selected.submittedAt).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Version</span>
              <span className="text-sm font-medium" style={{ color: selected.version > 1 ? '#c9a84c' : 'var(--text-secondary)' }}>
                v{selected.version}{selected.version > 1 ? ' Corrected' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>File</span>
              <button onClick={() => chapterService.downloadFile(selected.id, selected.fileName)}
                className="flex items-center gap-1 text-sm"
                style={{ color: '#c9a84c', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <Download size={13} />
                {selected.fileName}
              </button>
            </div>
            {chapterHistory.length > 1 && (
              <div className="pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <p className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <History size={13} /> Version History
                </p>
                <div className="space-y-1.5">
                  {chapterHistory.map(h => (
                    <div key={h.id} className="flex items-center gap-3 rounded-xl px-3 py-2"
                      style={{ background: 'var(--bg-subtle)' }}>
                      <span className="text-xs font-bold w-14 shrink-0" style={{ color: h.version > 1 ? '#c9a84c' : 'var(--text-muted)' }}>
                        v{h.version}{h.version > 1 ? ' ✓' : ''}
                      </span>
                      <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>{h.fileName}</span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {new Date(h.submittedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                      </span>
                      <button onClick={() => chapterService.downloadFile(h.id, h.fileName)}
                        className="shrink-0 text-xs flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
                        style={{ color: '#c9a84c', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', cursor: 'pointer' }}>
                        <Download size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selected.revisionNotes?.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-light)' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>Revision Notes</p>
                <div className="space-y-2">
                  {selected.revisionNotes.map(rn => (
                    <div key={rn.id} className="px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)' }}>
                      <p className="text-xs font-semibold mb-0.5" style={{ color: '#c9a84c' }}>
                        {rn.createdBy?.fullName} • {new Date(rn.createdAt).toLocaleDateString()}
                      </p>
                      <p style={{ color: 'var(--text-primary)' }}>{rn.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function StudentChapterRow({ chapter, onView, onFinalize, finalizing }) {
  const latestNote = chapter.revisionNotes?.[chapter.revisionNotes.length - 1]

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
          background: chapter.status === 'Approved' ? 'rgba(34,197,94,0.12)' : chapter.status === 'UnderRevision' ? 'rgba(245,158,11,0.12)' : 'var(--bg-subtle)',
          color: chapter.status === 'Approved' ? '#16a34a' : chapter.status === 'UnderRevision' ? '#ea580c' : '#c9a84c',
        }}
      >
        {chapter.chapterNumber}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>
            {CHAPTER_LABELS[chapter.chapterNumber - 1] ?? `Chapter ${chapter.chapterNumber}`}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {chapter.version > 1 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                v{chapter.version} Corrected
              </span>
            )}
            <Badge variant={statusVariant(chapter.status)} size="sm">{statusLabel(chapter.status)}</Badge>
            <button
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0"
              style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
              disabled={finalizing}
              onClick={(e) => { e.stopPropagation(); onFinalize?.(chapter) }}
              title="Send this chapter to Upload Documents"
            >
              {finalizing ? (
                <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              ) : (
                <FileUp size={12} />
              )}
              {finalizing ? 'Sending...' : 'Finalize'}
            </button>
          </div>
        </div>
        {chapter.submittedAt && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Submitted {new Date(chapter.submittedAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {latestNote && (
          <div className="mt-3 px-3 py-2.5 rounded-xl text-sm" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--text-primary)' }}>
            <p className="text-xs font-semibold mb-0.5" style={{ color: '#c9a84c' }}>Adviser Note:</p>
            {latestNote.notes}
          </div>
        )}
      </div>
    </div>
  )
}
