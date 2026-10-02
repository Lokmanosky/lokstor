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

const db = admin.firestore();

async function checkRecentOrders() {
  const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(5).get();
  console.log(`Found ${snap.docs.length} recent orders:`);
  snap.docs.forEach(doc => {
    const d = doc.data();
    console.log(`- Order ${doc.id}: Date=${new Date(d.createdAt).toISOString()} Customer=${d.customerName} Price=${d.productPrice} fcmToken=${d.fcmToken ? d.fcmToken.slice(0, 20) + '...' : 'NONE'}`);
  });
}

checkRecentOrders().catch(console.error);
