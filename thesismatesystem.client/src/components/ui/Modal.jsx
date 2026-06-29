import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

// Must match animate-fade-out / animate-slide-down duration in tailwind.config.js
const CLOSE_DURATION = 200

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
    } else if (mounted) {
      setClosing(true)
      const t = setTimeout(() => { setMounted(false); setClosing(false) }, CLOSE_DURATION)
      return () => clearTimeout(t)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted) return
    const handler = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [mounted, onClose])

  if (!mounted) return null

  return (
    <div className={clsx('fixed inset-0 z-50 flex items-center justify-center p-4', closing ? 'animate-fade-out' : 'animate-fade-in')}>
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        className={clsx('relative w-full rounded-2xl', sizeClasses[size], closing ? 'animate-slide-down' : 'animate-slide-up')}
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-main)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
          <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <div
            className="flex items-center justify-end gap-3 px-6 py-4 border-t"
            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-subtle)', borderRadius: '0 0 16px 16px' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
