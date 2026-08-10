import { BarChart3, Home, Inbox, Plus, Settings, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export function MobileNav() {
  const { isAdmin } = useAuth();
  const nav = [
    { to: '/app/dashboard', label: 'Home', icon: Home },
    { to: '/app/tickets', label: 'Tickets', icon: Inbox },
    { to: '/app/tickets/new', label: 'Neu', icon: Plus, primary: true },
    { to: '/app/statistics', label: 'Statistik', icon: BarChart3 },
    isAdmin
      ? { to: '/app/admin', label: 'Admin', icon: Shield }
      : { to: '/app/settings', label: 'Mehr', icon: Settings },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/90 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition',
                'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                isActive && !item.primary && 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300',
                item.primary && 'text-sky-600 dark:text-sky-300',
              )
            }
          >
            {item.primary ? (
              <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25">
                <item.icon size={22} />
              </span>
            ) : (
              <item.icon size={20} />
            )}
            <span className={item.primary ? '-mt-0.5' : ''}>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
