import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getTickets } from '../lib/tickets';
import type { Ticket } from '../types/database';
import { DashboardCard } from '../components/dashboard/DashboardCard';
import { AreaTile } from '../components/dashboard/AreaTile';
import { TicketCard } from '../components/tickets/TicketCard';
import { areas } from '../constants/tickets';
import { Button } from '../components/ui/Button';

export function DashboardPage() {
  const { profile, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    getTickets().then(setTickets);
  }, []);

  const stats = useMemo(
      () => ({
        open: tickets.filter((ticket) => !['done', 'rejected', 'archived'].includes(ticket.status)).length,
        progress: tickets.filter((ticket) => ticket.status === 'in_progress').length,
        waiting: tickets.filter((ticket) => ticket.status.startsWith('waiting')).length,
        done: tickets.filter((ticket) => ticket.status === 'done').length,
        high: tickets.filter((ticket) => ['high', 'urgent'].includes(ticket.priority)).length,
        new: tickets.filter((ticket) => ticket.status === 'new').length,
      }),
      [tickets],
  );

  return (
      <div className="space-y-8">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Willkommen {profile?.display_name ?? 'zurück'}
            </p>
            <h2 className="text-3xl font-bold text-slate-950 dark:text-slate-100">Smart-Home-Zentrale</h2>
          </div>

          <Link to="/app/tickets/new">
            <Button>
              <PlusCircle className="mr-2" size={18} />
              Neues Ticket
            </Button>
          </Link>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <DashboardCard label={isAdmin ? 'Offene Tickets' : 'Meine offenen Tickets'} value={stats.open} />
          <DashboardCard label="In Bearbeitung" value={stats.progress} />
          <DashboardCard label="Wartet" value={stats.waiting} />
          <DashboardCard label="Erledigt" value={stats.done} />
          {isAdmin && <DashboardCard label="Hohe Priorität" value={stats.high} />}
          {isAdmin && <DashboardCard label="Neue Tickets" value={stats.new} />}
        </section>

        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-slate-100">Bereiche</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {areas.map((area) => (
                <AreaTile
                    key={area}
                    area={area}
                    count={tickets.filter((ticket) => ticket.area === area && !['done', 'archived', 'rejected'].includes(ticket.status)).length}
                />
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-950 dark:text-slate-100">Neueste Tickets</h3>
          <div className="space-y-4">
            {tickets.slice(0, 5).map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        </section>
      </div>
  );
}