import { CalendarClock, ChevronRight, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Ticket } from '../../types/database';
import { cn } from '../../utils/cn';
import { relativeTime, ticketPath, ticketReference } from '../../utils/tickets';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { Card } from '../ui/Card';

export function TicketCard({ ticket, compact = false, unread = false }: { ticket: Ticket; compact?: boolean; unread?: boolean }) {
  return (
    <Link to={ticketPath(ticket)} className="block min-w-0">
      <Card className={cn('render-lazy group relative min-w-0 overflow-hidden hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg dark:hover:border-sky-800', compact ? 'p-3.5 sm:p-4' : 'p-3.5 sm:p-5')}>
        {ticket.priority === 'urgent' && <span className="absolute inset-y-0 left-0 w-1 bg-red-500" />}
        {ticket.priority === 'high' && <span className="absolute inset-y-0 left-0 w-1 bg-orange-400" />}

        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
              {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" title="Seit deinem letzten Öffnen aktualisiert" />}
              <span className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-400 sm:text-[10px] sm:tracking-[0.14em]">{ticketReference(ticket)}</span>
              <span className="text-slate-300">•</span>
              <span className="shrink-0 text-[10px] font-semibold text-slate-500 dark:text-slate-400 sm:text-[11px]">{relativeTime(ticket.updated_at)}</span>
            </div>
            <ChevronRight size={17} className="mt-0.5 shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-sky-500 sm:hidden" />
          </div>

          <h3 className="mt-1.5 line-clamp-2 text-[15px] font-black leading-5 tracking-tight text-slate-950 dark:text-white sm:truncate sm:text-base">{ticket.title}</h3>
          {!compact && <p className="mt-1.5 hidden line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:block">{ticket.description}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>

          <div className="mt-3 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
            <span className="flex min-w-0 items-center gap-1.5"><MapPin size={12} className="shrink-0" /><span className="truncate">{ticket.area}</span></span>
            <span className="truncate">{ticket.category}</span>
            {ticket.desired_date && (
              <span className="hidden items-center gap-1.5 sm:flex"><CalendarClock size={13} />Wunsch {new Intl.DateTimeFormat('de-DE').format(new Date(`${ticket.desired_date}T12:00:00`))}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
