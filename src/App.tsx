import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingState } from './components/ui/States';
import { AdminRoute, ProtectedRoute } from './routes/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const ForgotPasswordPage = lazy(() =>
  import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })),
);
const HomeAssistantCallbackPage = lazy(() =>
  import('./pages/HomeAssistantCallbackPage').then((module) => ({
    default: module.HomeAssistantCallbackPage,
  })),
);
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const TicketsPage = lazy(() => import('./pages/TicketsPage').then((module) => ({ default: module.TicketsPage })));
const NewTicketPage = lazy(() => import('./pages/NewTicketPage').then((module) => ({ default: module.NewTicketPage })));
const TicketDetailPage = lazy(() =>
  import('./pages/TicketDetailPage').then((module) => ({ default: module.TicketDetailPage })),
);
const StatisticsPage = lazy(() =>
  import('./pages/StatisticsPage').then((module) => ({ default: module.StatisticsPage })),
);
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

function PageFallback() {
  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <LoadingState rows={2} />
    </div>
  );
}

export function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/auth/home-assistant/callback"
          element={<HomeAssistantCallbackPage />}
        />
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="tickets" element={<TicketsPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:id" element={<TicketDetailPage />} />
            <Route path="areas" element={<Navigate to="/app/tickets" replace />} />
            <Route path="statistics" element={<StatisticsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            <Route element={<AdminRoute />}>
              <Route path="admin" element={<AdminPage />} />
              <Route path="admin/users" element={<AdminPage />} />
              <Route path="admin/tickets" element={<Navigate to="/app/tickets" replace />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
