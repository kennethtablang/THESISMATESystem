import { useMemo } from 'react'

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

function toMs(d) {
  return d ? new Date(d).getTime() : null
}

export default function GanttChart({ features, onEditDates, canEdit = false }) {
  const today = Date.now()

  const { minMs, maxMs } = useMemo(() => {
    const dates = []
    features.forEach(f => {
      if (f.plannedStartDate) dates.push(toMs(f.plannedStartDate))
      if (f.plannedEndDate) dates.push(toMs(f.plannedEndDate))
      if (f.actualStartDate) dates.push(toMs(f.actualStartDate))
      if (f.actualEndDate) dates.push(toMs(f.actualEndDate))
    })
    dates.push(today)
    const min = Math.min(...dates)
    const max = Math.max(...dates)
    const pad = (max - min) * 0.05
    return { minMs: min - pad, maxMs: max + pad }
  }, [features, today])

  const span = maxMs - minMs || 1

  function pct(ms) {
    return ((ms - minMs) / span) * 100
  }

  function barStyle(startMs, endMs, color, opacity = 1) {
    if (!startMs || !endMs) return null
    const left = Math.max(0, pct(startMs))
    const right = Math.min(100, pct(endMs))
    if (right <= left) return null
    return { left: `${left}%`, width: `${right - left}%`, background: color, opacity }
  }

  const todayPct = pct(today)

  // Generate month tick marks
  const ticks = useMemo(() => {
    const result = []
    const start = new Date(minMs)
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(maxMs)
    const cur = new Date(start)
    while (cur <= end) {
      const ms = cur.getTime()
      if (ms >= minMs && ms <= maxMs) {
        result.push({ ms, label: cur.toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }) })
      }
      cur.setMonth(cur.getMonth() + 1)
    }
    return result
  }, [minMs, maxMs])

  if (features.length === 0) {
    return (
      <div className="card text-center py-12" style={{ color: 'var(--text-muted)' }}>
        No features to display in Gantt view.
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <div style={{ minWidth: 640 }}>
        {/* Legend */}
        <div className="flex items-center gap-6 mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-3 rounded" style={{ background: 'rgba(59,130,246,0.6)' }} />
            Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-3 rounded" style={{ background: 'rgba(34,197,94,0.7)' }} />
            Actual (on time)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-8 h-3 rounded" style={{ background: 'rgba(239,68,68,0.7)' }} />
            Actual (delayed)
          </span>
          {canEdit && (
            <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
              Click a row to set dates
            </span>
          )}
        </div>

        {/* Timeline header */}
        <div className="relative mb-1" style={{ height: 24, marginLeft: 200 }}>
          {ticks.map(t => (
            <div key={t.ms} className="absolute top-0 flex flex-col items-center" style={{ left: `${pct(t.ms)}%`, transform: 'translateX(-50%)' }}>
              <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{t.label}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="space-y-1.5">
          {features.map(f => {
            const plannedStart = toMs(f.plannedStartDate)
            const plannedEnd = toMs(f.plannedEndDate)
            const actualStart = toMs(f.actualStartDate)
            const actualEnd = toMs(f.actualEndDate)

            const isDelayed = actualEnd && plannedEnd && actualEnd > plannedEnd
            const actualColor = isDelayed ? 'rgba(239,68,68,0.7)' : 'rgba(34,197,94,0.7)'

            const plannedBar = barStyle(plannedStart, plannedEnd, 'rgba(59,130,246,0.55)')
            const actualBar = barStyle(actualStart, actualEnd || today, actualColor)
            const hasAnyDate = plannedStart || actualStart

            return (
              <div
                key={f.id}
                className="flex items-center gap-2 group"
                style={{ cursor: canEdit ? 'pointer' : 'default' }}
                onClick={() => canEdit && onEditDates?.(f)}
              >
                {/* Feature name */}
                <div className="shrink-0 text-right" style={{ width: 192 }}>
                  <span className="text-xs font-medium truncate block" style={{ color: 'var(--text-primary)' }} title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                    {f.featureTypeLabel}
                  </span>
                </div>

                {/* Bar area */}
                <div className="flex-1 relative rounded" style={{ height: 28, background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}>
                  {/* Month grid lines */}
                  {ticks.map(t => (
                    <div key={t.ms} className="absolute top-0 bottom-0" style={{ left: `${pct(t.ms)}%`, width: 1, background: 'var(--border-main)', opacity: 0.5 }} />
                  ))}

                  {/* Today line */}
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0" style={{ left: `${todayPct}%`, width: 2, background: '#c9a84c', zIndex: 3 }} />
                  )}

                  {/* Planned bar */}
                  {plannedBar && (
                    <div
                      className="absolute top-1 bottom-1 rounded"
                      style={{ ...plannedBar, zIndex: 1 }}
                      title={`Planned: ${formatDate(f.plannedStartDate)} – ${formatDate(f.plannedEndDate)}`}
                    />
                  )}

                  {/* Actual bar */}
                  {actualBar && (
                    <div
                      className="absolute rounded"
                      style={{ ...actualBar, top: 6, bottom: 6, zIndex: 2 }}
                      title={`Actual: ${formatDate(f.actualStartDate)}${f.actualEndDate ? ' – ' + formatDate(f.actualEndDate) : ' → ongoing'}`}
                    />
                  )}

                  {!hasAnyDate && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                      No dates set{canEdit ? ' — click to add' : ''}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Today label */}
        <div className="relative mt-1" style={{ marginLeft: 200 }}>
          {todayPct >= 0 && todayPct <= 100 && (
            <div className="absolute" style={{ left: `${todayPct}%`, transform: 'translateX(-50%)' }}>
              <span className="text-xs font-medium whitespace-nowrap" style={{ color: '#c9a84c', fontSize: 10 }}>Today</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
