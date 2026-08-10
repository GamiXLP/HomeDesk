import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';
import { TicketDataProvider } from '../../hooks/useTickets';

export function AppLayout() {
  return (
    <TicketDataProvider>
      <div className="min-h-screen bg-ha-bg text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 lg:flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <Topbar />
          <div className="mx-auto max-w-[1480px] p-4 pb-28 sm:p-5 sm:pb-28 lg:p-8 lg:pb-10">
            <Outlet />
          </div>
          <MobileNav />
        </main>
      </div>
    </TicketDataProvider>
  );
}
