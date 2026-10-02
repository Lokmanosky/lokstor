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
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'إشعار جديد';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/logo.png', // Fallback icon
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.error('[firebase-messaging-sw.js] Error initializing messaging', error);
}

self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// A dummy fetch event listener is required for some browsers to consider the PWA installable.
self.addEventListener('fetch', function(event) {
  // We just let the browser do its default thing.
});
