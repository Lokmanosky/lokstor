const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) process.env[k] = envConfig[k];

const admin = require('firebase-admin');

function getCleanPrivateKey() {
  return (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^["']|["']$/g, '').trim();
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: getCleanPrivateKey(),
  }),
});

const messaging = admin.messaging();

async function sendBothTests() {
  const token = 'f7B_G81uFyhxVafcd6S8QJ:APA91bGaD8p5XJ0yQEfFjEceGna8tRm7ALrRmHG-zfAZ3XpaWIBIuO_k9s4c3VPmZX_fW0O3muhkBSLLfLHCaRPSFmJihLGWgtcYMMp7ENupE54qdOL5CKA';

  console.log('Sending Test 1: Standard Webpush with notification payload...');
  try {
    const res1 = await messaging.send({
      token: token,
      notification: {
        title: '🔔 إشعار تجريبي فوري (Lokstor)',
        body: 'طلب جديد تجريبي رقم #9999 بقيمة 4500 د.ج',
      },
      data: {
        title: '🔔 إشعار تجريبي فوري (Lokstor)',
        body: 'طلب جديد تجريبي رقم #9999 بقيمة 4500 د.ج',
        url: 'https://lokstor.vercel.app/admin/orders'
      },
      webpush: {
        headers: {
          Urgency: 'high',
          TTL: '86400'
        },
        notification: {
          title: '🔔 إشعار تجريبي فوري (Lokstor)',
          body: 'طلب جديد تجريبي رقم #9999 بقيمة 4500 د.ج',
          icon: 'https://lokstor.vercel.app/logo.png',
          badge: 'https://lokstor.vercel.app/logo.png',
          requireInteraction: true,
          vibrate: [200, 100, 200],
          tag: 'test-order-notif',
          renotify: true
        },
        fcmOptions: {
          link: 'https://lokstor.vercel.app/admin/orders'
        }
      }
    });
    console.log('✅ Test 1 Success! Message ID:', res1);
  } catch (err) {
    console.error('❌ Test 1 Failed:', err);
  }
}

sendBothTests().catch(console.error);
