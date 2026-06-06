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

  if (patch.status === 'done') {
    await sendTicketEmailNotification({
      eventType: 'ticket_closed',
      ticketId: ticket.id,
    }).catch((notificationError) => {
      console.warn('Ticket closed, but email notification failed:', notificationError);
    });
  }

  return ticket;
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

export const typed = {
  status: (s: string) => s as TicketStatus,
  priority: (p: string) => p as TicketPriority,
};