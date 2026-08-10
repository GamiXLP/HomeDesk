import { Bell, Command, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { isTicketOpen, relativeTime, sortTicketsByAttention, ticketReference } from '../../utils/tickets';
import { PriorityBadge } from '../ui/Badge';
import { ThemeToggle } from './ThemeToggle';
import { cn } from '../../utils/cn';

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
  const navigate = useNavigate();
  const { tickets, refresh, loading } = useTickets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const title = titles[pathname] ?? (pathname.includes('/tickets/') ? 'Ticketdetails' : 'HomeDesk');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === '/' && !typing) {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchInputRef.current?.focus(), 30);
    else setQuery('');
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tickets.slice(0, 7);
    return tickets
      .filter((ticket) =>
        `${ticketReference(ticket)} ${ticket.title} ${ticket.description} ${ticket.category} ${ticket.area} ${ticket.device ?? ''}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 10);
  }, [query, tickets]);

  const attentionTickets = useMemo(
    () =>
      sortTicketsByAttention(
        tickets.filter(
          (ticket) => isTicketOpen(ticket) && (ticket.priority === 'urgent' || ticket.priority === 'high' || ticket.status === 'new'),
        ),
      ).slice(0, 6),
    [tickets],
  );

  function openTicket(id: string) {
    setSearchOpen(false);
    setNotificationsOpen(false);
    navigate(`/app/tickets/${id}`);
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200/70 bg-white/75 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 sm:px-5 lg:h-20 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500 sm:block">HomeDesk</p>
          <h1 className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white lg:text-xl">{title}</h1>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden min-w-64 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-400 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-slate-600 md:flex xl:min-w-80"
        >
          <Search size={17} />
          <span className="flex-1">Tickets durchsuchen …</span>
          <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
            <Command size={11} />K
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
          aria-label="Suche öffnen"
        >
          <Search size={19} />
        </button>

        <button
          type="button"
          onClick={() => void refresh(true)}
          className="hidden h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:flex"
          aria-label="Tickets aktualisieren"
          title="Aktualisieren"
        >
          <RefreshCw size={18} className={cn(loading && 'animate-spin')} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Aufmerksamkeit erforderlich"
          >
            <Bell size={19} />
            {attentionTickets.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Braucht Aufmerksamkeit</p>
                  <p className="text-xs text-slate-500">Neu, hoch oder dringend</p>
                </div>
                <button onClick={() => setNotificationsOpen(false)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {attentionTickets.length === 0 ? (
                  <p className="p-5 text-center text-sm text-slate-500">Alles ruhig. Keine dringenden Tickets.</p>
                ) : (
                  attentionTickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      onClick={() => openTicket(ticket.id)}
                      className="flex w-full gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400">{ticketReference(ticket)}</span>
                          <PriorityBadge priority={ticket.priority} />
                        </div>
                        <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{relativeTime(ticket.updated_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />
      </header>

      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/35 px-4 pt-[10vh] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSearchOpen(false);
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/50 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-slate-800">
              <Search size={20} className="shrink-0 text-sky-500" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titel, Bereich, Gerät, Kategorie oder HD-Referenz …"
                className="h-16 min-w-0 flex-1 border-0 bg-transparent px-0 text-base outline-none focus:ring-0 dark:bg-transparent"
              />
              <button onClick={() => setSearchOpen(false)} className="rounded-xl bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                ESC
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              <button
                onClick={() => {
                  setSearchOpen(false);
                  navigate('/app/tickets/new');
                }}
                className="mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-sky-50 dark:hover:bg-sky-950/40"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-xl text-white">+</span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Neues Ticket erstellen</p>
                  <p className="text-xs text-slate-500">Direkt zur Erfassung</p>
                </div>
              </button>

              {searchResults.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => openTicket(ticket.id)}
                  className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      <span>{ticketReference(ticket)}</span>
                      <span>•</span>
                      <span>{ticket.area}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{ticket.description}</p>
                  </div>
                  <PriorityBadge priority={ticket.priority} />
                </button>
              ))}

              {searchResults.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Kein Ticket gefunden.</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
