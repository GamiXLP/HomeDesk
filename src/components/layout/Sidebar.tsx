import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Cpu,
  Columns3,
  Home,
  Inbox,
  LogOut,
  Plus,
  Settings,
  Shield,
  Sparkles,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { isTicketOpen } from '../../utils/tickets';
import { cn } from '../../utils/cn';

const nav = [
  { to: '/app/dashboard', label: 'Übersicht', icon: Home },
  { to: '/app/work', label: 'Mein Fokus', icon: Sparkles },
  { to: '/app/tickets', label: 'Tickets', icon: Inbox },
  { to: '/app/board', label: 'Flow Board', icon: Columns3 },
  { to: '/app/calendar', label: 'Kalender', icon: CalendarDays },
  { to: '/app/inbox', label: 'Activity Hub', icon: Bell },
  { to: '/app/knowledge', label: 'Wissen', icon: BookOpen },
  { to: '/app/assets', label: 'Home Operations', icon: Cpu },
  { to: '/app/statistics', label: 'Statistik', icon: BarChart3 },
  { to: '/app/settings', label: 'Einstellungen', icon: Settings },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition duration-200',
    'text-slate-600 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white',
    isActive &&
      'bg-gradient-to-r from-sky-50 to-cyan-50 text-sky-700 shadow-sm ring-1 ring-sky-100 dark:from-sky-950/70 dark:to-cyan-950/40 dark:text-sky-300 dark:ring-sky-900',
  );

export function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth();
  const { tickets } = useTickets();
  const openCount = tickets.filter(isTicketOpen).length;

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] 2xl:w-[296px] shrink-0 flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/85 lg:flex">
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-sky-500/20">
          H
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-slate-950" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-base font-black tracking-tight text-slate-950 dark:text-white">HomeDesk</p>
            <Sparkles size={13} className="text-sky-500" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Intelligent Home Ops · 3.0</p>
        </div>
      </div>

      <div className="px-4">
        <NavLink
          to="/app/tickets/new"
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/15 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-500/20"
        >
          <Plus size={18} />
          Neues Ticket
        </NavLink>
      </div>

      <nav className="mt-5 flex-1 space-y-1 overflow-y-auto px-4 pb-3">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLinkClass}>
            <item.icon size={18} className="shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.to === '/app/tickets' && openCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {openCount}
              </span>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <><NavLink to="/app/automations" className={navLinkClass}><Bot size={18} /><span className="flex-1">Automationen</span></NavLink><NavLink to="/app/admin" className={navLinkClass}><Shield size={18} /><span className="flex-1">Admin</span></NavLink></>
        )}
      </nav>

      <div className="m-4 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center gap-3 p-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-white dark:bg-white dark:text-slate-900">
            {(profile?.display_name || '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{profile?.display_name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {profile?.role === 'admin' ? 'Administrator' : 'Benutzer'}
            </p>
          </div>
        </div>
        <button
          onClick={() => void signOut()}
          className="mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <LogOut size={15} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}
