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
    <div className="space-y-7 2xl:space-y-8">
      <section className="relative overflow-hidden rounded-[34px] bg-slate-950 px-6 py-7 text-white shadow-2xl shadow-slate-900/10 sm:px-8 sm:py-9 xl:px-10 xl:py-10">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-300"><Sparkles size={14} />Smart Home Command Center</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl xl:text-[42px]">Hallo {friendlyDisplayName(profile?.display_name)} 👋</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {stats.open === 0
                ? 'Im Moment ist alles erledigt. Das Smart Home hat heute nichts zu meckern.'
                : `${stats.open} ${stats.open === 1 ? 'Thema ist' : 'Themen sind'} noch offen. ${stats.high > 0 ? `${stats.high} davon ${stats.high === 1 ? 'hat' : 'haben'} hohe Priorität.` : 'Nichts davon ist aktuell kritisch.'}`}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/app/tickets?scope=open"><Button variant="secondary" className="border-white/10 bg-white/10 text-white hover:bg-white/15 dark:bg-white/10">Offene Tickets <ArrowRight size={16} /></Button></Link>
              <Link to="/app/tickets/new"><Button><Plus size={17} />Neues Ticket</Button></Link>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-white/10 bg-white/[0.07] p-3 backdrop-blur">
            <HeroMetric label="Ungelesen" value={unreadCount} />
            <HeroMetric label="Abschluss" value={`${stats.completion}%`} />
            <HeroMetric label="Kritisch" value={stats.high} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <DashboardCard label={isAdmin ? 'Offen' : 'Meine offenen'} value={stats.open} icon={CircleDot} tone="sky" hint="Aktive Themen" />
        <DashboardCard label="In Arbeit" value={stats.progress} icon={Wrench} tone="orange" hint={statusLabels.in_progress} />
        <DashboardCard label="Wartet" value={stats.waiting} icon={Clock3} tone="violet" hint="Feedback oder Teile" />
        <DashboardCard label="Erledigt" value={stats.done} icon={CheckCircle2} tone="emerald" hint="Abgeschlossene Tickets" />
        <DashboardCard label="Priorität" value={stats.high} icon={Flame} tone="red" hint="Hoch oder dringend" />
        <DashboardCard label="Neu" value={stats.new} icon={AlertTriangle} tone="sky" hint="Noch ungesehen" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(330px,.8fr)] 2xl:gap-8">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="section-kicker">Räume & Bereiche</p><h3 className="section-title">Wo ist gerade etwas los?</h3></div>
            <Link to="/app/tickets?scope=open" className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">Alle öffnen</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => <AreaTile key={area} area={area} count={tickets.filter((ticket) => ticket.area === area && isTicketOpen(ticket)).length} />)}
          </div>
        </div>

        <div>
          <div className="mb-4"><p className="section-kicker">Priorisierte Queue</p><h3 className="section-title">Als Nächstes sinnvoll</h3></div>
          <Card className="overflow-hidden p-2">
            {stats.attention.length === 0 ? (
              <div className="p-8 text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={30} /><p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Queue ist leer</p><p className="mt-1 text-xs text-slate-500">Keine offenen Tickets vorhanden.</p></div>
            ) : (
              stats.attention.map((ticket, index) => (
                <Link key={ticket.id} to={ticketPath(ticket)} className="flex items-center gap-3 rounded-2xl p-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">{index + 1}</span>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</p>{unreadTicketIds.has(ticket.id) && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />}</div><p className="mt-0.5 truncate text-xs text-slate-500">{ticket.area} · {statusLabels[ticket.status]}</p></div>
                  <ArrowRight size={15} className="text-slate-300" />
                </Link>
              ))
            )}
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="section-kicker">Letzte Aktivität</p><h3 className="section-title">Zuletzt aktualisierte Tickets</h3></div>
          <Link to="/app/tickets" className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">Alle Tickets</Link>
        </div>
        <div className="grid gap-3 2xl:grid-cols-2">
          {recentTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} compact unread={unreadTicketIds.has(ticket.id)} />)}
        </div>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl bg-white/[0.06] px-3 py-3 text-center"><p className="text-xl font-black tracking-tight text-white">{value}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>;
}
