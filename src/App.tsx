import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminRoute, ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TicketsPage } from './pages/TicketsPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { AdminPage } from './pages/AdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
export function App(){return <Routes><Route path="/login" element={<LoginPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/" element={<Navigate to="/app/dashboard" replace/>}/><Route element={<ProtectedRoute/>}><Route path="/app" element={<AppLayout/>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<DashboardPage/>}/><Route path="tickets" element={<TicketsPage/>}/><Route path="tickets/new" element={<NewTicketPage/>}/><Route path="tickets/:id" element={<TicketDetailPage/>}/><Route path="areas" element={<TicketsPage/>}/><Route path="statistics" element={<StatisticsPage/>}/><Route path="settings" element={<SettingsPage/>}/><Route element={<AdminRoute/>}><Route path="admin" element={<AdminPage/>}/><Route path="admin/users" element={<AdminPage/>}/><Route path="admin/tickets" element={<TicketsPage/>}/></Route></Route></Route><Route path="*" element={<Navigate to="/app/dashboard" replace/>}/></Routes>}
