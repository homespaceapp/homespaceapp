import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import * as webpush from 'web-push';

// Cron: co godzinę — sprawdza czy jakieś przypomnienie powinno wyjść teraz
export async function GET() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  const now = new Date();
  // Okno: ±5 minut od pełnej godziny
  const windowStart = new Date(now);
  windowStart.setMinutes(now.getMinutes() - 5, 0, 0);
  const windowEnd = new Date(now);
  windowEnd.setMinutes(now.getMinutes() + 5, 0, 0);

  const { data: reminders } = await supabase
    .from('calendar_reminders')
    .select('*, calendar_events(*)');

  if (!reminders?.length) return NextResponse.json({ sent: 0 });

  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const reminder of reminders) {
    const event = reminder.calendar_events as {
      id: string; title: string; date: string; time: string | null; owner: string;
    };
    if (!event) continue;

    // Oblicz kiedy powinno wyjść przypomnienie
    const eventTime = event.time || '09:00';
    const [h, m] = eventTime.split(':').map(Number);
    const eventDatetime = new Date(`${event.date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
    const reminderAt = new Date(eventDatetime.getTime() - reminder.offset_minutes * 60 * 1000);

    if (reminderAt < windowStart || reminderAt > windowEnd) continue;

    const targets = subs.filter(s =>
      event.owner === 'oboje' || s.owner === event.owner
    );

    const offsetLabel = formatOffset(reminder.offset_minutes);
    const dateLabel = eventDatetime.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });

    for (const sub of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: `🔔 ${event.title}`,
            body: `Za ${offsetLabel} — ${dateLabel}${event.time ? ', ' + event.time : ''}`,
            icon: '/boar.svg',
          })
        );
        sent++;
      } catch {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  return NextResponse.json({ sent });
}

function formatOffset(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) {
    const h = Math.round(minutes / 60);
    return `${h} ${h === 1 ? 'godzinę' : h < 5 ? 'godziny' : 'godzin'}`;
  }
  const d = Math.round(minutes / (60 * 24));
  return `${d} ${d === 1 ? 'dzień' : d < 5 ? 'dni' : 'dni'}`;
}
