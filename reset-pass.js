const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load env vars from .env.local
const envPath = 'D:\\2mypro\\lokstor\\.env.local';
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

if (!privateKey) {
  console.log("No private key found in .env.local");
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    })
  });
} catch(e) {
  // ignore if already initialized
}

const email = 'admin@lokstor.dz';
const password = 'loktech2026';

async function run() {
  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('User ' + email + ' exists. Updating password to loktech2026...');
      await admin.auth().updateUser(userRecord.uid, { password });
      console.log('Password updated successfully!');
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        console.log('User ' + email + ' not found. Creating user with password loktech2026...');
        userRecord = await admin.auth().createUser({ email, password });
        console.log('User created successfully!');
      } else {
        throw e;
      }
    }
    
    // Add custom claim 'admin' just in case you need it later
    await admin.auth().setCustomUserClaims(userRecord.uid, { admin: true });
    console.log('Admin claims set.');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
