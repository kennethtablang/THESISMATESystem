export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      {Icon && (
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#f4f0e6', border: '1px solid #e8e1d0' }}
        >
          <Icon size={24} style={{ color: '#c9a84c' }} strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-display font-semibold text-lg mb-1" style={{ color: '#1a1a2e' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: '#6b7280' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
