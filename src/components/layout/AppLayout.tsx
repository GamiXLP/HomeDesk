import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { TicketDataProvider } from '../../hooks/useTickets';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { listenForPushNavigation } from '../../lib/pushNotifications';

export function AppLayout() {
  const navigate = useNavigate();
  useEffect(() => {
    let dispose: () => void = () => undefined;
    void listenForPushNavigation((path) => navigate(path)).then((nextDispose) => { dispose = nextDispose; });
    return () => dispose();
  }, [navigate]);
  return (
    <TicketDataProvider>
      <div className="app-shell min-h-[100dvh] bg-ha-bg text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 lg:flex">
        <Sidebar />
        <main className="app-main min-w-0 flex-1">
          <Topbar />
          <div className="app-content mx-auto w-full max-w-[1760px] p-3 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-10 2xl:px-10">
            <Outlet />
          </div>
          <MobileNav />
        </main>
      </div>
    </TicketDataProvider>
  );
}
