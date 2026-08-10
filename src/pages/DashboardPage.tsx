import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot, Clock3, Flame, Plus, Sparkles, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AreaTile } from '../components/dashboard/AreaTile';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { TicketCard } from '../components/tickets/TicketCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { areas, statusLabels } from '../constants/tickets';
import { useAuth } from '../hooks/useAuth';
import { usePreferences } from '../hooks/usePreferences';
import { useTickets } from '../hooks/useTickets';
import { friendlyDisplayName, isTicketOpen, sortTicketsByAttention, ticketPath } from '../utils/tickets';

export function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const { preferences } = usePreferences();
  const { tickets, unreadTicketIds, unreadCount, loading, error, refresh } = useTickets();

  const stats = useMemo(() => {
    const openTickets = tickets.filter(isTicketOpen);
    const done = tickets.filter((ticket) => ticket.status === 'done').length;
    return {
      open: openTickets.length,
      progress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
      waiting: tickets.filter((ticket) => ticket.status.startsWith('waiting')).length,
      done,
      high: openTickets.filter((ticket) => ['high', 'urgent'].includes(ticket.priority)).length,
      new: tickets.filter((ticket) => ticket.status === 'new').length,
      attention: sortTicketsByAttention(openTickets).slice(0, 5),
      completion: tickets.length ? Math.round((done / tickets.length) * 100) : 100,
    };
  }, [tickets]);

  const recentTickets = useMemo(
    () => tickets
      .filter((ticket) => preferences.showArchivedOnDashboard || ticket.status !== 'archived')
      .slice(0, preferences.dashboardRecentCount),
    [preferences.dashboardRecentCount, preferences.showArchivedOnDashboard, tickets],
  );

  if (loading && tickets.length === 0) return <LoadingState rows={4} />;
  if (error && tickets.length === 0) return <ErrorState message={error} onRetry={() => void refresh(true)} />;

  return (
    <div className="min-w-0 space-y-5 sm:space-y-7 2xl:space-y-8">
      <section className="relative min-w-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-4 py-5 text-slate-950 shadow-xl shadow-slate-200/40 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:shadow-slate-950/30 sm:rounded-[34px] sm:px-8 sm:py-9 xl:px-10 xl:py-10">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-500/30" />
        <div className="absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-400/20" />
        <div className="relative grid min-w-0 gap-5 sm:gap-7 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
          <div className="min-w-0 max-w-3xl">
            <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600 dark:text-sky-300 sm:text-xs sm:tracking-[0.18em]"><Sparkles size={13} className="shrink-0" /><span className="truncate">Smart Home Command Center</span></div>
            <h2 className="mt-2 break-words text-[28px] font-black leading-[1.05] tracking-tight sm:mt-3 sm:text-4xl xl:text-[42px]">Hallo {friendlyDisplayName(profile?.display_name)} 👋</h2>
            <p className="mt-2 max-w-2xl text-[13px] leading-5 text-slate-600 dark:text-slate-300 sm:mt-3 sm:text-base sm:leading-6">
              {stats.open === 0
                ? 'Im Moment ist alles erledigt. Das Smart Home hat heute nichts zu meckern.'
                : `${stats.open} ${stats.open === 1 ? 'Thema ist' : 'Themen sind'} noch offen. ${stats.high > 0 ? `${stats.high} davon ${stats.high === 1 ? 'hat' : 'haben'} hohe Priorität.` : 'Nichts davon ist aktuell kritisch.'}`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap">
              <Link to="/app/tickets?scope=open" className="min-w-0"><Button variant="secondary" className="w-full border-slate-200 bg-slate-100 px-3 text-slate-900 hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 sm:w-auto sm:px-4">Offene Tickets <ArrowRight size={15} /></Button></Link>
              <Link to="/app/tickets/new" className="min-w-0"><Button className="w-full px-3 sm:w-auto sm:px-4"><Plus size={16} />Neues Ticket</Button></Link>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-3 gap-1.5 rounded-3xl border border-slate-200 bg-slate-50/80 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.07] dark:shadow-none sm:gap-2 sm:p-3">
            <HeroMetric label="Ungelesen" value={unreadCount} />
            <HeroMetric label="Abschluss" value={`${stats.completion}%`} />
            <HeroMetric label="Kritisch" value={stats.high} />
          </div>
        </div>
      </section>

      <section className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <DashboardCard label={isAdmin ? 'Offen' : 'Meine offenen'} value={stats.open} icon={CircleDot} tone="sky" hint="Aktive Themen" />
        <DashboardCard label="In Arbeit" value={stats.progress} icon={Wrench} tone="orange" hint={statusLabels.in_progress} />
        <DashboardCard label="Wartet" value={stats.waiting} icon={Clock3} tone="violet" hint="Feedback oder Teile" />
        <DashboardCard label="Erledigt" value={stats.done} icon={CheckCircle2} tone="emerald" hint="Abgeschlossene Tickets" />
        <DashboardCard label="Priorität" value={stats.high} icon={Flame} tone="red" hint="Hoch oder dringend" />
        <DashboardCard label="Neu" value={stats.new} icon={AlertTriangle} tone="sky" hint="Noch ungesehen" />
      </section>

      <section className="grid min-w-0 gap-5 sm:gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,.8fr)] 2xl:gap-8">
        <div className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
            <div className="min-w-0"><p className="section-kicker">Räume & Bereiche</p><h3 className="section-title">Wo ist gerade etwas los?</h3></div>
            <Link to="/app/tickets?scope=open" className="shrink-0 text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">Alle</Link>
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
            {areas.map((area) => <AreaTile key={area} area={area} count={tickets.filter((ticket) => ticket.area === area && isTicketOpen(ticket)).length} />)}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-3 sm:mb-4"><p className="section-kicker">Priorisierte Queue</p><h3 className="section-title">Als Nächstes sinnvoll</h3></div>
          <Card className="min-w-0 overflow-hidden p-1.5 sm:p-2">
            {stats.attention.length === 0 ? (
              <div className="p-7 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={30} /><p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Queue ist leer</p><p className="mt-1 text-xs text-slate-500">Keine offenen Tickets vorhanden.</p></div>
            ) : (
              stats.attention.map((ticket, index) => (
                <Link key={ticket.id} to={ticketPath(ticket)} className="flex min-w-0 items-center gap-2.5 rounded-2xl p-3 transition active:scale-[0.99] hover:bg-slate-50 dark:hover:bg-slate-800 sm:gap-3 sm:p-3.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300 sm:h-9 sm:w-9 sm:text-xs">{index + 1}</span>
                  <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><p className="truncate text-[13px] font-bold text-slate-900 dark:text-white sm:text-sm">{ticket.title}</p>{unreadTicketIds.has(ticket.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />}</div><p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">{ticket.area} · {statusLabels[ticket.status]}</p></div>
                  <ArrowRight size={15} className="shrink-0 text-slate-300" />
                </Link>
              ))
            )}
          </Card>
        </div>
      </section>

      <section className="min-w-0">
        <div className="mb-3 flex items-end justify-between gap-3 sm:mb-4">
          <div className="min-w-0"><p className="section-kicker">Letzte Aktivität</p><h3 className="section-title">Zuletzt aktualisiert</h3></div>
          <Link to="/app/tickets" className="shrink-0 text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">Alle Tickets</Link>
        </div>
        <div className="grid min-w-0 gap-2.5 sm:gap-3 2xl:grid-cols-2">
          {recentTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} compact unread={unreadTicketIds.has(ticket.id)} />)}
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: number | string }) {
  return <div className="min-w-0 rounded-2xl bg-white px-1.5 py-2.5 text-center shadow-sm dark:bg-white/[0.06] dark:shadow-none sm:px-3 sm:py-3"><p className="truncate text-lg font-black tracking-tight text-slate-950 dark:text-white sm:text-xl">{value}</p><p className="mt-0.5 truncate text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:text-[10px]">{label}</p></div>;
}
