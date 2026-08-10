import { closedStatuses } from '../constants/tickets';
import type { Ticket, TicketPriority } from '../types/database';

export function isTicketOpen(ticket: Ticket) {
  return !closedStatuses.includes(ticket.status);
}

export function ticketReference(ticketOrId: Ticket | string) {
  const id = typeof ticketOrId === 'string' ? ticketOrId : ticketOrId.id;
  return `HD-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function priorityWeight(priority: TicketPriority) {
  return { low: 1, normal: 2, high: 3, urgent: 4 }[priority];
}

export function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000));
}

export function relativeTime(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(date),
  );
}

export function sortTicketsByAttention(tickets: Ticket[]) {
  return [...tickets].sort((a, b) => {
    const priority = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (priority !== 0) return priority;
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
  });
}
