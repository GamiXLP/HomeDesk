import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Card } from '../ui/Card';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import type { Ticket } from '../../types/database';
export function TicketCard({ ticket }: { ticket: Ticket }) {
  return <Link to={`/app/tickets/${ticket.id}`}><Card className="p-5 transition hover:-translate-y-0.5 hover:border-sky-200"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">{ticket.title}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{ticket.description}</p></div><div className="flex gap-2"><StatusBadge status={ticket.status}/><PriorityBadge priority={ticket.priority}/></div></div><div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500"><span>{ticket.category}</span><span>•</span><span>{ticket.area}</span><span>•</span><span>{format(new Date(ticket.created_at), 'dd.MM.yyyy')}</span></div></Card></Link>;
}
