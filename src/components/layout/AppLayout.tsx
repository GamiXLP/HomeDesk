import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
export function AppLayout() { return <div className="min-h-screen bg-ha-bg lg:flex"><Sidebar/><main className="min-w-0 flex-1"><Topbar/><div className="mx-auto max-w-7xl p-4 lg:p-8"><Outlet/></div></main></div>; }
