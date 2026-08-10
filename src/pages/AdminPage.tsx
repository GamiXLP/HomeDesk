import { AlertTriangle, ArrowRight, CircleUserRound, Flame, Inbox, ShieldCheck, Users, Wrench } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { LoadingState } from '../components/ui/States';
import { getProfiles } from '../lib/tickets';
import { useTickets } from '../hooks/useTickets';
import type { Profile } from '../types/database';
import { daysSince, isTicketOpen, sortTicketsByAttention, ticketReference } from '../utils/tickets';
import { PriorityBadge, StatusBadge } from '../components/ui/Badge';

export function AdminPage() {
  const { tickets } = useTickets();
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
    return {
      open: open.length,
      new: open.filter((ticket) => ticket.status === 'new').length,
      high: open.filter((ticket) => ['high', 'urgent'].includes(ticket.priority)).length,
      stale: open.filter((ticket) => daysSince(ticket.updated_at) >= 7).length,
      unassigned: open.filter((ticket) => !ticket.assigned_to).length,
      queue: sortTicketsByAttention(open).slice(0, 8),
    };
  }, [tickets]);

  return (
    <div className="space-y-7">
      <section>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-500"><ShieldCheck size={15} /> Administration</div>
        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white">HomeDesk Operations</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Arbeitsvorrat, Nutzer und Tickets mit Handlungsbedarf.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetric label="Offen" value={adminStats.open} icon={Inbox} />
        <AdminMetric label="Neu" value={adminStats.new} icon={AlertTriangle} />
        <AdminMetric label="Hoch/Dringend" value={adminStats.high} icon={Flame} />
        <AdminMetric label="Seit 7+ Tagen ruhig" value={adminStats.stale} icon={Wrench} />
        <AdminMetric label="Nicht zugewiesen" value={adminStats.unassigned} icon={CircleUserRound} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Arbeitsvorrat</p>
              <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">Priorisierte Admin-Queue</h3>
            </div>
            <Link to="/app/tickets?scope=open&sort=priority" className="text-xs font-bold text-sky-600 dark:text-sky-300">Alle öffnen</Link>
          </div>
          <div className="p-2">
            {adminStats.queue.map((ticket) => (
              <Link key={ticket.id} to={`/app/tickets/${ticket.id}`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">{ticketReference(ticket)}</span>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <p className="mt-1.5 truncate text-sm font-bold text-slate-900 dark:text-white">{ticket.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{ticket.area} · letzte Änderung vor {daysSince(ticket.updated_at)} Tag(en)</p>
                </div>
                <ArrowRight size={16} className="text-slate-300" />
              </Link>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300"><Users size={20} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nutzer</p>
                <p className="text-2xl font-black text-slate-950 dark:text-white">{profilesLoading ? '…' : profiles.length}</p>
              </div>
            </div>
            <div className="mt-5 space-y-2">
              {profilesLoading ? <LoadingState rows={2} /> : profiles.map((profile) => (
                <div key={profile.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-xs font-black shadow-sm dark:bg-slate-900">{profile.display_name.slice(0, 1).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{profile.display_name}</p>
                    <p className="text-xs text-slate-500">{profile.role === 'admin' ? 'Administrator' : 'Benutzer'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">System</p>
            <h3 className="mt-1 font-black text-slate-950 dark:text-white">Live-Verbindung aktiv</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Ticketdaten werden zentral gecacht und Änderungen per Supabase Realtime eingespielt. Falls Realtime im Projekt nicht veröffentlicht ist, funktioniert der manuelle Refresh weiterhin.</p>
          </Card>
        </div>
      </section>
    </div>
  );
}

function AdminMetric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Inbox }) {
  return <Card className="p-5"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300"><Icon size={18} /></div><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-2xl font-black text-slate-950 dark:text-white">{value}</p></div></div></Card>;
}
