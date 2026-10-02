const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const admin = require('firebase-admin');

function getCleanPrivateKey() {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  let cleaned = rawKey.replace(/\\n/g, '\n').replace(/^["']|["']$/g, '').trim();
  return cleaned;
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: getCleanPrivateKey(),
  }),
});

const db = admin.firestore();
const messaging = admin.messaging();

async function run() {
  console.log('Fetching users from Firestore...');
  const snap = await db.collection('users').get();
  console.log('Found ' + snap.docs.length + ' user documents:');

  const tokens = [];
  snap.docs.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id} | Email: ${data.email} | Role: ${data.role} | Token: ${data.fcmToken ? data.fcmToken.slice(0, 30) + '...' : 'NONE'}`);
    if (data.fcmToken) {
      tokens.push({ id: doc.id, email: data.email, token: data.fcmToken });
    }
  });

  if (tokens.length === 0) {
    console.log('⚠️ No users have an fcmToken in Firestore!');
    return;
  }

  console.log(`\nFound ${tokens.length} tokens. Sending test message to all...`);
  
  for (const t of tokens) {
    console.log(`Sending to ${t.email || t.id}...`);
    try {
      // Send both data and notification or data-only to test
      const response = await messaging.send({
        token: t.token,
        data: {
          title: 'تجربة إشعار تجريبي 🚀',
          body: 'إذا وصلك هذا الإشعار فالـ Push Notification يعمل بنجاح في الخلفية!',
          url: '/admin/orders',
          sound: 'default'
        },
        // We also include webpush config to maximize compatibility
        webpush: {
          headers: {
            Urgency: 'high'
          },
          data: {
            title: 'تجربة إشعار تجريبي 🚀',
            body: 'إذا وصلك هذا الإشعار فالـ Push Notification يعمل بنجاح في الخلفية!',
            url: '/admin/orders'
          }
        }
      });
      console.log(`✅ Success for ${t.email || t.id}! Message ID:`, response);
    } catch (err) {
      console.error(`❌ Error sending to ${t.email || t.id}:`, err.message);
      if (err.code) console.error('Error code:', err.code);
    }
  }
}

run().catch(console.error);
