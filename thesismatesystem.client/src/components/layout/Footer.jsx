export default function AppFooter() {
  const year = new Date().getFullYear()

  return (
    <footer
      className="flex items-center justify-between px-6 sm:px-8 py-3"
      style={{
        borderTop: '1px solid var(--border-light)',
        background: 'var(--bg-page)',
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          &copy; {year} ThesisMate System
        </span>
        <span style={{ color: 'var(--border-main)', fontSize: 10 }}>&bull;</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          PSU Lingayen Campus
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div
          className="px-2 py-0.5 rounded-md text-xs font-medium"
          style={{
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.18)',
            color: '#c9a84c',
            letterSpacing: '0.03em',
          }}
        >
          v1.0
        </div>
      </div>
    </footer>
  )
}
