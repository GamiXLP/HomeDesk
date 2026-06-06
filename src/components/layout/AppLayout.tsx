import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { ThemeToggle } from './ThemeToggle';

export function AppLayout() {
    return (
        <div className="min-h-screen bg-ha-bg text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 lg:flex">
            <Sidebar />

            <main className="min-w-0 flex-1">
                <Topbar />

                <div className="fixed right-4 top-4 z-50 lg:right-8">
                    <ThemeToggle />
                </div>

                <div className="mx-auto max-w-7xl p-4 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}