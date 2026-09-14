import { Suspense, useState, useSyncExternalStore } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppFooter from './Footer'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  )
}

// Matches Tailwind's `lg` breakpoint, where the sidebar stops being an off-canvas drawer.
const DESKTOP_QUERY = '(min-width: 1024px)'

function subscribeDesktop(onChange) {
  const mq = window.matchMedia(DESKTOP_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP_QUERY).matches)
}

export default function Layout() {
  const isDesktop = useIsDesktop()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  function handleToggleCollapse() {
    setSidebarCollapsed(v => {
      const next = !v
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch { /* storage unavailable — keep in-memory state */ }
      return next
    })
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-backdrop lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — mobile always w-60, desktop respects collapsed state */}
      <div
        className={`fixed inset-y-0 left-0 z-sidebar w-60 transform lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ transition: 'transform 300ms ease-in-out, width 300ms ease-in-out' }}
      >
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          // Collapsing is a desktop preference. The mobile drawer is always full width and has no
          // collapse toggle, so honouring it there left an icon-only rail the user could not expand.
          collapsed={sidebarCollapsed && isDesktop}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Main content — shifts right based on sidebar width */}
      <div
        className={`flex-1 flex flex-col min-h-screen ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}
        style={{ transition: 'margin-left 300ms ease-in-out' }}
      >
        <main className="flex-1">
          {/* Inner boundary so a code-split page loads without unmounting the shell —
              otherwise the sidebar and topbar would blank out on every navigation. */}
          <Suspense fallback={<PageFallback />}>
            <Outlet context={{ toggleSidebar: () => setSidebarOpen((o) => !o) }} />
          </Suspense>
        </main>
        <AppFooter />
      </div>
      <ToastContainer />
    </div>
  )
}
