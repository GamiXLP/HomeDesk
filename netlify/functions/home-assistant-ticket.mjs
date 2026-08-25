import { createClient } from '@supabase/supabase-js';

const response = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export default async (request) => {
  if (request.method !== 'POST') return response(405, { ok: false, error: 'Method not allowed' });
  const secret = process.env.HOME_ASSISTANT_TICKET_WEBHOOK_SECRET;
  const ownerId = process.env.HOME_ASSISTANT_TICKET_OWNER_ID;
  const authorization = request.headers.get('authorization') ?? '';
  if (!secret || !ownerId) return response(503, { ok: false, error: 'Webhook is not configured' });
  if (authorization !== `Bearer ${secret}`) return response(401, { ok: false, error: 'Unauthorized' });
  try {
    const input = await request.json();
    const sourceReference = clean(input.source_reference, 0, 255, true);
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    if (input.event === 'resolved') {
      if (!sourceReference) return response(400, { ok: false, error: 'source_reference is required for resolved events' });
      const { data, error } = await supabase.rpc('resolve_ha_ticket', { p_source_reference: sourceReference, p_resolution: typeof input.resolution === 'string' ? input.resolution.slice(0, 2000) : 'Home Assistant meldet wieder Normalzustand.' });
      if (error) throw error;
      return response(200, { ok: true, ticketId: data, resolved: Boolean(data) });
    }
    const title = clean(input.title, 5, 160);
    const description = clean(input.description, 10, 5000);
    const entityId = clean(input.entity_id, 0, 255, true);
    const area = clean(input.area || 'Smart Home', 2, 100);
    const { data, error } = await supabase.rpc('create_ha_ticket', { p_title: title, p_description: description, p_entity_id: entityId, p_area: area, p_created_by: ownerId, p_source_reference: sourceReference });
    if (error) throw error;
    return response(201, { ok: true, ticketId: data });
  } catch (error) {
    console.error('HA ticket webhook failed:', error);
    return response(error?.message?.startsWith('Invalid ') ? 400 : 500, { ok: false, error: error?.message ?? 'Ticket could not be created' });
  }
};

function clean(value, min, max, optional = false) {
  if ((value === undefined || value === null || value === '') && optional) return null;
  if (typeof value !== 'string') throw new Error('Invalid input');
  const result = value.trim();
  if (result.length < min || result.length > max) throw new Error('Invalid input length');
  return result;
}
