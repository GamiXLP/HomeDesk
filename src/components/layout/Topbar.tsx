import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
    '/app/dashboard': 'Übersicht',
    '/app/tickets': 'Tickets',
    '/app/tickets/new': 'Neues Ticket',
    '/app/statistics': 'Statistik',
    '/app/settings': 'Einstellungen',
    '/app/admin': 'Admin',
};

export function Topbar() {
    const { pathname } = useLocation();
    const title = titles[pathname] ?? (pathname.includes('/tickets/') ? 'Ticketdetails' : 'HomeDesk');

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-ha-border bg-white/90 px-4 backdrop-blur transition-colors duration-200 dark:border-slate-800 dark:bg-slate-950/90 lg:px-8">
            <h1 className="truncate pr-4 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h1>

            <div className="mr-12 flex shrink-0 items-center gap-1 sm:gap-2 lg:mr-12">
                <button className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                    <Search size={20} />
                </button>

                <button className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                    <Bell size={20} />
                </button>
            </div>
        </header>
    );
}