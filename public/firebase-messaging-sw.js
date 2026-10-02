// Service Worker v3 - High Performance Native Push Receiver (Lokstor)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ✅ Native push listener: 100% reliable, zero external CDN dependencies
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);
  
  let p = {};
  if (event.data) {
    try {
      p = event.data.json();
    } catch (e) {
      try {
        p = { data: { body: event.data.text() } };
      } catch (_) {}
    }
  }

  // Handle both FCM data-only payload and standard notification payload
  const d = p.data || p;
  const n = p.notification || {};

  const title = d.title || n.title || '🔔 طلب جديد (Lokstor)';
  const body = d.body || n.body || 'لديك طلب جديد في المتجر';
  const url = d.url || (p.fcmOptions && p.fcmOptions.link) || '/admin/orders';
  const tag = d.tag || 'lokstor-order';

  const notificationOptions = {
    body: body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: { url: url },
    requireInteraction: true,
    renotify: true,
    tag: tag,
    vibrate: [200, 100, 200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  const url = event.notification.data?.url || '/admin/orders';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', () => {
  // Required for PWA installability
});
