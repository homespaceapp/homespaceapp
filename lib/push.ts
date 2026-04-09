import { supabase } from './db';
import * as webpush from 'web-push';

export const OWNER_LABELS: Record<string, string> = { adrian: 'Adrian', kasia: 'Kasia', oboje: 'Oboje' };

let vapidSet = false;
function ensureVapid() {
  if (vapidSet) return;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@loszkiapp.vercel.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidSet = true;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

export async function sendPushToOwner(owner: string, payload: PushPayload) {
  try {
    ensureVapid();
    const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('owner', owner);
    if (!subs?.length) return;
    const msg = JSON.stringify({ ...payload, icon: payload.icon || '/icon-192x192.png', badge: '/icon-96x96.png' });
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, msg);
      } catch {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  } catch { /* non-critical */ }
}

export async function sendPushToAll(payload: PushPayload) {
  try {
    ensureVapid();
    const { data: subs } = await supabase.from('push_subscriptions').select('*');
    if (!subs?.length) return;
    const msg = JSON.stringify({ ...payload, icon: payload.icon || '/icon-192x192.png', badge: '/icon-96x96.png' });
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, msg);
      } catch {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  } catch { /* non-critical */ }
}
