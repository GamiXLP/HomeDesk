import { BarChart3, CheckCircle2, Clock3, Flame, Gauge, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { statusLabels } from '../constants/tickets';
import { useTickets } from '../hooks/useTickets';
import { isTicketOpen } from '../utils/tickets';

export function StatisticsPage() {
  const { tickets, loading, error, refresh } = useTickets();

  const metrics = useMemo(() => {
    const open = tickets.filter(isTicketOpen);
    const done = tickets.filter((ticket) => ticket.status === 'done');
    const resolvedHours = done
      .filter((ticket) => ticket.closed_at)
      .map((ticket) => (new Date(ticket.closed_at!).getTime() - new Date(ticket.created_at).getTime()) / 3_600_000)
      .filter((hours) => Number.isFinite(hours) && hours >= 0);

    const averageResolutionHours = resolvedHours.length
      ? resolvedHours.reduce((sum, value) => sum + value, 0) / resolvedHours.length
      : 0;

    const byCategory = countBy(tickets, (ticket) => ticket.category);
    const byArea = countBy(tickets, (ticket) => ticket.area);
    const byStatus = countBy(tickets, (ticket) => statusLabels[ticket.status]);

    const recentMonths = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      return {
        key,
        label: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date),
        created: 0,
        done: 0,
      };
    });

    for (const ticket of tickets) {
      const created = new Date(ticket.created_at);
      const createdKey = `${created.getFullYear()}-${created.getMonth()}`;
      const createdMonth = recentMonths.find((month) => month.key === createdKey);
      if (createdMonth) createdMonth.created += 1;

      if (ticket.closed_at) {
        const closed = new Date(ticket.closed_at);
        const closedKey = `${closed.getFullYear()}-${closed.getMonth()}`;
        const closedMonth = recentMonths.find((month) => month.key === closedKey);
        if (closedMonth) closedMonth.done += 1;
      }
    }

    return {
      open: open.length,
      done: done.length,
      urgent: open.filter((ticket) => ticket.priority === 'urgent').length,
      completionRate: tickets.length ? Math.round((done.length / tickets.length) * 100) : 0,
      avgResolution: formatDuration(averageResolutionHours),
      byCategory,
      byArea,
      byStatus,
      recentMonths,
    };
  }, [tickets]);

  if (loading && tickets.length === 0) return <LoadingState rows={4} />;
  if (error && tickets.length === 0) return <ErrorState message={error} onRetry={() => void refresh(true)} />;

  const maxMonthValue = Math.max(1, ...metrics.recentMonths.flatMap((month) => [month.created, month.done]));

  return (
    <div className="space-y-7">
      <section>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-500">Insights</p>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Wie läuft HomeDesk?</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ein schneller Blick auf Volumen, Geschwindigkeit und Schwerpunkte.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Tickets gesamt" value={tickets.length} icon={BarChart3} />
        <Metric label="Offen" value={metrics.open} icon={Clock3} />
        <Metric label="Erledigt" value={metrics.done} icon={CheckCircle2} />
        <Metric label="Abschlussquote" value={`${metrics.completionRate}%`} icon={Gauge} />
        <Metric label="Ø Lösungszeit" value={metrics.avgResolution} icon={Trophy} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="p-6">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">6 Monate</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Erstellt vs. erledigt</h3>
            </div>
            <div className="flex gap-3 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" /> Erstellt</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Erledigt</span>
            </div>
          </div>

          <div className="mt-8 grid h-64 grid-cols-6 items-end gap-3 sm:gap-5">
            {metrics.recentMonths.map((month) => (
              <div key={month.key} className="flex h-full flex-col justify-end">
                <div className="flex flex-1 items-end justify-center gap-1.5">
                  <div className="w-3 rounded-t-lg bg-sky-500 sm:w-5" style={{ height: `${Math.max(4, (month.created / maxMonthValue) * 100)}%` }} title={`${month.created} erstellt`} />
                  <div className="w-3 rounded-t-lg bg-emerald-500 sm:w-5" style={{ height: `${Math.max(4, (month.done / maxMonthValue) * 100)}%` }} title={`${month.done} erledigt`} />
                </div>
                <p className="mt-3 text-center text-[11px] font-bold uppercase text-slate-400">{month.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/60 dark:text-red-300"><Flame size={19} /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Dringend offen</p>
              <p className="text-2xl font-black text-slate-950 dark:text-white">{metrics.urgent}</p>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Status-Verteilung</h3>
            <div className="mt-4 space-y-3">
              {topEntries(metrics.byStatus, 6).map(([label, value]) => (
                <HorizontalBar key={label} label={label} value={value} max={tickets.length || 1} />
              ))}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DistributionCard title="Top Kategorien" data={metrics.byCategory} total={tickets.length} />
        <DistributionCard title="Top Bereiche" data={metrics.byArea} total={tickets.length} />
      </section>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof BarChart3 }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"><Icon size={17} /></div>
      </div>
    </Card>
  );
}

function DistributionCard({ title, data, total }: { title: string; data: Record<string, number>; total: number }) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-5 space-y-4">
        {topEntries(data, 7).map(([label, value]) => <HorizontalBar key={label} label={label} value={value} max={total || 1} />)}
      </div>
    </Card>
  );
}

function HorizontalBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="truncate font-semibold text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-black text-slate-900 dark:text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
      </div>
    </div>
  );
}

function countBy<T>(items: T[], pick: (item: T) => string) {
  return items.reduce<Record<string, number>>((result, item) => {
    const key = pick(item);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

function topEntries(data: Record<string, number>, limit: number) {
  return Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function formatDuration(hours: number) {
  if (!hours) return '—';
  if (hours < 24) return `${Math.round(hours)} Std.`;
  return `${(hours / 24).toFixed(hours < 48 ? 1 : 0)} Tage`;
}
