import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'

const DEFAULT_SIZE_OPTIONS = [10, 25, 50, 100]

function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

function NavBtn({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.borderColor = 'var(--border-main)' } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-main)' }}
      style={{
        width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid var(--border-main)', background: 'transparent',
        color: 'var(--text-secondary)', opacity: disabled ? 0.35 : 1, transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function PageBtn({ page, current, onClick }) {
  const active = page === current
  return (
    <button
      onClick={() => onClick(page)}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-subtle)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      style={{
        width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 13, fontWeight: active ? 700 : 500,
        cursor: 'pointer', transition: 'all 0.15s',
        border: active ? 'none' : '1px solid var(--border-main)',
        background: active ? '#c9a84c' : 'transparent',
        color: active ? '#0a1628' : 'var(--text-secondary)',
      }}
    >
      {page}
    </button>
  )
}

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_SIZE_OPTIONS,
}) {
  if (totalItems === 0) return null

  const from  = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const to    = Math.min(page * pageSize, totalItems)
  const pages = buildPages(page, totalPages)

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t"
      style={{ borderColor: 'var(--border-light)' }}
    >
      {/* Left: rows-per-page selector + count */}
      <div className="flex items-center gap-3 flex-wrap">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Rows per page</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={e => onPageSizeChange(Number(e.target.value))}
                style={{
                  appearance: 'none',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-main)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '3px 24px 3px 8px',
                  cursor: 'pointer',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              >
                {pageSizeOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <ChevronDown
                size={11}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none',
                }}
              />
            </div>
          </div>
        )}

        <p className="text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Showing{' '}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{from}–{to}</span>
          {' '}of{' '}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{totalItems}</span>
        </p>
      </div>

      {/* Right: page buttons (hidden when single page) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => onPageChange(page - 1)} disabled={page === 1}>
            <ChevronLeft size={14} />
          </NavBtn>

          {pages.map((p, i) =>
            p === '…' ? (
              <span
                key={`e${i}`}
                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--text-muted)' }}
              >
                …
              </span>
            ) : (
              <PageBtn key={p} page={p} current={page} onClick={onPageChange} />
            )
          )}

          <NavBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages}>
            <ChevronRight size={14} />
          </NavBtn>
        </div>
      )}
    </div>
  )
}
