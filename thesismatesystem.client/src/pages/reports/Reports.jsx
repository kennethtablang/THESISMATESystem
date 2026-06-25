import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import { BarChart3, Users, Calendar, TrendingUp, FileDown } from 'lucide-react'
import { groupService, defenseService, reportService } from '../../services/api'
import { PageLoader } from '../../components/ui/Spinner'
import { useSort, SortIcon } from '../../hooks/useSort.jsx'

function PdfButton({ onClick, downloading }) {
  return (
    <button
      onClick={onClick}
      disabled={downloading}
      className="btn-ghost text-xs flex items-center gap-1 px-2 py-1"
      title="Download PDF"
    >
      <FileDown size={13} style={{ color: downloading ? 'var(--text-muted)' : '#c9a84c' }} />
      {downloading ? 'Generating…' : 'PDF'}
    </button>
  )
}

export default function Reports() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [defenses, setDefenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [downloading, setDownloading] = useState({})
  const [yearFilter, setYearFilter] = useState('All')

  async function handlePdf(key, fn) {
    setDownloading(prev => ({ ...prev, [key]: true }))
    try { await fn() } catch (err) { alert(err.message || 'Failed to generate PDF') }
    finally { setDownloading(prev => ({ ...prev, [key]: false })) }
  }

  useEffect(() => {
    Promise.all([
      groupService.list().catch(() => []),
      defenseService.list().catch(() => []),
    ]).then(([g, d]) => {
      setGroups(g)
      setDefenses(d)
    }).finally(() => setLoading(false))
  }, [])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'groups', label: 'Group Progress' },
    { id: 'defenses', label: 'Defense Results' },
  ]

  const completedDefenses = defenses.filter(d => d.status === 'Completed')
  const schoolYears = ['All', ...[...new Set(defenses.map(d => d.academicYear).filter(Boolean))].sort()]
  const filteredDefenses = yearFilter === 'All' ? defenses : defenses.filter(d => d.academicYear === yearFilter)

  const { sorted: sortedGroups,   sortKey: gKey, sortDir: gDir, toggle: gToggle } = useSort(groups,          'groupName')
  const { sorted: sortedDefenses, sortKey: dKey, sortDir: dDir, toggle: dToggle } = useSort(filteredDefenses, 'scheduledDateTime', 'desc')
  const progressBuckets = [
    { stage: 'Just Started (0–25%)', count: groups.filter(g => (g.milestoneProgress?.completionPercentage ?? 0) < 25).length, color: 'rgba(239,68,68,0.12)', text: '#dc2626' },
    { stage: 'In Progress (25–50%)', count: groups.filter(g => { const p = g.milestoneProgress?.completionPercentage ?? 0; return p >= 25 && p < 50 }).length, color: 'rgba(245,158,11,0.12)', text: '#d97706' },
    { stage: 'Advanced (50–75%)', count: groups.filter(g => { const p = g.milestoneProgress?.completionPercentage ?? 0; return p >= 50 && p < 75 }).length, color: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
    { stage: 'Near Complete (75–100%)', count: groups.filter(g => (g.milestoneProgress?.completionPercentage ?? 0) >= 75).length, color: 'rgba(34,197,94,0.12)', text: '#16a34a' },
  ]

  const summaryStats = [
    { label: 'Total Groups', value: groups.length, icon: Users, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'Defenses Completed', value: completedDefenses.length, icon: Calendar, color: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
    { label: 'Total Defenses', value: defenses.length, icon: BarChart3, color: '#c9a84c', bg: 'rgba(201,168,76,0.12)' },
    { label: 'Completion Rate', value: groups.length > 0 ? `${Math.round(groups.filter(g => (g.milestoneProgress?.completionPercentage ?? 0) === 100).length / groups.length * 100)}%` : '—', icon: TrendingUp, color: '#16a34a', bg: 'rgba(34,197,94,0.12)' },
  ]

  if (loading) return <><TopBar title="Reports" subtitle="System analytics and progress" /><PageLoader /></>

  return (
    <div>
      <TopBar title="Reports" subtitle="System analytics and progress" />
      <div className="p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-subtle)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                style={
                  activeTab === tab.id
                    ? { background: 'var(--bg-card)', color: 'var(--text-heading)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { background: 'transparent', color: 'var(--text-muted)' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => handlePdf('allGroups', () => reportService.allGroups())}
            disabled={downloading.allGroups}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <FileDown size={15} />
            {downloading.allGroups ? 'Generating…' : 'Export All Groups PDF'}
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              {summaryStats.map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg }}>
                    <s.icon size={18} style={{ color: s.color }} strokeWidth={1.75} />
                  </div>
                  <p className="text-3xl font-display font-semibold mb-0.5" style={{ color: 'var(--text-heading)', letterSpacing: '-1px' }}>{s.value}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <p className="font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>Groups by Progress Stage</p>
                {progressBuckets.map((s) => (
                  <div key={s.stage} className="flex items-center justify-between px-4 py-3 rounded-xl mb-2" style={{ background: s.color }}>
                    <p className="text-sm font-medium" style={{ color: s.text }}>{s.stage}</p>
                    <span className="text-lg font-display font-bold" style={{ color: s.text }}>{s.count}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <p className="font-semibold mb-5" style={{ color: 'var(--text-heading)' }}>Defense Summary</p>
                {defenses.length === 0 ? (
                  <p className="text-sm py-8 text-center" style={{ color: 'var(--text-muted)' }}>No defenses scheduled yet.</p>
                ) : (
                  <div className="space-y-3">
                    {[
                      { label: 'Scheduled', count: defenses.filter(d => d.status === 'Scheduled').length, color: 'rgba(59,130,246,0.12)', text: '#3b82f6' },
                      { label: 'Completed', count: completedDefenses.length, color: 'rgba(34,197,94,0.12)', text: '#16a34a' },
                      { label: 'Rescheduled', count: defenses.filter(d => d.status === 'Rescheduled').length, color: 'rgba(245,158,11,0.12)', text: '#d97706' },
                      { label: 'Cancelled', count: defenses.filter(d => d.status === 'Cancelled').length, color: 'rgba(107,114,128,0.12)', text: '#6b7280' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between px-4 py-2.5 rounded-xl" style={{ background: s.color }}>
                        <span className="text-sm font-medium" style={{ color: s.text }}>{s.label}</span>
                        <span className="text-lg font-display font-bold" style={{ color: s.text }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="animate-fade-in">
            {groups.length === 0 ? (
              <div className="card text-center py-12">
                <Users size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No groups found</p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {[
                        { key: 'groupName',                        label: 'Group'    },
                        { key: 'adviser.fullName',                 label: 'Adviser'  },
                        { key: 'members.length',                   label: 'Members'  },
                        { key: 'milestoneProgress.completionPercentage', label: 'Progress' },
                      ].map(({ key, label }) => (
                        <th key={key} onClick={() => gToggle(key)}
                          style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                          {label}<SortIcon col={key} sortKey={gKey} sortDir={gDir} />
                        </th>
                      ))}
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedGroups.map((g) => {
                      const progress = g.milestoneProgress?.completionPercentage ?? 0
                      const isComplete = progress === 100
                      const isOnTrack = progress >= 50
                      return (
                        <tr key={g.id}>
                          <td>
                            <p className="font-semibold" style={{ color: 'var(--text-heading)' }}>{g.groupName ?? '—'}</p>
                            {g.projectTitle && <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{g.projectTitle}</p>}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{g.adviser?.fullName ?? '—'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{g.members?.length ?? 0}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 rounded-full" style={{ background: 'var(--bg-subtle)' }}>
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{
                                    width: `${progress}%`,
                                    background: isComplete ? '#16a34a' : isOnTrack ? '#c9a84c' : '#d97706',
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{progress}%</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                              style={{
                                background: isComplete ? 'rgba(34,197,94,0.12)' : isOnTrack ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)',
                                color: isComplete ? '#16a34a' : isOnTrack ? '#3b82f6' : '#d97706',
                              }}
                            >
                              {isComplete ? 'Completed' : isOnTrack ? 'On Track' : 'In Progress'}
                            </span>
                          </td>
                          <td>
                            <PdfButton
                              downloading={downloading[`group_${g.id}`]}
                              onClick={() => handlePdf(`group_${g.id}`, () => reportService.groupProgress(g.id))}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'defenses' && (
          <div className="animate-fade-in">
            {defenses.length === 0 ? (
              <div className="card text-center py-12">
                <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No defenses scheduled</p>
              </div>
            ) : (
              <>
                {schoolYears.length > 1 && (
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>School Year:</span>
                    <div className="flex gap-2 flex-wrap">
                      {schoolYears.map(y => (
                        <button
                          key={y}
                          onClick={() => setYearFilter(y)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                          style={{
                            background: yearFilter === y ? '#c9a84c' : 'var(--bg-subtle)',
                            color: yearFilter === y ? '#0a1628' : 'var(--text-secondary)',
                          }}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {filteredDefenses.length === 0 ? (
                  <div className="card text-center py-12">
                    <Calendar size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                    <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>No defenses for {yearFilter}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          {[
                            { key: 'groupName',          label: 'Group'       },
                            { key: 'academicYear',        label: 'School Year' },
                            { key: 'scheduledDateTime',   label: 'Date'        },
                            { key: 'status',              label: 'Status'      },
                            { key: 'consolidatedRating.totalWeightedScore', label: 'Score' },
                          ].map(({ key, label }) => (
                            <th key={key} onClick={() => dToggle(key)}
                              style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                              {label}<SortIcon col={key} sortKey={dKey} sortDir={dDir} />
                            </th>
                          ))}
                          <th className="hidden sm:table-cell">Thesis Title</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedDefenses.map((d) => {
                          const isCompleted = d.status === 'Completed'
                          return (
                            <tr key={d.id}>
                              <td className="font-semibold" style={{ color: 'var(--text-heading)' }}>{d.groupName ?? '—'}</td>
                              <td>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                                  style={{ background: 'rgba(201,168,76,0.12)', color: '#c9a84c' }}>
                                  {d.academicYear || '—'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>
                                {d.scheduledDateTime ? new Date(d.scheduledDateTime).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </td>
                              <td>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                                  style={{
                                    background: isCompleted ? 'rgba(34,197,94,0.12)' : d.status === 'Scheduled' ? 'rgba(59,130,246,0.12)' : d.status === 'Cancelled' ? 'rgba(107,114,128,0.12)' : 'rgba(245,158,11,0.12)',
                                    color: isCompleted ? '#16a34a' : d.status === 'Scheduled' ? '#3b82f6' : d.status === 'Cancelled' ? '#6b7280' : '#d97706',
                                  }}>
                                  {d.statusLabel ?? d.status}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)' }}>
                                {d.consolidatedRating?.totalWeightedScore != null
                                  ? <span className="font-semibold" style={{ color: d.consolidatedRating.totalWeightedScore >= 85 ? '#16a34a' : '#d97706' }}>{d.consolidatedRating.totalWeightedScore.toFixed(2)}</span>
                                  : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                }
                              </td>
                              <td className="hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                                <span className="truncate block max-w-[180px]">{d.thesisTitle ?? d.projectTitle ?? '—'}</span>
                              </td>
                              <td>
                                {isCompleted && (
                                  <PdfButton
                                    downloading={downloading[`defense_${d.id}`]}
                                    onClick={() => handlePdf(`defense_${d.id}`, () => reportService.defenseOutcome(d.id))}
                                  />
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
