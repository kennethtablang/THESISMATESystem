export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      {Icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-main)' }}
        >
          <Icon size={24} style={{ color: '#c9a84c' }} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-display font-semibold text-lg mb-1" style={{ color: 'var(--text-heading)' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
