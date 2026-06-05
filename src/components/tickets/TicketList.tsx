import { useMemo, useState } from 'react';
import type { Ticket } from '../../types/database';
import { EmptyState } from '../ui/States';
import { TicketCard } from './TicketCard';
export function TicketList({ tickets }: { tickets: Ticket[] }) {
  const [query, setQuery] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const filtered = useMemo(() => tickets.filter(t => (!openOnly || !['done','rejected','archived'].includes(t.status)) && (`${t.title} ${t.description} ${t.category} ${t.area}`).toLowerCase().includes(query.toLowerCase())), [tickets, query, openOnly]);
  return <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tickets durchsuchen …" className="w-full rounded-xl border border-ha-border bg-white px-4 py-2 text-sm outline-none focus:border-ha-blue"/><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={openOnly} onChange={e=>setOpenOnly(e.target.checked)}/> Nur offen</label></div>{filtered.length === 0 ? <EmptyState/> : filtered.map(t => <TicketCard key={t.id} ticket={t}/>)}</div>;
}
