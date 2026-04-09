import { supabase } from './db';
import * as webpush from 'web-push';

let vapidSet = false;
function ensureVapid() {
  if (vapidSet) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  vapidSet = true;
}

export async function sendPushToOwner(owner: string, payload: { title: string; body: string; url?: string }) {
  ensureVapid();
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('owner', owner);
  if (!subs?.length) return;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, icon: '/boar.svg' })
      );
    } catch {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
  }
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  ensureVapid();
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs?.length) return;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, icon: '/boar.svg' })
      );
    } catch {
      await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    }
  }
}
