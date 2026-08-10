import { CalendarClock, ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Ticket } from '../../types/database';
import { cn } from '../../utils/cn';
import { relativeTime, ticketPath, ticketReference } from '../../utils/tickets';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { Card } from '../ui/Card';

export function TicketCard({ ticket, compact = false, unread = false }: { ticket: Ticket; compact?: boolean; unread?: boolean }) {
  return (
    <Link to={ticketPath(ticket)} className="block">
      <Card className={cn('render-lazy group relative overflow-hidden hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg dark:hover:border-sky-800', compact ? 'p-4' : 'p-5')}>
        {ticket.priority === 'urgent' && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />}
        {ticket.priority === 'high' && <span className="absolute inset-y-0 left-0 w-1 bg-orange-400" />}

        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {unread && <span className="h-2 w-2 rounded-full bg-sky-500" title="Seit deinem letzten Öffnen aktualisiert" />}
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{ticketReference(ticket)}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{relativeTime(ticket.updated_at)}</span>
            </div>

            <h3 className="mt-1.5 truncate text-base font-black tracking-tight text-slate-950 dark:text-white">{ticket.title}</h3>
            {!compact && <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{ticket.description}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><MapPin size={13} />{ticket.area}</span>
              <span>{ticket.category}</span>
              {ticket.desired_date && (
                <span className="flex items-center gap-1.5"><CalendarClock size={13} />Wunsch {new Intl.DateTimeFormat('de-DE').format(new Date(`${ticket.desired_date}T12:00:00`))}</span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-between gap-3">
            <div className="flex max-w-[160px] flex-wrap justify-end gap-1.5"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
            <ChevronRight size={18} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
