import { BarChart3, Home, Inbox, LogOut, Menu, Plus, Settings, Shield, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

export function MobileNav() {
  const { isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const nav = [
    { to: '/app/dashboard', label: 'Home', icon: Home },
    { to: '/app/tickets', label: 'Tickets', icon: Inbox },
    { to: '/app/tickets/new', label: 'Neu', icon: Plus, primary: true },
    { to: '/app/statistics', label: 'Statistik', icon: BarChart3 },
  ];

  async function logout() {
    setMoreOpen(false);
    await signOut();
    navigate('/login');
  }

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/80 bg-white/90 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => cn('relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold transition', 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800', isActive && !item.primary && 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300', item.primary && 'text-sky-600 dark:text-sky-300')}>
              {item.primary ? <span className="-mt-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-500/25"><item.icon size={22} /></span> : <item.icon size={20} />}
              <span className={item.primary ? '-mt-0.5' : ''}>{item.label}</span>
            </NavLink>
          ))}
          <button type="button" onClick={() => setMoreOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-bold text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"><Menu size={20} /><span>Mehr</span></button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-950/35 backdrop-blur-sm lg:hidden" onMouseDown={(event) => { if (event.currentTarget === event.target) setMoreOpen(false); }}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-[30px] border-t border-slate-200 bg-white p-4 pb-[max(22px,env(safe-area-inset-bottom))] shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto max-w-lg">
              <div className="flex items-center justify-between gap-3 px-1 pb-3">
                <div><p className="text-sm font-black text-slate-950 dark:text-white">{profile?.display_name}</p><p className="text-xs text-slate-500">{isAdmin ? 'Administrator' : 'Benutzer'}</p></div>
                <button type="button" onClick={() => setMoreOpen(false)} className="rounded-2xl p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button>
              </div>
              <div className="grid gap-2">
                <SheetLink to="/app/settings" icon={Settings} label="Einstellungen" onClick={() => setMoreOpen(false)} />
                {isAdmin && <SheetLink to="/app/admin" icon={Shield} label="Administration" onClick={() => setMoreOpen(false)} />}
                <button type="button" onClick={() => void logout()} className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"><LogOut size={18} />Abmelden</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SheetLink({ to, icon: Icon, label, onClick }: { to: string; icon: typeof Settings; label: string; onClick: () => void }) {
  return <NavLink to={to} onClick={onClick} className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"><Icon size={18} />{label}</NavLink>;
}
