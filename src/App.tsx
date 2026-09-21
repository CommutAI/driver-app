import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider }     from './contexts/AuthContext'
import { RealtimeProvider } from './contexts/RealtimeContext'

// Layout
import ProtectedRoute from './components/layout/ProtectedRoute'
import AppShell       from './components/layout/AppShell'

// Pages (lazy-loaded)
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import ErrorBoundary from './components/ui/ErrorBoundary'

const LoginPage            = lazy(() => import('./pages/LoginPage'))
const DashboardPage        = lazy(() => import('./pages/DashboardPage'))
const DriverNavigationPage = lazy(() => import('./pages/DriverNavigationPage'))
const RoutePage            = lazy(() => import('./pages/RoutePage'))
const TripPage             = lazy(() => import('./pages/TripPage'))
const OccupancyPage        = lazy(() => import('./pages/OccupancyPage'))
const NotificationsPage    = lazy(() => import('./pages/NotificationsPage'))
const AnnouncementsPage    = lazy(() => import('./pages/AnnouncementsPage'))
const BusStatusPage        = lazy(() => import('./pages/BusStatusPage'))
const IncidentPage         = lazy(() => import('./pages/IncidentPage'))
const HistoryPage          = lazy(() => import('./pages/HistoryPage'))
const ProfilePage          = lazy(() => import('./pages/ProfilePage'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 text-[#F97316] animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* RealtimeProvider must be inside AuthProvider so it can read user/driver */}
        <RealtimeProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected — requires authenticated driver */}
                <Route element={<ProtectedRoute />}>
                  {/* Full-Screen Immersive Navigation Mode (100% viewport, no shell constraints) */}
                  <Route
                    path="/navigation"
                    element={
                      <ErrorBoundary fallbackTitle="Driver Navigation Mode Encountered an Issue">
                        <DriverNavigationPage />
                      </ErrorBoundary>
                    }
                  />

                  {/* Standard Shell Pages */}
                  <Route element={<AppShell />}>
                    <Route index               element={<DashboardPage />} />
                    <Route path="route"        element={<RoutePage />} />
                    <Route path="trip"         element={<TripPage />} />
                    <Route path="occupancy"    element={<OccupancyPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />
                    <Route path="announcements" element={<AnnouncementsPage />} />
                    <Route path="bus-status"   element={<BusStatusPage />} />
                    <Route path="incident"     element={<IncidentPage />} />
                    <Route path="history"      element={<HistoryPage />} />
                    <Route path="profile"      element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </RealtimeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
