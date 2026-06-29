import { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 8

export default function ImagePreviewPanel({ images, startIndex = 0, onClose }) {
  const [current, setCurrent] = useState(startIndex)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragOrigin = useRef({ x: 0, y: 0 })

  // Reset zoom/pan when switching images
  useEffect(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [current])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setCurrent(i => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft')  setCurrent(i => Math.max(i - 1, 0))
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z * 1.25, MAX_ZOOM))
      if (e.key === '-') setZoom(z => Math.max(z / 1.25, MIN_ZOOM))
      if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  function handleWheel(e) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 0.88
    setZoom(z => Math.min(Math.max(z * factor, MIN_ZOOM), MAX_ZOOM))
  }

  function startDrag(e) {
    if (e.button !== 0) return
    dragging.current = true
    dragOrigin.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function doDrag(e) {
    if (!dragging.current) return
    setPan({ x: e.clientX - dragOrigin.current.x, y: e.clientY - dragOrigin.current.y })
  }

  function endDrag() {
    dragging.current = false
  }

  function resetZoom() {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  function handleDoubleClick() {
    if (zoom > 1) { resetZoom() } else { setZoom(2.5) }
  }

  const pct = Math.round(zoom * 100)

  return (
    <>
      {/* Backdrop — dim only, no blur */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(50vw, 760px)',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-main)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.2)',
          animation: 'slideInRight 0.2s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-light)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            {images.length > 1 ? `Screenshot ${current + 1} of ${images.length}` : 'Screenshot'}
          </span>

          <div className="flex items-center gap-0.5">
            <button onClick={() => setZoom(z => Math.max(z / 1.25, MIN_ZOOM))}
              className="btn-ghost px-2 py-1.5" title="Zoom out (-)">
              <ZoomOut size={14} />
            </button>

            <button onClick={resetZoom}
              className="px-2 py-1 rounded text-xs font-mono tabular-nums transition-colors"
              style={{ color: zoom === 1 ? 'var(--text-muted)' : '#c9a84c', minWidth: 42, textAlign: 'center' }}
              title="Reset zoom (0)">
              {pct}%
            </button>

            <button onClick={() => setZoom(z => Math.min(z * 1.25, MAX_ZOOM))}
              className="btn-ghost px-2 py-1.5" title="Zoom in (+)">
              <ZoomIn size={14} />
            </button>

            <div style={{ width: 1, height: 16, background: 'var(--border-light)', margin: '0 6px' }} />

            <a href={images[current]} target="_blank" rel="noopener noreferrer"
              className="btn-ghost px-2 py-1.5" title="Open in new tab">
              <ExternalLink size={14} />
            </a>
            <button onClick={onClose} className="btn-ghost px-2 py-1.5" title="Close (Esc)">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Image canvas */}
        <div
          className="flex-1 min-h-0 relative overflow-hidden"
          style={{ cursor: zoom > 1 ? 'grab' : 'default' }}
          onWheel={handleWheel}
          onPointerDown={startDrag}
          onPointerMove={doDrag}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <img
              key={images[current]}
              src={images[current]}
              alt={`Screenshot ${current + 1}`}
              draggable={false}
              onDoubleClick={handleDoubleClick}
              className="rounded-xl"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
                transition: dragging.current ? 'none' : 'transform 0.12s ease',
                boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
                userSelect: 'none',
                pointerEvents: zoom > 1 ? 'none' : 'auto',
              }}
            />
          </div>

          {/* Zoom hint */}
          {zoom === 1 && (
            <p className="absolute bottom-3 left-0 right-0 text-center text-xs pointer-events-none"
              style={{ color: 'var(--text-muted)' }}>
              Scroll or double-click to zoom · Drag to pan when zoomed
            </p>
          )}
          {zoom > 1 && (
            <button onClick={resetZoom}
              className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-light)' }}>
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>

        {/* Navigation */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-4 px-5 py-3 shrink-0"
            style={{ borderTop: '1px solid var(--border-light)' }}>
            <button onClick={() => setCurrent(i => Math.max(i - 1, 0))} disabled={current === 0}
              className="btn-ghost px-2" style={{ opacity: current === 0 ? 0.3 : 1 }}>
              <ChevronLeft size={18} />
            </button>
            <div className="flex gap-1.5 items-center">
              {images.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className="rounded-full transition-all"
                  style={{
                    width: i === current ? 20 : 8,
                    height: 8,
                    background: i === current ? '#c9a84c' : 'var(--border-main)',
                  }}
                />
              ))}
            </div>
            <button onClick={() => setCurrent(i => Math.min(i + 1, images.length - 1))} disabled={current === images.length - 1}
              className="btn-ghost px-2" style={{ opacity: current === images.length - 1 ? 0.3 : 1 }}>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
