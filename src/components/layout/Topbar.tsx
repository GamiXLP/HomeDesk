import { Bell, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/app/dashboard': 'Übersicht', '/app/tickets': 'Tickets', '/app/tickets/new': 'Neues Ticket', '/app/statistics': 'Statistik', '/app/settings': 'Einstellungen', '/app/admin': 'Admin',
};
export function Topbar() {
  const { pathname } = useLocation();
  const title = titles[pathname] ?? (pathname.includes('/tickets/') ? 'Ticketdetails' : 'HomeDesk');
  return <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-ha-border bg-white/90 px-4 backdrop-blur lg:px-8">
    <h1 className="text-lg font-bold text-slate-900">{title}</h1>
    <div className="flex items-center gap-2"><button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><Search size={20}/></button><button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><Bell size={20}/></button></div>
  </header>;
}
