import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  Flame,
  Plus,
  Sparkles,
  Wrench,
} from 'lucide-react';
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
import { useTickets } from '../hooks/useTickets';
import { isTicketOpen, sortTicketsByAttention } from '../utils/tickets';

export function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const { tickets, loading, error, refresh } = useTickets();

  const stats = useMemo(() => {
    const openTickets = tickets.filter(isTicketOpen);
    return {
      open: openTickets.length,
      progress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
      waiting: tickets.filter((ticket) => ticket.status.startsWith('waiting')).length,
      done: tickets.filter((ticket) => ticket.status === 'done').length,
      high: openTickets.filter((ticket) => ['high', 'urgent'].includes(ticket.priority)).length,
      new: tickets.filter((ticket) => ticket.status === 'new').length,
      attention: sortTicketsByAttention(openTickets).slice(0, 4),
    };
  }, [tickets]);

  if (loading && tickets.length === 0) return <LoadingState rows={4} />;
  if (error && tickets.length === 0) return <ErrorState message={error} onRetry={() => void refresh(true)} />;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[32px] bg-slate-950 px-6 py-7 text-white shadow-2xl shadow-slate-900/10 sm:px-8 sm:py-9">
        <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-sky-500/30 blur-3xl" />
        <div className="absolute -bottom-28 right-1/3 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
              <Sparkles size={14} /> Smart Home Command Center
            </div>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Hallo {profile?.display_name ?? 'zurück'} 👋
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              {stats.open === 0
                ? 'Im Moment ist alles erledigt. Das Smart Home hat heute nichts zu meckern.'
                : `${stats.open} ${stats.open === 1 ? 'Thema ist' : 'Themen sind'} noch offen. ${stats.high > 0 ? `${stats.high} davon sollten zuerst angeschaut werden.` : 'Nichts davon ist aktuell kritisch.'}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/tickets?scope=open">
              <Button variant="secondary" className="border-white/10 bg-white/10 text-white hover:bg-white/15 dark:bg-white/10">
                Offene Tickets <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/app/tickets/new">
              <Button>
                <Plus size={17} /> Neues Ticket
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <DashboardCard label={isAdmin ? 'Offen' : 'Meine offenen'} value={stats.open} icon={CircleDot} tone="sky" hint="Aktive Themen" />
        <DashboardCard label="In Arbeit" value={stats.progress} icon={Wrench} tone="orange" hint={statusLabels.in_progress} />
        <DashboardCard label="Wartet" value={stats.waiting} icon={Clock3} tone="violet" hint="Feedback oder Teile" />
        <DashboardCard label="Erledigt" value={stats.done} icon={CheckCircle2} tone="emerald" hint="Abgeschlossene Tickets" />
        {isAdmin && <DashboardCard label="Priorität" value={stats.high} icon={Flame} tone="red" hint="Hoch oder dringend" />}
        {isAdmin && <DashboardCard label="Neu" value={stats.new} icon={AlertTriangle} tone="sky" hint="Noch ungesehen" />}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Räume & Bereiche</p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Wo ist gerade etwas los?</h3>
            </div>
            <Link to="/app/tickets?scope=open" className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">
              Alle öffnen
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {areas.map((area) => (
              <AreaTile key={area} area={area} count={tickets.filter((ticket) => ticket.area === area && isTicketOpen(ticket)).length} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Priorisierte Queue</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Als Nächstes sinnvoll</h3>
          </div>
          <Card className="overflow-hidden p-2">
            {stats.attention.length === 0 ? (
              <div className="p-7 text-center">
                <CheckCircle2 className="mx-auto text-emerald-500" size={30} />
                <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Queue ist leer</p>
                <p className="mt-1 text-xs text-slate-500">Keine offenen Tickets vorhanden.</p>
              </div>
            ) : (
              stats.attention.map((ticket, index) => (
                <Link
                  key={ticket.id}
                  to={`/app/tickets/${ticket.id}`}
                  className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{ticket.area} · {statusLabels[ticket.status]}</p>
                  </div>
                  <ArrowRight size={15} className="text-slate-300" />
                </Link>
              ))
            )}
          </Card>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Letzte Aktivität</p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Zuletzt aktualisierte Tickets</h3>
          </div>
          <Link to="/app/tickets" className="text-xs font-bold text-sky-600 hover:text-sky-500 dark:text-sky-300">Alle Tickets</Link>
        </div>
        <div className="space-y-3">
          {tickets.slice(0, 5).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      </section>
    </div>
  );
}
