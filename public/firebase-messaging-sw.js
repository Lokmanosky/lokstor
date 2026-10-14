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
  let url = d.url || (p.fcmOptions && p.fcmOptions.link) || '/admin/orders';
  const tag = d.tag || 'lokstor-order';

  // Sanitize url: if it points to localhost (from dev testing), rewrite to production
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const parsed = new URL(url);
      url = `https://lokstor.vercel.app${parsed.pathname}${parsed.search}`;
    } catch (e) {
      url = 'https://lokstor.vercel.app/admin/orders';
    }
  }

  const notificationOptions = {
    body: body,
    icon: '/logo.png',
    badge: '/badge.png',
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
  let url = event.notification.data?.url || '/admin/orders';
  
  // If the notification URL mistakenly points to localhost (e.g. from local testing),
  // redirect it to the live production site so it opens properly on mobile devices.
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    try {
      const parsed = new URL(url);
      url = `https://lokstor.vercel.app${parsed.pathname}${parsed.search}`;
    } catch (e) {
      url = 'https://lokstor.vercel.app/admin/orders';
    }
  } else if (url.startsWith('/')) {
    const origin = (self.location && self.location.origin && !self.location.origin.includes('localhost'))
      ? self.location.origin
      : 'https://lokstor.vercel.app';
    url = `${origin}${url}`;
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url && (client.url.includes('/admin') || client.url.includes('lokstor.vercel.app')) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(url);
          }
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
