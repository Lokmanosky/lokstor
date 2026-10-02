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

async function checkUser() {
  const doc = await db.collection('users').doc('VB0xJpnjiDPoRk828pVbNHNAcZJ3').get();
  console.log('User doc exists:', doc.exists);
  if (doc.exists) {
    console.log('User data:', JSON.stringify(doc.data(), null, 2));
  }
}

checkUser().catch(console.error);
