// Custom Service Worker — obsługa push notifications

self.addEventListener('activate', (event) => {
  // Poprzednia wersja PWA cache'owała Pulpit pod "/". Po zmianie ekranu
  // startowego usuwamy wyłącznie ten stary cache nawigacji.
  event.waitUntil(caches.delete('pages'));
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Wieloszki', body: event.data.text() };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192x192.png',
    badge: '/icon-96x96.png',
    data: { url: data.url || '/kalendarz' },
    tag: data.tag || 'wieloszki',
    renotify: true,
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Wieloszki', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/kalendarz';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windowClients) => {
      // Jeśli okno apki jest już otwarte — przejdź do URL z powiadomienia (deep link)
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin)) {
          if ('navigate' in client) {
            try {
              await client.navigate(url);
            } catch {
              // fallback — niektóre przeglądarki blokują navigate cross-origin
            }
          }
          if ('focus' in client) return client.focus();
          return;
        }
      }
      // Nic nie otwarte — otwórz nowe okno na właściwym URL
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
