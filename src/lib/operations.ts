import { supabase } from './supabase';
import type { Asset, AssetEntity, HomeAssistantState, MaintenancePlan, UserNotification } from '../types/database';

export async function getOperationsData() {
  const [assets, entities, maintenance] = await Promise.all([
    supabase.from('assets').select('*').order('name'),
    supabase.from('asset_entities').select('*').order('entity_id'),
    supabase.from('maintenance_plans').select('*').order('next_due_at'),
  ]);
  if (assets.error) throw assets.error; if (entities.error) throw entities.error; if (maintenance.error) throw maintenance.error;
  return { assets: assets.data as Asset[], entities: entities.data as AssetEntity[], maintenance: maintenance.data as MaintenancePlan[] };
}
export async function createAsset(input: Partial<Asset> & Pick<Asset, 'name' | 'area' | 'category' | 'created_by'>) { const { data, error } = await supabase.from('assets').insert(input).select('*').single(); if (error) throw error; return data as Asset; }
export async function addAssetEntity(assetId: string, entityId: string) { const { error } = await supabase.from('asset_entities').insert({ asset_id: assetId, entity_id: entityId.trim() }); if (error) throw error; }
export async function createMaintenancePlan(input: Omit<MaintenancePlan, 'id' | 'created_at' | 'last_completed_at'>) { const { error } = await supabase.from('maintenance_plans').insert(input); if (error) throw error; }
export async function getHomeAssistantStates() { const { data: session } = await supabase.auth.getSession(); const response = await fetch('/.netlify/functions/home-assistant-states', { headers: { Authorization: `Bearer ${session.session?.access_token ?? ''}` } }); const body = await response.json(); if (!response.ok) throw new Error(body.error); return body.states as HomeAssistantState[]; }
export async function getNotifications() { const { data, error } = await supabase.from('user_notifications').select('*').order('created_at', { ascending: false }).limit(100); if (error) throw error; return data as UserNotification[]; }
export async function markNotificationRead(id: string) { const { error } = await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id); if (error) throw error; }
