import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

// Scroll lock is shared: with two modals open, the first to close must not hand
// scrolling back to the page while the second is still up.
let scrollLocks = 0

function lockScroll() {
  if (scrollLocks === 0) {
    // Hiding the body scrollbar reclaims its width, which shifts the page — and the
    // centred dialog with it — sideways on open. Replacing the lost width with padding
    // keeps the layout, and the modal, exactly where they were.
    const gap = window.innerWidth - document.documentElement.clientWidth
    if (gap > 0) document.body.style.paddingRight = `${gap}px`
    document.body.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  }
}

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export default function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const dialogRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const titleId = useId()

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
    lockScroll()
    return unlockScroll
  }, [mounted])

  // Escape to close, plus a Tab trap. Without the trap, tabbing out of an open
  // modal walks into the page behind it, which is still visible through the scrim.
  useEffect(() => {
    if (!mounted) return

    const handler = (e) => {
      if (e.key === 'Escape') { onClose?.(); return }
      if (e.key !== 'Tab') return

      const items = dialogRef.current?.querySelectorAll(FOCUSABLE)
      if (!items?.length) { e.preventDefault(); return }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement

      // Wrap around at both ends, and pull focus back in if it has escaped.
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [mounted, onClose])

  // Move focus in on open and hand it back to whatever opened the modal on close.
  useEffect(() => {
    if (!mounted) return
    restoreFocusRef.current = document.activeElement

    const target = dialogRef.current?.querySelector(FOCUSABLE) ?? dialogRef.current
    target?.focus()

    return () => restoreFocusRef.current?.focus?.()
  }, [mounted])

  if (!mounted) return null

  // Portalled to <body>: rendered inline, an ancestor with transform/filter/opacity
  // creates a containing block that traps position:fixed, so the modal would be
  // clipped or painted underneath its own page content.
  return createPortal(
    <div className={clsx('fixed inset-0 z-overlay flex items-center justify-center p-4 overflow-y-auto overscroll-contain', closing ? 'animate-fade-out' : 'animate-fade-in')}>
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        // Capped to the viewport with a scrolling body: the overlay centres the dialog, so anything
        // taller than the screen would otherwise be cut off above and below with no way to reach it.
        // `my-auto` keeps it centred while the overlay scrolls; dvh (with a vh fallback below) so a
        // mobile browser's collapsing URL bar cannot push the footer buttons off-screen.
        className={clsx('relative w-full my-auto rounded-2xl flex flex-col max-h-[calc(100vh-2rem)]', sizeClasses[size], closing ? 'animate-slide-down' : 'animate-slide-up')}
        style={{
          background: 'var(--bg-card)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-main)',
          maxHeight: 'calc(100dvh - 2rem)',
        }}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border-main)' }}>
          <h2 id={titleId} className="font-display font-semibold text-lg min-w-0 truncate" style={{ color: 'var(--text-heading)', letterSpacing: '-0.3px' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto min-h-0">{children}</div>

        {footer && (
          <div
            className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t shrink-0"
            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-subtle)', borderRadius: '0 0 16px 16px' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
