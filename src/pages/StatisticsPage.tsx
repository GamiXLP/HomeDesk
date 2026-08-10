import { Activity, BarChart3, CheckCircle2, Clock3, Flame, Gauge, TimerReset, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { ErrorState, LoadingState } from '../components/ui/States';
import { areas, categories, statusLabels } from '../constants/tickets';
import { useTickets } from '../hooks/useTickets';
import type { Ticket } from '../types/database';
import { daysSince, isTicketOpen } from '../utils/tickets';

type Period = '30' | '90' | '180' | '365' | 'all';

export function StatisticsPage() {
  const { tickets, loading, error, refresh } = useTickets();
  const [period, setPeriod] = useState<Period>('180');
  const [area, setArea] = useState('all');
  const [category, setCategory] = useState('all');

  const filteredTickets = useMemo(() => {
    const cutoff = period === 'all' ? null : Date.now() - Number(period) * 86_400_000;
    return tickets.filter((ticket) => {
      if (cutoff && new Date(ticket.created_at).getTime() < cutoff) return false;
      if (area !== 'all' && ticket.area !== area) return false;
      if (category !== 'all' && ticket.category !== category) return false;
      return true;
    });
  }, [area, category, period, tickets]);

  const metrics = useMemo(() => buildMetrics(filteredTickets), [filteredTickets]);

  const previousCount = useMemo(() => {
    if (period === 'all') return null;
    const days = Number(period);
    const now = Date.now();
    const currentStart = now - days * 86_400_000;
    const previousStart = now - days * 2 * 86_400_000;
    return tickets.filter((ticket) => {
      const created = new Date(ticket.created_at).getTime();
      if (created < previousStart || created >= currentStart) return false;
      if (area !== 'all' && ticket.area !== area) return false;
      if (category !== 'all' && ticket.category !== category) return false;
      return true;
    }).length;
  }, [area, category, period, tickets]);

  if (loading && tickets.length === 0) return <LoadingState rows={4} />;
  if (error && tickets.length === 0) return <ErrorState message={error} onRetry={() => void refresh(true)} />;

  const maxMonthValue = Math.max(1, ...metrics.recentMonths.flatMap((month) => [month.created, month.done]));
  const volumeDelta = previousCount === null || previousCount === 0 ? null : Math.round(((filteredTickets.length - previousCount) / previousCount) * 100);

  return (
    <div className="space-y-7 2xl:space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-500">Insights</p>
          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Wie läuft HomeDesk?</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Volumen, Geschwindigkeit und Schwerpunkte – interaktiv filterbar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="filter-select" value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
            <option value="30">Letzte 30 Tage</option><option value="90">Letzte 90 Tage</option><option value="180">Letzte 6 Monate</option><option value="365">Letzte 12 Monate</option><option value="all">Gesamter Zeitraum</option>
          </select>
          <select className="filter-select" value={area} onChange={(event) => setArea(event.target.value)}><option value="all">Alle Bereiche</option>{areas.map((item) => <option key={item}>{item}</option>)}</select>
          <select className="filter-select" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">Alle Kategorien</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <Metric label="Tickets im Zeitraum" value={filteredTickets.length} icon={BarChart3} hint={volumeDelta === null ? undefined : `${volumeDelta >= 0 ? '+' : ''}${volumeDelta}% vs. davor`} />
        <Metric label="Offen" value={metrics.open} icon={Clock3} />
        <Metric label="Erledigt" value={metrics.done} icon={CheckCircle2} />
        <Metric label="Abschlussquote" value={`${metrics.completionRate}%`} icon={Gauge} />
        <Metric label="Ø Lösungszeit" value={metrics.avgResolution} icon={Trophy} />
        <Metric label="Ältestes offen" value={metrics.oldestOpen} icon={TimerReset} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,.65fr)] 2xl:gap-8">
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="section-kicker">6-Monats-Verlauf</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Erstellt vs. erledigt</h3></div>
            <div className="flex gap-3 text-[11px] font-bold text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500" />Erstellt</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" />Erledigt</span></div>
          </div>

          <div className="mt-8 grid h-64 grid-cols-6 items-end gap-3 sm:gap-5 xl:h-72">
            {metrics.recentMonths.map((month) => (
              <div key={month.key} className="flex h-full flex-col justify-end">
                <div className="flex flex-1 items-end justify-center gap-1.5">
                  <div className="group relative w-3 rounded-t-lg bg-sky-500 transition hover:brightness-110 sm:w-5 xl:w-6" style={{ height: `${month.created === 0 ? 1.5 : Math.max(4, (month.created / maxMonthValue) * 100)}%` }}><ChartTip value={`${month.created} erstellt`} /></div>
                  <div className="group relative w-3 rounded-t-lg bg-emerald-500 transition hover:brightness-110 sm:w-5 xl:w-6" style={{ height: `${month.done === 0 ? 1.5 : Math.max(4, (month.done / maxMonthValue) * 100)}%` }}><ChartTip value={`${month.done} erledigt`} /></div>
                </div>
                <p className="mt-3 text-center text-[11px] font-bold uppercase text-slate-400">{month.label}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-500 dark:bg-red-950/60 dark:text-red-300"><Flame size={19} /></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Dringend offen</p><p className="text-2xl font-black text-slate-950 dark:text-white">{metrics.urgent}</p></div></div>
          <div className="mt-6"><h3 className="text-sm font-black text-slate-900 dark:text-white">Status-Verteilung</h3><div className="mt-4 space-y-3">{topEntries(metrics.byStatus, 7).map(([label, value]) => <HorizontalBar key={label} label={label} value={value} max={filteredTickets.length || 1} />)}</div></div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2 2xl:gap-8">
        <DistributionCard title="Top Kategorien" data={metrics.byCategory} total={filteredTickets.length} linkKey="category" />
        <DistributionCard title="Top Bereiche" data={metrics.byArea} total={filteredTickets.length} linkKey="area" />
      </section>

      <Card className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        <Insight icon={Activity} label="Durchschnitt pro Monat" value={metrics.avgPerMonth} text="neu erstellte Tickets im betrachteten Zeitraum" />
        <Insight icon={CheckCircle2} label="Erledigt im selben Zeitraum" value={`${metrics.done}`} text="Tickets wurden abgeschlossen" />
        <Insight icon={Flame} label="Hohe Priorität" value={`${metrics.highPriority}`} text="offene Tickets sind hoch oder dringend" />
      </Card>
    </div>
  );
}

function buildMetrics(tickets: Ticket[]) {
  const open = tickets.filter(isTicketOpen);
  const done = tickets.filter((ticket) => ticket.status === 'done');
  const resolvedHours = done.filter((ticket) => ticket.closed_at).map((ticket) => (new Date(ticket.closed_at!).getTime() - new Date(ticket.created_at).getTime()) / 3_600_000).filter((hours) => Number.isFinite(hours) && hours >= 0);
  const averageResolutionHours = resolvedHours.length ? resolvedHours.reduce((sum, value) => sum + value, 0) / resolvedHours.length : 0;
  const byCategory = countBy(tickets, (ticket) => ticket.category);
  const byArea = countBy(tickets, (ticket) => ticket.area);
  const byStatus = countBy(tickets, (ticket) => statusLabels[ticket.status]);
  const recentMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5 - index));
    return { key: `${date.getFullYear()}-${date.getMonth()}`, label: new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date), created: 0, done: 0 };
  });
  for (const ticket of tickets) {
    const created = new Date(ticket.created_at); const createdMonth = recentMonths.find((month) => month.key === `${created.getFullYear()}-${created.getMonth()}`); if (createdMonth) createdMonth.created += 1;
    if (ticket.closed_at) { const closed = new Date(ticket.closed_at); const closedMonth = recentMonths.find((month) => month.key === `${closed.getFullYear()}-${closed.getMonth()}`); if (closedMonth) closedMonth.done += 1; }
  }
  const dates = tickets.map((ticket) => new Date(ticket.created_at).getTime());
  const spanMonths = dates.length ? Math.max(1, (Date.now() - Math.min(...dates)) / (30.44 * 86_400_000)) : 1;
  const oldest = open.length ? Math.max(...open.map((ticket) => daysSince(ticket.created_at))) : 0;
  return {
    open: open.length,
    done: done.length,
    urgent: open.filter((ticket) => ticket.priority === 'urgent').length,
    highPriority: open.filter((ticket) => ticket.priority === 'high' || ticket.priority === 'urgent').length,
    completionRate: tickets.length ? Math.round((done.length / tickets.length) * 100) : 0,
    avgResolution: formatDuration(averageResolutionHours),
    oldestOpen: open.length ? `${oldest} T.` : '—',
    avgPerMonth: (tickets.length / spanMonths).toFixed(tickets.length < 10 ? 1 : 0),
    byCategory, byArea, byStatus, recentMonths,
  };
}

