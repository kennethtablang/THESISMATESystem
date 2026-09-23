import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/auth/Login'

// Every route below is code-split. Loading them eagerly pulled the rich-text editor,
// Yjs/SignalR collaboration stack and docx export into the initial bundle, so the very
// first paint had to download and parse all of it regardless of which page was opened.
const Register        = lazy(() => import('./pages/auth/Register'))
const CheckEmail      = lazy(() => import('./pages/auth/CheckEmail'))
const VerifyEmail     = lazy(() => import('./pages/auth/VerifyEmail'))
const ForgotPassword  = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword   = lazy(() => import('./pages/auth/ResetPassword'))
const TwoFactorVerify = lazy(() => import('./pages/auth/TwoFactorVerify'))

// Dashboard (handles all roles internally)
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'))

// Shared pages
const Notifications    = lazy(() => import('./pages/notifications/Notifications'))
const Profile          = lazy(() => import('./pages/profile/Profile'))
const Reports          = lazy(() => import('./pages/reports/Reports'))
const Defenses         = lazy(() => import('./pages/defenses/Defenses'))
const DefenseScheduler = lazy(() => import('./pages/defenses/DefenseScheduler'))
const RubricManager    = lazy(() => import('./pages/defenses/RubricManager'))
const GroupsLayout     = lazy(() => import('./pages/groups/GroupsLayout'))
const GroupDetail      = lazy(() => import('./pages/groups/GroupDetail'))
const Chapters         = lazy(() => import('./pages/chapters/Chapters'))

// Student pages
const DocumentUpload        = lazy(() => import('./pages/student/DocumentUpload'))
const StudentSystemTracker  = lazy(() => import('./pages/student/StudentSystemTracker'))
const JoinClass             = lazy(() => import('./pages/student/JoinClass'))
const ManuscriptEditor      = lazy(() => import('./pages/student/ManuscriptEditor'))

// Adviser pages
const ManuscriptReview     = lazy(() => import('./pages/adviser/ManuscriptReview'))
const AdviserSystemTracker = lazy(() => import('./pages/adviser/AdviserSystemTracker'))
const DocumentReview       = lazy(() => import('./pages/adviser/DocumentReview'))

// Admin pages
const UserManagement = lazy(() => import('./pages/admin/UserManagement'))
const Advisers       = lazy(() => import('./pages/admin/Advisers'))
const ClassroomAdmin = lazy(() => import('./pages/admin/ClassroomAdmin'))
const Registrations  = lazy(() => import('./pages/admin/Registrations'))
const Sections       = lazy(() => import('./pages/admin/Sections'))

// Monitoring
const MonitoringDashboard = lazy(() => import('./pages/monitoring/MonitoringDashboard'))

// Panel pages
const Ratings = lazy(() => import('./pages/ratings/Ratings'))


function DocumentsPage() {
  const { user } = useAuth()
  const role = user?.role
  if (role === 'Student') return <DocumentUpload />
  if (['Faculty', 'Admin', 'SuperAdmin'].includes(role)) return <ManuscriptReview />
  return <Navigate to="/dashboard" replace />
}

function ManuscriptPage() {
  const { user } = useAuth()
  const role = user?.role
  if (role === 'Student') return <ManuscriptEditor />
  if (['Faculty', 'Admin', 'SuperAdmin'].includes(role)) return <Navigate to="/documents" replace />
  return <Navigate to="/dashboard" replace />
}

function SystemFeaturesPage() {
  const { user } = useAuth()
  const role = user?.role
  if (['Faculty', 'Admin', 'SuperAdmin'].includes(role)) return <AdviserSystemTracker />
  return <StudentSystemTracker />
}

function BrandLoader() {
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

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <BrandLoader />

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

// Everything academic. The SuperAdmin only staffs the system, so it is kept out of these pages
// the same way the API keeps it out of the endpoints behind them.
const ACADEMIC_ROLES = ['Admin', 'Faculty', 'Student']
function StaffOrStudent({ children }) {
  return <RoleGuard roles={ACADEMIC_ROLES}>{children}</RoleGuard>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<BrandLoader />}>
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
          <Route path="documents" element={<StaffOrStudent><DocumentsPage /></StaffOrStudent>} />
          <Route path="documents/review/:id" element={<StaffOrStudent><DocumentReview /></StaffOrStudent>} />
          <Route path="system-features" element={<StaffOrStudent><SystemFeaturesPage /></StaffOrStudent>} />
          <Route path="my-class" element={
            <RoleGuard roles={['Student']}>
              <JoinClass />
            </RoleGuard>
          } />
          <Route path="users" element={
            <RoleGuard roles={['SuperAdmin']}>
              <UserManagement />
            </RoleGuard>
          } />
          <Route path="registrations" element={
            <RoleGuard roles={['Admin']}>
              <Registrations />
            </RoleGuard>
          } />
          <Route path="sections" element={
            <RoleGuard roles={['Admin']}>
              <Sections />
            </RoleGuard>
          } />
          <Route path="advisers" element={
            <RoleGuard roles={['Admin']}>
              <Advisers />
            </RoleGuard>
          } />
          <Route path="classrooms" element={
            <RoleGuard roles={['Admin']}>
              <ClassroomAdmin />
            </RoleGuard>
          } />

          <Route path="manuscript" element={<StaffOrStudent><ManuscriptPage /></StaffOrStudent>} />
          {/* Adviser / panel / subject teacher read a group's manuscript and highlight + comment on it */}
          <Route path="manuscript/review/:groupId" element={
            <RoleGuard roles={['Admin', 'Faculty']}><ManuscriptEditor /></RoleGuard>
          } />

          <Route path="monitoring" element={<StaffOrStudent><MonitoringDashboard /></StaffOrStudent>} />

          {/* Shared routes */}
          <Route path="groups" element={<StaffOrStudent><GroupsLayout /></StaffOrStudent>}>
            <Route path=":id" element={<GroupDetail />} />
          </Route>
          <Route path="chapters" element={<StaffOrStudent><Chapters /></StaffOrStudent>} />
          <Route path="defenses" element={<StaffOrStudent><Defenses /></StaffOrStudent>} />
          <Route path="defense-scheduler" element={
            <RoleGuard roles={['Admin', 'Faculty']}>
              <DefenseScheduler />
            </RoleGuard>
          } />
          <Route path="rubric-manager" element={
            <RoleGuard roles={['Admin']}>
              <RubricManager />
            </RoleGuard>
          } />
          <Route path="ratings" element={
            <RoleGuard roles={['Faculty']}>
              <Ratings />
            </RoleGuard>
          } />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={
            <RoleGuard roles={['Admin', 'Faculty']}>
              <Reports />
            </RoleGuard>
          } />
          <Route path="profile" element={<Profile />} />
        </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
