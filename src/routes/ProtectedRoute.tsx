import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingState } from '../components/ui/States';
export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6"><LoadingState/></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet/>;
}
export function AdminRoute() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <div className="p-8"><h2 className="text-xl font-bold">Kein Zugriff</h2><p className="mt-2 text-slate-500">Dieser Bereich ist nur für Admins sichtbar.</p></div>;
  return <Outlet/>;
}
