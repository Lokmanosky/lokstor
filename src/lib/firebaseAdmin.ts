import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: any = null;

function getCleanPrivateKey() {
  const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
  let cleaned = rawKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
  
  if (cleaned && !cleaned.includes('\n')) {
    // If Vercel stripped all newlines and made it one single space-separated string
    cleaned = cleaned
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
    
    // Replace any spaces inside the base64 payload with nothing or newlines
    const parts = cleaned.split('\n');
    if (parts.length === 3) {
      parts[1] = parts[1].replace(/\s+/g, '');
      cleaned = parts.join('\n');
    }
  }
  return cleaned;
}

try {
  if (getApps().length === 0) {
    let credentialConfig;
    const envVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (envVar) {
      let jsonStr = envVar;
      if (!envVar.trim().startsWith('{')) {
        jsonStr = Buffer.from(envVar, 'base64').toString('utf8');
      }
      try {
        credentialConfig = cert(JSON.parse(jsonStr));
      } catch (e) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT");
      }
    }
    
    if (credentialConfig) {
      app = initializeApp({
        credential: credentialConfig,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
      app = initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: getCleanPrivateKey(),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } else {
      app = initializeApp();
    }
  } else {
    app = getApps()[0];
  }
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

let adminDb: any = null;
let adminAuth: any = null;
if (app) {
  try {
    adminDb = getFirestore(app);
    adminAuth = getAuth(app);
  } catch (e) {
    console.warn("Failed to initialize adminDb or adminAuth:", e);
  }
}
export { adminDb, adminAuth };
