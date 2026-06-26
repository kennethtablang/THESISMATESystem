import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AppFooter from './Footer'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true' } catch { return false }
  })

  function handleToggleCollapse() {
    setSidebarCollapsed(v => {
      const next = !v
      try { localStorage.setItem('sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — mobile always w-60, desktop respects collapsed state */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-60 transform lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ transition: 'transform 300ms ease-in-out, width 300ms ease-in-out' }}
      >
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Main content — shifts right based on sidebar width */}
      <div
        className={`flex-1 flex flex-col min-h-screen ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}
        style={{ transition: 'margin-left 300ms ease-in-out' }}
      >
        <main className="flex-1">
          <Outlet context={{ toggleSidebar: () => setSidebarOpen((o) => !o) }} />
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
