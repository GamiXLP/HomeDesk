import {
  AlertTriangle,
  ArrowRight,
  CircleUserRound,
  Clock3,
  Flame,
  Inbox,
  CircleDot,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/States';
import { useTickets } from '../hooks/useTickets';
import { getProfiles } from '../lib/tickets';
import type { Profile } from '../types/database';
import { daysSince, isTicketOpen, sortTicketsByAttention, ticketPath, ticketReference } from '../utils/tickets';

export function AdminPage() {
  const { tickets, unreadCount, lastUpdated } = useTickets();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);

  useEffect(() => {
    void getProfiles()
      .then(setProfiles)
      .catch((error) => console.warn('Profiles could not be loaded:', error))
      .finally(() => setProfilesLoading(false));
  }, []);

  const adminStats = useMemo(() => {
    const open = tickets.filter(isTicketOpen);
    const assignmentCounts = new Map<string, number>();
    for (const ticket of open) {
      if (ticket.assigned_to) assignmentCounts.set(ticket.assigned_to, (assignmentCounts.get(ticket.assigned_to) ?? 0) + 1);
    }

    return {
      open: open.length,
      new: open.filter((ticket) => ticket.status === 'new').length,
      high: open.filter((ticket) => ['high', 'urgent'].includes(ticket.priority)).length,
      stale: open.filter((ticket) => daysSince(ticket.updated_at) >= 7).length,
      unassigned: open.filter((ticket) => !ticket.assigned_to).length,
      queue: sortTicketsByAttention(open).slice(0, 10),
      aging: [
        { label: '0–2 Tage', count: open.filter((ticket) => daysSince(ticket.updated_at) < 3).length },
        { label: '3–6 Tage', count: open.filter((ticket) => daysSince(ticket.updated_at) >= 3 && daysSince(ticket.updated_at) < 7).length },
        { label: '7–13 Tage', count: open.filter((ticket) => daysSince(ticket.updated_at) >= 7 && daysSince(ticket.updated_at) < 14).length },
        { label: '14+ Tage', count: open.filter((ticket) => daysSince(ticket.updated_at) >= 14).length },
      ],
      assignmentCounts,
    };
  }, [tickets]);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-7 2xl:space-y-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-500"><ShieldCheck size={15} />Administration</div>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">HomeDesk Operations</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Arbeitsvorrat, Nutzerlast und Tickets mit Handlungsbedarf auf einen Blick.</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <CircleDot size={14} className="text-emerald-500" />
          Datenstand {lastUpdated ? lastUpdated.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'wird geladen'}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        <AdminMetric label="Offen" value={adminStats.open} icon={Inbox} href="/app/tickets?scope=open" />
        <AdminMetric label="Neu" value={adminStats.new} icon={AlertTriangle} href="/app/tickets?scope=open&status=new" />
        <AdminMetric label="Hoch/Dringend" value={adminStats.high} icon={Flame} href="/app/tickets?scope=open&sort=priority" />
        <AdminMetric label="Seit 7+ Tagen ruhig" value={adminStats.stale} icon={Clock3} href="/app/tickets?scope=open&age=7" />
        <AdminMetric label="Nicht zugewiesen" value={adminStats.unassigned} icon={CircleUserRound} href="/app/tickets?scope=open&assigned=none" />
        <AdminMetric label="Ungelesen" value={unreadCount} icon={Wrench} href="/app/tickets" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.75fr)] 2xl:gap-8">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6 dark:border-slate-800">
            <div><p className="section-kicker">Arbeitsvorrat</p><h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Priorisierte Admin-Queue</h3></div>
            <Link to="/app/tickets?scope=open&sort=priority" className="text-xs font-bold text-sky-600 dark:text-sky-300">Alle öffnen</Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {adminStats.queue.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">Keine offenen Tickets.</div>
            ) : adminStats.queue.map((ticket) => (
              <Link key={ticket.id} to={ticketPath(ticket)} className="group flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/70 sm:px-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black text-slate-400">{ticketReference(ticket)}</span><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
                  <p className="mt-1.5 truncate text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{ticket.area} · letzte Änderung vor {daysSince(ticket.updated_at)} Tag(en)</p>
                </div>
                <ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500" />
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"><Users size={18} /></div><div><p className="section-kicker">Nutzer</p><p className="text-xl font-black text-slate-950 dark:text-white">{profilesLoading ? '…' : profiles.length}</p></div></div>
            <div className="mt-5 space-y-2">
              {profilesLoading ? <LoadingState rows={2} /> : profiles.map((profile) => {
                const assigned = adminStats.assignmentCounts.get(profile.id) ?? 0;
                return (
                  <div key={profile.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-700 shadow-sm dark:bg-slate-700 dark:text-white">{profile.display_name.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{profile.display_name}</p><p className="text-[11px] text-slate-500">{profile.role === 'admin' ? 'Administrator' : 'Benutzer'}</p></div>
                    <div className="text-right"><p className="text-sm font-black text-slate-900 dark:text-white">{assigned}</p><p className="text-[9px] uppercase tracking-wide text-slate-400">offen</p></div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <p className="section-kicker">Alter offener Tickets</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Aging</h3>
            <div className="mt-5 space-y-3">
              {adminStats.aging.map((bucket) => <AgingBar key={bucket.label} label={bucket.label} value={bucket.count} max={Math.max(1, adminStats.open)} />)}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

function AdminMetric({ label, value, icon: Icon, href }: { label: string; value: number; icon: typeof Inbox; href: string }) {
  return (
    <Link to={href} className="block">
      <Card className="group p-5 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg dark:hover:border-sky-800">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">{value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-500 group-hover:text-white dark:bg-sky-950/60 dark:text-sky-300"><Icon size={18} /></div></div>
      </Card>
    </Link>
  );
}

function AgingBar({ label, value, max }: { label: string; value: number; max: number }) {
  return <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span><span className="font-black text-slate-900 dark:text-white">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" style={{ width: `${value === 0 ? 0 : Math.max(4, (value / max) * 100)}%` }} /></div></div>;
}
