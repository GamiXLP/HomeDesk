import { BarChart3, Home, Inbox, PlusCircle, Settings, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

const userNav = [
    { to: '/app/dashboard', label: 'Übersicht', icon: Home },
    { to: '/app/tickets', label: 'Tickets', icon: Inbox },
    { to: '/app/tickets/new', label: 'Neu', icon: PlusCircle },
    { to: '/app/statistics', label: 'Statistik', icon: BarChart3 },
    { to: '/app/settings', label: 'Mehr', icon: Settings },
];

export function MobileNav() {
    const { isAdmin } = useAuth();

    const nav = isAdmin
        ? [
            { to: '/app/dashboard', label: 'Übersicht', icon: Home },
            { to: '/app/tickets', label: 'Tickets', icon: Inbox },
            { to: '/app/tickets/new', label: 'Neu', icon: PlusCircle },
            { to: '/app/statistics', label: 'Statistik', icon: BarChart3 },
            { to: '/app/admin', label: 'Admin', icon: Shield },
        ]
        : userNav;

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-ha-border bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
            <div className="grid grid-cols-5 gap-1">
                {nav.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors',
                                'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
                                'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
                                isActive && 'bg-sky-50 text-ha-blue dark:bg-sky-950/60 dark:text-sky-300',
                            )
                        }
                    >
                        <item.icon size={20} />
                        <span className="leading-none">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}