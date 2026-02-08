import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/common/ProtectedRoute';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Lazy load pages
const Login = lazy(() => import('@/pages/auth/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/auth/Register').then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const ProjectsList = lazy(() => import('@/pages/projects/ProjectsList').then(m => ({ default: m.ProjectsList })));
const ProjectDetail = lazy(() => import('@/pages/projects/ProjectDetail').then(m => ({ default: m.ProjectDetail })));
const CreateProject = lazy(() => import('@/pages/projects/CreateProject').then(m => ({ default: m.CreateProject })));
const TicketDetail = lazy(() => import('@/pages/tickets/TicketDetail').then(m => ({ default: m.TicketDetail })));
const TeamPage = lazy(() => import('@/pages/team/TeamPage').then(m => ({ default: m.TeamPage })));
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BacklogPage = lazy(() => import('@/pages/backlog/BacklogPage').then(m => ({ default: m.BacklogPage })));
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then(m => ({ default: m.NotificationsPage })));

// 404 Page Component (NAV-04)
function NotFoundPage() {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
      <h1 className="text-6xl font-bold text-[--color-text-muted]">404</h1>
      <p className="text-lg text-[--color-text-secondary]">Page not found</p>
      <p className="text-sm text-[--color-text-muted]">The page you're looking for doesn't exist or has been moved.</p>
      <a href="/dashboard" className="mt-4 rounded-lg bg-[--color-primary-600] px-4 py-2 text-sm font-medium text-white hover:bg-[--color-primary-500]">Go to Dashboard</a>
    </div>
  );
}

// Loading spinner component
function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
    </div>
  );
}

// Full page loading screen (for initial auth check)
function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-[--color-bg-primary]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[--color-primary-500]" />
        <p className="text-[--color-text-secondary]">Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const { isLoading } = useAuth();

  // Show full page loader while checking auth status
  // This is the only place where we show a loading screen at the root level
  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/register"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <Register />
            </Suspense>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route
            path="dashboard"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Dashboard />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="projects"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <ProjectsList />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="projects/new"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <CreateProject />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="projects/:projectId"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <ProjectDetail />
                </Suspense>
              </ErrorBoundary>
            }
          />
          {/* PROJ-11: Project settings route */}
          <Route
            path="projects/:projectId/settings"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="projects/:projectId/tickets/:ticketId"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <TicketDetail />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="team"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <TeamPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="settings"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <SettingsPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="projects/:projectId/backlog"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <BacklogPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="notifications"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <NotificationsPage />
                </Suspense>
              </ErrorBoundary>
            }
          />
          <Route
            path="tickets/:ticketId"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <TicketDetail />
                </Suspense>
              </ErrorBoundary>
            }
          />

          {/* NAV-04: 404 page for authenticated users */}
          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Route>

        {/* Catch all for unauthenticated users — redirect to login (AUTH-25) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
