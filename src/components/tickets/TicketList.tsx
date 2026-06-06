import { useMemo, useState } from 'react';
import type { Ticket } from '../../types/database';
import { EmptyState } from '../ui/States';
import { TicketCard } from './TicketCard';

export function TicketList({ tickets }: { tickets: Ticket[] }) {
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);

  const filtered = useMemo(
      () =>
          tickets.filter(
              (ticket) =>
                  (!openOnly || !['done', 'rejected', 'archived'].includes(ticket.status)) &&
                  `${ticket.title} ${ticket.description} ${ticket.category} ${ticket.area}`
                      .toLowerCase()
                      .includes(query.toLowerCase()),
          ),
      [tickets, query, openOnly],
  );

  return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tickets durchsuchen …"
              className="w-full rounded-xl border border-ha-border bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-ha-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
            <input
                type="checkbox"
                checked={openOnly}
                onChange={(event) => setOpenOnly(event.target.checked)}
                className="h-4 w-4 rounded border-ha-border accent-ha-blue dark:border-slate-700"
            />
            Nur offen
          </label>
        </div>

        <div className="space-y-4">
          {filtered.length === 0 ? <EmptyState /> : filtered.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      </div>
  );
}