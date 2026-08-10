import { AlertTriangle, Bell, Command, Inbox, RefreshCw, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTickets } from '../../hooks/useTickets';
import { cn } from '../../utils/cn';
import { isTicketOpen, relativeTime, sortTicketsByAttention, ticketPath, ticketReference } from '../../utils/tickets';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { ThemeToggle } from './ThemeToggle';

const titles: Record<string, string> = {
  '/app/dashboard': 'Übersicht',
  '/app/tickets': 'Tickets',
  '/app/tickets/new': 'Neues Ticket',
  '/app/statistics': 'Statistik',
  '/app/settings': 'Einstellungen',
  '/app/admin': 'Admin',
};

type NotificationTab = 'unread' | 'attention';

export function Topbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { tickets, unreadTicketIds, unreadCount, refresh, loading, lastUpdated } = useTickets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationTab, setNotificationTab] = useState<NotificationTab>('unread');
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
    if (!normalized) return tickets.slice(0, 8);
    return tickets
      .filter((ticket) =>
        `${ticketReference(ticket)} ${ticket.ticket_number ?? ''} ${ticket.title} ${ticket.description} ${ticket.category} ${ticket.area} ${ticket.device ?? ''}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 12);
  }, [query, tickets]);

  const unreadTickets = useMemo(
    () => tickets.filter((ticket) => unreadTicketIds.has(ticket.id)).slice(0, 12),
    [tickets, unreadTicketIds],
  );

  const attentionTickets = useMemo(
    () =>
      sortTicketsByAttention(
        tickets.filter(
          (ticket) => isTicketOpen(ticket) && (ticket.priority === 'urgent' || ticket.priority === 'high' || ticket.status === 'new'),
        ),
      ).slice(0, 10),
    [tickets],
  );

  const notificationTickets = notificationTab === 'unread' ? unreadTickets : attentionTickets;

  function openTicket(ticket: (typeof tickets)[number]) {
    setSearchOpen(false);
    setNotificationsOpen(false);
    navigate(ticketPath(ticket));
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 sm:gap-3 sm:px-6 lg:h-20 lg:px-8 2xl:px-10">
        <div className="min-w-0 flex-1">
          <p className="hidden text-[11px] font-bold uppercase tracking-[0.18em] text-sky-500 sm:block">HomeDesk</p>
          <h1 className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white lg:text-xl">{title}</h1>
        </div>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="hidden min-w-64 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm text-slate-400 shadow-sm transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500 dark:hover:border-slate-600 md:flex xl:min-w-80 2xl:min-w-96"
        >
          <Search size={17} />
          <span className="flex-1">Tickets durchsuchen …</span>
          <span className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
            <Command size={11} />K
          </span>
        </button>

        <button type="button" onClick={() => setSearchOpen(true)} className="topbar-icon md:hidden" aria-label="Suche öffnen">
          <Search size={19} />
        </button>

        <button
          type="button"
          onClick={() => void refresh(true)}
          className="topbar-icon hidden sm:flex"
          aria-label="Tickets aktualisieren"
          title={lastUpdated ? `Zuletzt aktualisiert: ${lastUpdated.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : 'Aktualisieren'}
        >
          <RefreshCw size={18} className={cn(loading && 'animate-spin')} />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((current) => !current)}
            className="topbar-icon relative"
            aria-label="Benachrichtigungen"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-slate-950">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 w-[min(94vw,430px)] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Benachrichtigungen</p>
                  <p className="text-xs text-slate-500">Änderungen und Tickets mit Handlungsbedarf</p>
                </div>
                <button onClick={() => setNotificationsOpen(false)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X size={16} />
                </button>
              </div>

              <div className="mx-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
                <NotificationTabButton active={notificationTab === 'unread'} onClick={() => setNotificationTab('unread')} icon={Inbox} label={`Neu für dich (${unreadCount})`} />
                <NotificationTabButton active={notificationTab === 'attention'} onClick={() => setNotificationTab('attention')} icon={AlertTriangle} label={`Priorität (${attentionTickets.length})`} />
              </div>

              <div className="mt-2 max-h-[440px] overflow-y-auto p-2">
                {notificationTickets.length === 0 ? (
                  <div className="p-7 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <Bell size={20} />
                    </div>
                    <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Alles ruhig</p>
                    <p className="mt-1 text-xs text-slate-500">Hier gibt es gerade nichts Neues.</p>
                  </div>
                ) : (
                  notificationTickets.map((ticket) => (
                    <button key={ticket.id} onClick={() => openTicket(ticket)} className="flex w-full gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800">
                      <span className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', unreadTicketIds.has(ticket.id) ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-700')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400">{ticketReference(ticket)}</span>
                          <StatusBadge status={ticket.status} />
                          <PriorityBadge priority={ticket.priority} />
                        </div>
                        <p className="mt-1.5 truncate text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{ticket.area} · {relativeTime(ticket.updated_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-slate-100 p-3 dark:border-slate-800">
                <button onClick={() => { setNotificationsOpen(false); navigate('/app/tickets'); }} className="w-full rounded-2xl px-3 py-2.5 text-xs font-bold text-sky-600 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/40">
                  Ticket Center öffnen
                </button>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle />
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-950/40 px-3 pt-[8vh] backdrop-blur-sm sm:px-4 sm:pt-[10vh]" onMouseDown={(event) => { if (event.currentTarget === event.target) setSearchOpen(false); }}>
          <div className="w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/50 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 sm:px-5 dark:border-slate-800">
              <Search size={20} className="shrink-0 text-sky-500" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titel, Bereich, Gerät, Kategorie oder Ticketnummer …"
                className="h-16 min-w-0 flex-1 border-0 bg-transparent px-0 text-base outline-none focus:ring-0 dark:bg-transparent sm:h-[72px]"
              />
              <button onClick={() => setSearchOpen(false)} className="rounded-xl bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800">ESC</button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-2">
              <button onClick={() => { setSearchOpen(false); navigate('/app/tickets/new'); }} className="mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-sky-50 dark:hover:bg-sky-950/40">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-xl text-white">+</span>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Neues Ticket erstellen</p>
                  <p className="text-xs text-slate-500">Direkt zur Erfassung</p>
                </div>
              </button>

              {searchResults.map((ticket) => (
                <button key={ticket.id} onClick={() => openTicket(ticket)} className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      <span>{ticketReference(ticket)}</span><span>•</span><span>{ticket.area}</span>
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

function NotificationTabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Inbox; label: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold transition', active ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white')}>
      <Icon size={13} /> {label}
    </button>
  );
}
