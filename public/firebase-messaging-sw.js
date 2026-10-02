// Service Worker v2.2 - Lokstor FCM Push Receiver
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

try {
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');
} catch (e) {
  console.error('[firebase-messaging-sw.js] Failed to load Firebase SDKs', e);
}

const firebaseConfig = {
  apiKey: "AIzaSyDeCWb_xVak0xFosm8AmFuHoUaY953q8FI",
  authDomain: "lokstor.firebaseapp.com",
  projectId: "lokstor",
  storageBucket: "lokstor.firebasestorage.app",
  messagingSenderId: "326292650921",
  appId: "1:326292650921:web:795611892af4580a5862b8"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    const data = payload.data || {};
    const notif = payload.notification || {};
    
    const title = data.title || notif.title || 'إشعار جديد 🛍️ (Lokstor)';
    const body = data.body || notif.body || 'لديك تحديث جديد في متجر Lokstor';
    const url = data.url || (payload.fcmOptions && payload.fcmOptions.link) || '/admin/orders';
    
    return self.registration.showNotification(title, {
      body: body,
      icon: '/logo.png',
      badge: '/logo.png',
      data: { url: url },
      requireInteraction: true,
      tag: 'lokstor-order-' + (data.orderId || Date.now()),
      renotify: true,
      vibrate: [200, 100, 200, 100, 200]
    });
  });
} catch (error) {
  console.error('[firebase-messaging-sw.js] Error initializing messaging', error);
}

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();
  
  const url = event.notification.data?.url || '/admin/orders';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
      for (const c of cs) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});

// A dummy fetch event listener is required for some browsers to consider the PWA installable.
self.addEventListener('fetch', function(event) {
  // We just let the browser do its default thing.
});
