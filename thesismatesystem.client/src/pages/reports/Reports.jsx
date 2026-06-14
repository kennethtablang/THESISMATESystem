import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import TopBar from '../../components/layout/TopBar'
import Badge, { statusVariant } from '../../components/ui/Badge'
import { BarChart3, Download, FileText, Users, Calendar, TrendingUp } from 'lucide-react'

const summaryStats = [
  { label: 'Total Groups', value: 15, icon: Users, color: { bg: '#dbeafe', icon: '#2563eb' } },
  { label: 'Chapters Submitted', value: 48, icon: FileText, color: { bg: '#d1fae5', icon: '#16a34a' } },
  { label: 'Defenses Completed', value: 8, icon: Calendar, color: { bg: '#ede9fe', icon: '#7c3aed' } },
  { label: 'Approval Rate', value: '78%', icon: TrendingUp, color: { bg: '#fef3c7', icon: '#d97706' } },
]

const groupReports = [
  { group: 'Group Alpha', section: 'BSIT 4-A', chapters: '3/5', progress: 60, defenseDate: 'Jul 15', status: 'On Track' },
  { group: 'Group Beta', section: 'BSIT 4-B', chapters: '2/5', progress: 40, defenseDate: 'Jul 16', status: 'On Track' },
  { group: 'Group Gamma', section: 'BSIT 4-A', chapters: '1/5', progress: 20, defenseDate: 'TBD', status: 'Needs Attention' },
  { group: 'Group Delta', section: 'BSIT 4-B', chapters: '5/5', progress: 100, defenseDate: 'Jun 20', status: 'Completed' },
  { group: 'Group Epsilon', section: 'BSIT 4-C', chapters: '4/5', progress: 80, defenseDate: 'Jul 22', status: 'On Track' },
]

export default function Reports() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'groups', label: 'Group Progress' },
    { id: 'defenses', label: 'Defense Results' },
  ]

  return (
    <div>
      <TopBar
        title="Reports"
        subtitle="AY 2024–2025 · Semester 2"
      />
      <div className="p-8">
        {/* Header actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#f4f0e6' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                style={
                  activeTab === tab.id
                    ? { background: '#ffffff', color: '#0f172a', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                    : { background: 'transparent', color: '#6b7280' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button className="btn-secondary">
            <Download size={15} /> Export PDF
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            {/* Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              {summaryStats.map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: s.color.bg }}>
                    <s.icon size={18} style={{ color: s.color.icon }} strokeWidth={1.75} />
                  </div>
                  <p className="text-3xl font-display font-semibold mb-0.5" style={{ color: '#0f172a', letterSpacing: '-1px' }}>{s.value}</p>
                  <p className="text-sm" style={{ color: '#6b7280' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Chapter status distribution */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <p className="font-semibold mb-5" style={{ color: '#0f172a' }}>Chapter Status Distribution</p>
                {[
                  { label: 'Approved', count: 22, total: 48, color: '#16a34a' },
                  { label: 'Under Review', count: 8, total: 48, color: '#c9a84c' },
                  { label: 'Needs Revision', count: 6, total: 48, color: '#d97706' },
                  { label: 'Pending', count: 12, total: 48, color: '#e8e1d0' },
                ].map((item) => (
                  <div key={item.label} className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm" style={{ color: '#374151' }}>{item.label}</span>
                      <span className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                        {item.count} <span style={{ color: '#9ca3af', fontWeight: 400 }}>/ {item.total}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: '#f4f0e6' }}>
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${(item.count / item.total) * 100}%`, background: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                <p className="font-semibold mb-5" style={{ color: '#0f172a' }}>Groups by Progress Stage</p>
                <div className="space-y-3">
                  {[
                    { stage: 'Just Started (0–25%)', count: 3, color: '#fee2e2', text: '#dc2626' },
                    { stage: 'In Progress (25–50%)', count: 4, color: '#fef3c7', text: '#d97706' },
                    { stage: 'Advanced (50–75%)', count: 5, color: '#dbeafe', text: '#2563eb' },
                    { stage: 'Near Complete (75–100%)', count: 3, color: '#d1fae5', text: '#16a34a' },
                  ].map((s) => (
                    <div key={s.stage} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: s.color }}>
                      <p className="text-sm font-medium" style={{ color: s.text }}>{s.stage}</p>
                      <span className="text-lg font-display font-bold" style={{ color: s.text }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="animate-fade-in">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Section</th>
                    <th>Chapters</th>
                    <th>Progress</th>
                    <th>Defense Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {groupReports.map((g) => (
                    <tr key={g.group}>
                      <td className="font-semibold" style={{ color: '#0f172a' }}>{g.group}</td>
                      <td>{g.section}</td>
                      <td>{g.chapters}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full" style={{ background: '#f4f0e6' }}>
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${g.progress}%`,
                                background: g.progress === 100 ? '#16a34a' : g.progress >= 60 ? '#c9a84c' : g.progress >= 30 ? '#d97706' : '#e8e1d0',
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium" style={{ color: '#6b7280' }}>{g.progress}%</span>
                        </div>
                      </td>
                      <td>{g.defenseDate}</td>
                      <td>
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            background: g.status === 'Completed' ? '#d1fae5' : g.status === 'On Track' ? '#dbeafe' : '#fef3c7',
                            color: g.status === 'Completed' ? '#065f46' : g.status === 'On Track' ? '#1e40af' : '#92400e',
                          }}
                        >
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'defenses' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {[
                { group: 'Group Delta', date: 'Jun 20, 2025', title: 'Web-based Inventory System', avgScore: 88.5, passed: true },
                { group: 'Group Zeta', date: 'Jun 15, 2025', title: 'E-Commerce Platform for Local Artisans', avgScore: 91.2, passed: true },
              ].map((d, i) => (
                <div key={i} className="rounded-2xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-semibold" style={{ color: '#0f172a' }}>{d.group}</p>
                      <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>{d.title}</p>
                      <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>{d.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-display font-semibold" style={{ color: d.avgScore >= 85 ? '#16a34a' : '#d97706', letterSpacing: '-1px' }}>
                        {d.avgScore}
                      </p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>avg score</p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full mb-3" style={{ background: '#f4f0e6' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${d.avgScore}%`, background: d.avgScore >= 85 ? '#16a34a' : '#d97706' }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: '#d1fae5', color: '#065f46' }}
                    >
                      {d.passed ? 'PASSED' : 'FAILED'}
                    </span>
                    <button className="btn-ghost text-xs">
                      <Download size={13} /> Full Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
