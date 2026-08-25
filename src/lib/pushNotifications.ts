import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabase';

export function supportsNativePush() { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; }

export async function enableAndroidPush(userId: string) {
  if (!supportsNativePush()) throw new Error('Android-Push ist nur in der installierten App verfügbar.');
  const current = await PushNotifications.checkPermissions();
  const permission = current.receive === 'prompt' ? await PushNotifications.requestPermissions() : current;
  if (permission.receive !== 'granted') throw new Error('Benachrichtigungen wurden nicht erlaubt.');

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    void PushNotifications.addListener('registration', async ({ value: token }) => {
      if (settled) return;
      settled = true;
      const { error } = await supabase.from('push_devices').upsert({ user_id: userId, platform: 'android', token, enabled: true, last_seen_at: new Date().toISOString() }, { onConflict: 'token' });
      if (error) reject(error); else resolve(token);
    });
    void PushNotifications.addListener('registrationError', (error) => { if (!settled) { settled = true; reject(new Error(error.error)); } });
    void PushNotifications.register();
  });
}

export async function disablePush(userId: string) {
  const { error } = await supabase.from('push_devices').update({ enabled: false }).eq('user_id', userId);
  if (error) throw error;
  if (supportsNativePush()) await PushNotifications.removeAllListeners();
}
