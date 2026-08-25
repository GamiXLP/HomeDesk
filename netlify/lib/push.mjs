import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

function messaging() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const credentials = JSON.parse(raw);
  const app = getApps()[0] ?? initializeApp({ credential: cert(credentials) });
  return getMessaging(app);
}

export async function sendTicketPush(supabase, ticket, { title, body, excludeUserId } = {}) {
  const recipients = new Set([ticket.created_by, ticket.assigned_to].filter(Boolean));
  const { data: watchers, error: watcherError } = await supabase.from('ticket_watchers').select('user_id').eq('ticket_id', ticket.id);
  if (watcherError) throw watcherError;
  for (const watcher of watchers ?? []) recipients.add(watcher.user_id);
  if (excludeUserId) recipients.delete(excludeUserId);
  if (!recipients.size) return { sent: 0, skipped: true };

  const { data: devices, error } = await supabase.from('push_devices').select('id,token').eq('enabled', true).in('user_id', [...recipients]);
  if (error) throw error;
  if (!devices?.length) return { sent: 0, skipped: true };
  const client = messaging();
  if (!client) return { sent: 0, skipped: true, reason: 'Firebase not configured' };

  const result = await client.sendEachForMulticast({
    tokens: devices.map((device) => device.token),
    notification: { title: title ?? `HomeDesk · ${ticket.title}`, body: body ?? 'Das Ticket wurde aktualisiert.' },
    data: { ticketId: ticket.id, ticketNumber: String(ticket.ticket_number ?? ''), path: `/app/tickets/${ticket.ticket_number ?? ticket.id}` },
    android: { priority: 'high', notification: { channelId: 'homedesk_tickets', color: '#0ea5e9' } },
  });
  const invalidIds = devices.filter((_, index) => {
    const code = result.responses[index]?.error?.code;
    return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
  }).map((device) => device.id);
  if (invalidIds.length) await supabase.from('push_devices').update({ enabled: false }).in('id', invalidIds);
  return { sent: result.successCount, failed: result.failureCount };
}
