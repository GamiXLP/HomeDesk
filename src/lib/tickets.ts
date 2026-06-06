import { supabase } from './supabase';
import { sendTicketEmailNotification } from './notifications';
import type { Ticket, TicketComment, TicketPriority, TicketStatus } from '../types/database';

export async function getTickets() {
  const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('updated_at', { ascending: false });

  if (error) throw error;

  return data as Ticket[];
}

export async function getTicket(id: string) {
  const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
      .single();

  if (error) throw error;

  return data as Ticket;
}

export async function createTicket(
    input: Omit<
        Ticket,
        'id' | 'status' | 'created_at' | 'updated_at' | 'closed_at' | 'archived_at' | 'assigned_to'
    >,
) {
  const { data, error } = await supabase
      .from('tickets')
      .insert(input)
      .select('*')
      .single();

  if (error) throw error;

  const ticket = data as Ticket;

  await sendTicketEmailNotification({
    eventType: 'ticket_created',
    ticketId: ticket.id,
  }).catch((notificationError) => {
    console.warn('Ticket created, but email notification failed:', notificationError);
  });

  return ticket;
}

export async function updateTicketAdmin(
    id: string,
    patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'area'>>,
) {
  const before = await getTicket(id);

  const payload: Record<string, unknown> = { ...patch };

  if (patch.status === 'done') {
    payload.closed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
      .from('tickets')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

  if (error) throw error;

  const ticket = data as Ticket;
  const changes = buildTicketChanges(before, ticket, patch);

  await sendTicketEmailNotification({
    eventType: 'ticket_updated',
    ticketId: ticket.id,
    changes,
  }).catch((notificationError) => {
    console.warn('Ticket updated, but email notification failed:', notificationError);
  });

  return ticket;
}

export async function deleteTicketAdmin(id: string) {
  await sendTicketEmailNotification({
    eventType: 'ticket_deleted',
    ticketId: id,
  }).catch((notificationError) => {
    console.warn('Ticket delete mail failed, ticket will still be deleted:', notificationError);
  });

  const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);

  if (error) throw error;
}

export async function getComments(ticketId: string) {
  const { data, error } = await supabase
      .from('ticket_comments')
      .select('*, profiles(display_name, role)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

  if (error) throw error;

  return data as TicketComment[];
}

export async function addComment(
    ticketId: string,
    authorId: string,
    body: string,
    visibility: 'public' | 'internal',
) {
  const { data, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id: ticketId,
        author_id: authorId,
        body,
        visibility,
      })
      .select('*')
      .single();

  if (error) throw error;

  const comment = data as TicketComment;

  await sendTicketEmailNotification({
    eventType: 'comment_created',
    ticketId,
    commentId: comment.id,
  }).catch((notificationError) => {
    console.warn('Comment created, but email notification failed:', notificationError);
  });

  return comment;
}

function buildTicketChanges(
    before: Ticket,
    after: Ticket,
    patch: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'area'>>,
) {
  const changes: Record<string, string> = {};

  if (patch.status && before.status !== after.status) {
    changes.Status = `${statusLabels[before.status]} → ${statusLabels[after.status]}`;
  }

  if (patch.priority && before.priority !== after.priority) {
    changes.Priorität = `${priorityLabels[before.priority]} → ${priorityLabels[after.priority]}`;
  }

  if (patch.category && before.category !== after.category) {
    changes.Kategorie = `${before.category} → ${after.category}`;
  }

  if (patch.area && before.area !== after.area) {
    changes.Bereich = `${before.area} → ${after.area}`;
  }

  return changes;
}

const statusLabels: Record<TicketStatus, string> = {
  new: 'Neu',
  seen: 'Gesehen',
  planned: 'Geplant',
  in_progress: 'In Bearbeitung',
  waiting_feedback: 'Wartet auf Rückmeldung',
  waiting_parts: 'Wartet auf Teile',
  tested: 'Getestet',
  done: 'Erledigt',
  rejected: 'Abgelehnt',
  archived: 'Archiviert',
};

const priorityLabels: Record<TicketPriority, string> = {
  low: 'Niedrig',
  normal: 'Normal',
  high: 'Hoch',
  urgent: 'Dringend',
};

export const typed = {
  status: (s: string) => s as TicketStatus,
  priority: (p: string) => p as TicketPriority,
};