function Metric({ label, value, icon: Icon, hint }: { label: string; value: number | string; icon: typeof BarChart3; hint?: string }) {
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>{hint && <p className="mt-1 text-[10px] font-bold text-sky-600 dark:text-sky-300">{hint}</p>}</div><div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"><Icon size={17} /></div></div></Card>;
}

function DistributionCard({ title, data, total, linkKey }: { title: string; data: Record<string, number>; total: number; linkKey: 'area' | 'category' }) {
  return <Card className="p-5 sm:p-6"><h3 className="text-lg font-black text-slate-950 dark:text-white">{title}</h3><p className="mt-1 text-xs text-slate-500">Klicke auf einen Eintrag, um die passenden Tickets zu öffnen.</p><div className="mt-5 space-y-4">{topEntries(data, 8).map(([label, value]) => <Link key={label} to={`/app/tickets?${linkKey}=${encodeURIComponent(label)}`} className="block rounded-xl transition hover:bg-slate-50 dark:hover:bg-slate-800/60"><HorizontalBar label={label} value={value} max={total || 1} /></Link>)}</div></Card>;
}

function HorizontalBar({ label, value, max }: { label: string; value: number; max: number }) {
  return <div className="p-1"><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-600 dark:text-slate-300">{label}</span><span className="font-black text-slate-900 dark:text-white">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${value === 0 ? 0 : Math.max(3, (value / max) * 100)}%` }} /></div></div>;
}

function Insight({ icon: Icon, label, value, text }: { icon: typeof Activity; label: string; value: string; text: string }) {
  return <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm dark:bg-slate-700 dark:text-sky-300"><Icon size={17} /></div><div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-xl font-black text-slate-950 dark:text-white">{value}</p><p className="mt-0.5 text-xs text-slate-500">{text}</p></div></div>;
}

function ChartTip({ value }: { value: string }) {
  return <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-2 py-1 text-[10px] font-bold text-white shadow-lg group-hover:block">{value}</span>;
}

function countBy<T>(items: T[], pick: (item: T) => string) { return items.reduce<Record<string, number>>((result, item) => { const key = pick(item); result[key] = (result[key] ?? 0) + 1; return result; }, {}); }
function topEntries(data: Record<string, number>, limit: number) { return Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, limit); }
function formatDuration(hours: number) { if (!hours) return '—'; if (hours < 24) return `${Math.round(hours)} Std.`; return `${(hours / 24).toFixed(hours < 48 ? 1 : 0)} Tage`; }
