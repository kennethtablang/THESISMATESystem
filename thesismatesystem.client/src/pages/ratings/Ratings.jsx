import { useState, useEffect } from 'react'
import { Star, Calendar, MapPin, Users, Lock, Unlock, CheckCircle2, AlertCircle } from 'lucide-react'
import TopBar from '../../components/layout/TopBar'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/Spinner'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { defenseService } from '../../services/api'

export default function Ratings() {
  const [defenses, setDefenses] = useState([])
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(null)

  useEffect(() => {
    Promise.all([
      defenseService.mySchedules().catch(() => []),
      defenseService.criteria().catch(() => []),
    ]).then(([defs, crit]) => {
      setDefenses(defs ?? [])
      setCriteria(crit ?? [])
    }).finally(() => setLoading(false))
  }, [])

  async function openRating(defense) {
    setRating({ defense, scores: {}, comments: {}, submitting: false, error: '', loadingRatings: true })
    try {
      const existing = await defenseService.getRatings(defense.id)
      const scores = {}
      const comments = {}
      ;(existing ?? []).forEach(r => {
        scores[r.criterion.id] = r.score.toString()
        comments[r.criterion.id] = r.comments ?? ''
      })
      setRating(r => ({ ...r, scores, comments, loadingRatings: false }))
    } catch {
      setRating(r => ({ ...r, loadingRatings: false }))
    }
  }

  async function submitRatings() {
    if (!rating) return
    const missing = criteria.filter(c => !rating.scores[c.id]?.trim())
    if (missing.length > 0) {
      setRating(r => ({ ...r, error: `Please enter a score for all ${criteria.length} criteria.` }))
      return
    }
    setRating(r => ({ ...r, submitting: true, error: '' }))
    try {
      for (const criterion of criteria) {
        await defenseService.submitRating({
          defenseScheduleId: rating.defense.id,
          defenseCriterionId: criterion.id,
          score: parseFloat(rating.scores[criterion.id]),
          comments: rating.comments[criterion.id] || null,
        })
      }
      const updated = await defenseService.mySchedules().catch(() => defenses)
      setDefenses(updated ?? defenses)
      setRating(null)
    } catch (err) {
      setRating(r => ({ ...r, submitting: false, error: err.message || 'Failed to submit ratings.' }))
    }
  }

  if (loading) return <><TopBar title="Rate Defenses" subtitle="Panel evaluation" /><PageLoader /></>

  const ratable = defenses.filter(d => d.isRatingOpen)
  const locked  = defenses.filter(d => !d.isRatingOpen)

  return (
    <div>
      <TopBar
        title="Rate Defenses"
        subtitle={ratable.length > 0 ? `${ratable.length} defense${ratable.length !== 1 ? 's' : ''} open for rating` : 'No defenses open for rating'}
      />
      <div className="p-4 sm:p-8">
        {defenses.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No defenses assigned"
            description="Defenses assigned to you as a panel member will appear here once scheduled."
          />
        ) : (
          <div className="space-y-8">
            {ratable.length > 0 && (
              <section>
                <h2 className="font-display font-semibold text-lg mb-4" style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
                  Open for Rating
                </h2>
                <div className="space-y-4">
                  {ratable.map(d => (
                    <DefenseRatingCard key={d.id} defense={d} onRate={() => openRating(d)} />
                  ))}
                </div>
              </section>
            )}
            {locked.length > 0 && (
              <section>
                <h2 className="font-display font-semibold text-lg mb-4" style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
                  Locked / Completed
                </h2>
                <div className="space-y-4">
                  {locked.map(d => (
                    <DefenseRatingCard key={d.id} defense={d} onRate={() => openRating(d)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Modal
        open={!!rating}
        onClose={() => { if (!rating?.submitting) setRating(null) }}
        title="Defense Rating"
        size="lg"
        footer={
          rating && (
            <>
              <button className="btn-secondary" onClick={() => setRating(null)} disabled={rating.submitting}>
                Cancel
              </button>
              {rating.defense.isRatingOpen && (
                <button
                  className="btn-primary"
                  onClick={submitRatings}
                  disabled={rating.submitting || rating.loadingRatings}
                >
                  {rating.submitting ? 'Submitting…' : 'Submit Ratings'}
                </button>
              )}
            </>
          )
        }
      >
        {rating && (
          <div className="space-y-5">
            {/* Defense header */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(10,22,40,0.04)', border: '1px solid var(--border-light)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{rating.defense.groupName}</p>
              <div className="flex flex-wrap gap-3 mt-1.5">
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <Calendar size={12} />
                  {new Date(rating.defense.scheduledDateTime).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
                <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <MapPin size={12} /> {rating.defense.venue}
                </span>
              </div>
            </div>

            {!rating.defense.isRatingOpen && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid #fecaca', color: '#dc2626' }}>
                <Lock size={14} /> Rating is locked. Scores are view-only.
              </div>
            )}

            {rating.error && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                {rating.error}
              </div>
            )}

            {rating.loadingRatings ? (
              <div className="py-8 flex justify-center">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            ) : criteria.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                No rating criteria have been configured. Contact an administrator.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Rating Criteria ({criteria.length})
                </p>
                {criteria.map(criterion => {
                  const score = rating.scores[criterion.id] ?? ''
                  const num = parseFloat(score)
                  const isValid = score !== '' && !isNaN(num) && num >= 0 && num <= criterion.maxScore
                  const isOver = score !== '' && !isNaN(num) && num > criterion.maxScore
                  return (
                    <div key={criterion.id} className="p-4 rounded-xl" style={{ background: 'var(--bg-subtle)', border: `1px solid ${isOver ? '#fecaca' : 'var(--border-main)'}` }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm" style={{ color: 'var(--text-heading)' }}>{criterion.name}</p>
                          {criterion.description && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{criterion.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                            {(criterion.weight * 100).toFixed(0)}% weight
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            max={criterion.maxScore}
                            step="0.5"
                            className="form-input"
                            placeholder={`0 – ${criterion.maxScore}`}
                            value={score}
                            onChange={e => setRating(r => ({ ...r, scores: { ...r.scores, [criterion.id]: e.target.value } }))}
                            disabled={!rating.defense.isRatingOpen || rating.submitting}
                          />
                        </div>
                        <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
                          / {criterion.maxScore}
                        </span>
                        {score !== '' && (
                          isValid
                            ? <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                            : <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                        )}
                      </div>
                      {rating.defense.isRatingOpen && (
                        <textarea
                          className="form-input mt-2 text-sm"
                          rows={2}
                          placeholder="Comments (optional)"
                          value={rating.comments[criterion.id] ?? ''}
                          onChange={e => setRating(r => ({ ...r, comments: { ...r.comments, [criterion.id]: e.target.value } }))}
                          disabled={rating.submitting}
                        />
                      )}
                    </div>
                  )
                })}

                {/* Consolidated score (if available) */}
                {rating.defense.consolidatedRating && (
                  <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1e3350 100%)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Consolidated Score
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-3xl font-display font-bold" style={{ color: '#c9a84c', letterSpacing: '-1px' }}>
                        {rating.defense.consolidatedRating.totalWeightedScore.toFixed(2)}
                      </p>
                      <span className="text-xs px-3 py-1 rounded-full font-medium"
                        style={{ background: rating.defense.consolidatedRating.allRatingsSubmitted ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)', color: rating.defense.consolidatedRating.allRatingsSubmitted ? '#4ade80' : '#fbbf24' }}>
                        {rating.defense.consolidatedRating.allRatingsSubmitted ? 'All submitted' : 'Partial'}
                      </span>
                    </div>
                    {rating.defense.consolidatedRating.criterionBreakdown?.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {rating.defense.consolidatedRating.criterionBreakdown.map((b, i) => (
                          <div key={i} className="flex items-center justify-between text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                            <span>{b.criterionName}</span>
                            <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                              avg {b.averageScore.toFixed(1)} → {b.weightedContribution.toFixed(2)} pts
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function DefenseRatingCard({ defense, onRate }) {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 transition-all duration-150"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${defense.isRatingOpen ? 'rgba(201,168,76,0.3)' : 'var(--border-light)'}`,
        boxShadow: defense.isRatingOpen ? '0 2px 8px rgba(201,168,76,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-center"
            style={{ background: defense.isRatingOpen ? 'linear-gradient(135deg, #0a1628 0%, #1e3350 100%)' : 'var(--bg-subtle)' }}
          >
            <p className="font-medium" style={{ color: defense.isRatingOpen ? '#c9a84c' : 'var(--text-muted)', fontSize: '10px' }}>
              {defense.scheduledDateTime ? new Date(defense.scheduledDateTime).toLocaleString('en-PH', { month: 'short' }).toUpperCase() : '—'}
            </p>
            <p className="text-xl font-display font-semibold" style={{ color: defense.isRatingOpen ? '#ffffff' : 'var(--text-secondary)' }}>
              {defense.scheduledDateTime ? new Date(defense.scheduledDateTime).getDate() : '—'}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{defense.groupName}</p>
              <Badge variant={statusVariant(defense.status)} size="sm">{defense.status}</Badge>
              {defense.isRatingOpen
                ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}><Unlock size={10} /> Open</span>
                : <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(107,114,128,0.1)', color: '#6b7280' }}><Lock size={10} /> Locked</span>
              }
            </div>
            <div className="flex items-center flex-wrap gap-3 mt-1">
              <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={11} />
                {defense.scheduledDateTime
                  ? new Date(defense.scheduledDateTime).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                  : '—'}
              </span>
              <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <MapPin size={11} /> {defense.venue}
              </span>
              {defense.panelists?.length > 0 && (
                <span className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Users size={11} /> {defense.panelists.length} panelists
                </span>
              )}
            </div>
            {defense.consolidatedRating && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: 'rgba(201,168,76,0.1)', color: '#c9a84c' }}>
                <Star size={11} /> Score: {defense.consolidatedRating.totalWeightedScore.toFixed(2)}
              </div>
            )}
          </div>
        </div>
        <button
          className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-150 flex items-center gap-1.5"
          style={{
            background: defense.isRatingOpen ? 'rgba(201,168,76,0.12)' : 'var(--bg-subtle)',
            color: defense.isRatingOpen ? '#c9a84c' : 'var(--text-muted)',
            border: `1px solid ${defense.isRatingOpen ? 'rgba(201,168,76,0.25)' : 'var(--border-main)'}`,
          }}
          onClick={onRate}
        >
          <Star size={12} />
          {defense.isRatingOpen ? 'Rate' : 'View'}
        </button>
      </div>
    </div>
  )
}
