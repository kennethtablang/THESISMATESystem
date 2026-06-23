import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import CheckEmail from './pages/auth/CheckEmail'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import TwoFactorVerify from './pages/auth/TwoFactorVerify'

// Dashboard (handles all roles internally)
import Dashboard from './pages/dashboard/Dashboard'

// Shared pages
import Notifications from './pages/notifications/Notifications'
import Profile from './pages/profile/Profile'
import Reports from './pages/reports/Reports'
import Consultations from './pages/consultations/Consultations'
import Defenses from './pages/defenses/Defenses'
import Groups from './pages/groups/Groups'
import Chapters from './pages/chapters/Chapters'

// Student pages
import DocumentUpload from './pages/student/DocumentUpload'
import ConsultationCalendar from './pages/student/ConsultationCalendar'
import StudentSystemTracker from './pages/student/StudentSystemTracker'

// Adviser pages
import ManuscriptReview from './pages/adviser/ManuscriptReview'
import AdviserSystemTracker from './pages/adviser/AdviserSystemTracker'

// FacultyIC pages
import ConsultationManager from './pages/facultyic/ConsultationManager'
import ClassroomManager from './pages/facultyic/ClassroomManager'

// Student pages (additional)
import JoinClass from './pages/student/JoinClass'

// Admin pages
import UserManagement from './pages/admin/UserManagement'

// Panel pages
import Ratings from './pages/ratings/Ratings'


function DocumentsPage() {
  const { user } = useAuth()
  const role = user?.role
  if (role === 'Student') return <DocumentUpload />
  if (['Adviser', 'Admin', 'SuperAdmin'].includes(role)) return <ManuscriptReview />
  return <Navigate to="/dashboard" replace />
}

function CalendarPage() {
  const { user } = useAuth()
  if (['FacultyIC', 'Admin', 'SuperAdmin'].includes(user?.role)) {
    return <Navigate to="/consultation-manager" replace />
  }
  return <ConsultationCalendar />
}

function SystemFeaturesPage() {
  const { user } = useAuth()
  const role = user?.role
  if (['Adviser', 'Admin', 'SuperAdmin'].includes(role)) return <AdviserSystemTracker />
  return <StudentSystemTracker />
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9a84c 0%, #d4b565 100%)' }}>
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="#0a1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#c9a84c', animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  return user ? <Navigate to="/dashboard" replace /> : children
}

function RoleGuard({ roles, children }) {
  const { user } = useAuth()
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/check-email" element={<CheckEmail />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/2fa-verify" element={<TwoFactorVerify />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* New role-specific features */}
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="system-features" element={<SystemFeaturesPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="classroom" element={
            <RoleGuard roles={['FacultyIC']}>
              <ClassroomManager />
            </RoleGuard>
          } />
          <Route path="my-class" element={
            <RoleGuard roles={['Student']}>
              <JoinClass />
            </RoleGuard>
          } />
          <Route path="consultation-manager" element={
            <RoleGuard roles={['FacultyIC', 'Admin', 'SuperAdmin']}>
              <ConsultationManager />
            </RoleGuard>
          } />
          <Route path="users" element={
            <RoleGuard roles={['Admin', 'SuperAdmin']}>
              <UserManagement />
            </RoleGuard>
          } />

          {/* Shared routes */}
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<Groups />} />
          <Route path="chapters" element={<Chapters />} />
          <Route path="consultations" element={<Consultations />} />
          <Route path="defenses" element={<Defenses />} />
          <Route path="ratings" element={
            <RoleGuard roles={['Panel']}>
              <Ratings />
            </RoleGuard>
          } />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
