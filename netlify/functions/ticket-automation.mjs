import { createClient } from '@supabase/supabase-js';
import { sendTicketPush } from '../lib/push.mjs';

export default async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const [{ data: recurringIds, error: recurringError }, { data: escalatedIds, error: escalationError }, { data: maintenanceIds, error: maintenanceError }] = await Promise.all([
    supabase.rpc('process_due_ticket_recurrences'),
    supabase.rpc('escalate_overdue_ticket_ids'),
    supabase.rpc('process_due_maintenance'),
  ]);
  if (recurringError) throw recurringError;
  if (escalationError) throw escalationError;
  if (maintenanceError) throw maintenanceError;
  const ids = [...(recurringIds ?? []), ...(escalatedIds ?? []), ...(maintenanceIds ?? [])];
  if (ids.length) {
    const { data: tickets, error } = await supabase.from('tickets').select('*').in('id', ids);
    if (error) throw error;
    for (const ticket of tickets ?? []) {
      const escalated = (escalatedIds ?? []).includes(ticket.id);
      const maintenance = (maintenanceIds ?? []).includes(ticket.id);
      await sendTicketPush(supabase, ticket, { title: escalated ? 'HomeDesk · Ticket eskaliert' : maintenance ? 'HomeDesk · Wartung fällig' : 'HomeDesk · Wiederkehrendes Ticket', body: ticket.title });
    }
  }
  return Response.json({ ok: true, recurring: recurringIds?.length ?? 0, escalated: escalatedIds?.length ?? 0, maintenance: maintenanceIds?.length ?? 0 });
};

export const config = { schedule: '*/15 * * * *' };
