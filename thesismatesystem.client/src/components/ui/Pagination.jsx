import { ChevronLeft, ChevronRight } from 'lucide-react'

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

export default function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)
  const pages = buildPages(page, totalPages)

  return (
    <div
      className="flex items-center justify-between px-5 py-3 border-t"
      style={{ borderColor: 'var(--border-light)' }}
    >
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Showing <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{from}–{to}</span> of{' '}
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{totalItems}</span>
      </p>

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
    </div>
  )
}
