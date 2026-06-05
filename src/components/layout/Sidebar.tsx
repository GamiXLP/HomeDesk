import { Home, Inbox, PlusCircle, BarChart3, Settings, Shield, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

const nav = [
  { to: '/app/dashboard', label: 'Übersicht', icon: Home },
  { to: '/app/tickets', label: 'Tickets', icon: Inbox },
  { to: '/app/tickets/new', label: 'Neues Ticket', icon: PlusCircle },
  { to: '/app/statistics', label: 'Statistik', icon: BarChart3 },
  { to: '/app/settings', label: 'Einstellungen', icon: Settings },
];

export function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth();
  return <aside className="hidden h-screen w-72 flex-col border-r border-ha-border bg-white lg:flex">
    <div className="flex h-16 items-center gap-3 border-b border-ha-border px-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ha-blue text-lg font-black text-white">H</div>
      <div><p className="text-sm font-bold">HomeDesk</p><p className="text-xs text-slate-500">Smart-Home Tickets</p></div>
    </div>
    <nav className="flex-1 space-y-1 p-4">
      {nav.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100', isActive && 'bg-sky-50 text-ha-blue')}><item.icon size={18}/>{item.label}</NavLink>)}
      {isAdmin && <NavLink to="/app/admin" className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100', isActive && 'bg-sky-50 text-ha-blue')}><Shield size={18}/>Admin</NavLink>}
    </nav>
    <div className="border-t border-ha-border p-4">
      <div className="mb-3 rounded-xl bg-slate-50 p-3"><p className="text-sm font-semibold">{profile?.display_name}</p><p className="text-xs text-slate-500">{profile?.role === 'admin' ? 'Admin / Bearbeiter' : 'Benutzerin'}</p></div>
      <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"><LogOut size={18}/>Logout</button>
    </div>
  </aside>;
}
