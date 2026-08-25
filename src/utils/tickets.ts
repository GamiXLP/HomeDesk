import { closedStatuses } from '../constants/tickets';
import type { Ticket, TicketPriority } from '../types/database';

export function isTicketOpen(ticket: Ticket) {
  return !closedStatuses.includes(ticket.status);
}

type TicketIdentity = Pick<Ticket, 'id' | 'ticket_number'>;

export function ticketNumber(ticket: TicketIdentity) {
  return ticket.ticket_number ? String(ticket.ticket_number).padStart(8, '0') : null;
}

export function ticketReference(ticketOrId: TicketIdentity | string) {
  if (typeof ticketOrId !== 'string') {
    const number = ticketNumber(ticketOrId);
    if (number) return `HD-${number}`;
    return `HD-${ticketOrId.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  const normalized = ticketOrId.trim().replace(/^HD-/i, '');
  if (/^\d{8}$/.test(normalized)) return `HD-${normalized}`;
  return `HD-${ticketOrId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export function ticketPath(ticket: TicketIdentity) {
  return `/app/tickets/${ticketNumber(ticket) ?? ticket.id}`;
}

export function normalizeTicketIdentifier(value: string) {
  return value.trim().replace(/^HD-/i, '');
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

export function friendlyDisplayName(value?: string | null) {
  if (!value) return 'zurück';
  const firstPart = value.trim().split(/[\s._-]+/).filter(Boolean)[0] ?? value;
  return firstPart.charAt(0).toLocaleUpperCase('de-DE') + firstPart.slice(1);
}

export function sortTicketsByAttention(tickets: Ticket[]) {
  return [...tickets].sort((a, b) => {
    const priority = priorityWeight(b.priority) - priorityWeight(a.priority);
    if (priority !== 0) return priority;
    if (a.status === 'new' && b.status !== 'new') return -1;
    if (b.status === 'new' && a.status !== 'new') return 1;
    return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
  });
}
