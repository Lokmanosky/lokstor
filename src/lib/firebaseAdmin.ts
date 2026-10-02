import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let app: any = null;

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
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim(),
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

export const adminDb = app ? getFirestore(app) : (null as any);
export const adminAuth = app ? getAuth(app) : (null as any);

