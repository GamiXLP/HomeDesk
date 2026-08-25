import { createClient } from '@supabase/supabase-js';
import { decryptHomeAssistantRefreshToken } from '../lib/home-assistant-crypto.mjs';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export default async (request) => {
  if (request.method !== 'GET') return json({ ok: false, error: 'Method not allowed.' }, 405);
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ ok: false, error: 'Nicht angemeldet.' }, 401);
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await supabase.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return json({ ok: false, error: 'Sitzung abgelaufen.' }, 401);
    const { data: identity, error } = await supabase.from('home_assistant_identities').select('home_assistant_user_id,refresh_token_encrypted,refresh_token_iv,refresh_token_auth_tag,token_client_id').eq('supabase_user_id', auth.user.id).maybeSingle();
    if (error) throw error;
    if (!identity?.refresh_token_encrypted) return json({ ok: false, error: 'Home Assistant ist nicht verknüpft.' }, 409);
    const refreshToken = decryptHomeAssistantRefreshToken(identity.refresh_token_encrypted, identity.refresh_token_iv, identity.refresh_token_auth_tag, identity.home_assistant_user_id);
    const baseUrl = (process.env.HOME_ASSISTANT_URL || '').replace(/\/$/, '');
    if (!baseUrl) throw new Error('HOME_ASSISTANT_URL fehlt.');
    const tokenResponse = await fetch(`${baseUrl}/auth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: identity.token_client_id }) });
    if (!tokenResponse.ok) throw new Error(`Home Assistant Tokenfehler (${tokenResponse.status}).`);
    const token = await tokenResponse.json();
    const statesResponse = await fetch(`${baseUrl}/api/states`, { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!statesResponse.ok) throw new Error(`Home Assistant nicht erreichbar (${statesResponse.status}).`);
    const states = await statesResponse.json();
    const wanted = new URL(request.url).searchParams.get('entity_id');
    const safeStates = states.filter((state) => !wanted || state.entity_id === wanted).map((state) => ({ entity_id: state.entity_id, state: state.state, last_changed: state.last_changed, attributes: { friendly_name: state.attributes?.friendly_name, device_class: state.attributes?.device_class, unit_of_measurement: state.attributes?.unit_of_measurement, battery_level: state.attributes?.battery_level } }));
    return json({ ok: true, states: safeStates, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error('HA states error:', error);
    return json({ ok: false, error: error instanceof Error ? error.message : 'HA-Status konnte nicht geladen werden.' }, 502);
  }
};
