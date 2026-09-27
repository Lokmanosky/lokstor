import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

export const isAdminConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
);

let adminApp: App | null = null;

if (getApps().length === 0) {
  if (isAdminConfigured) {
    try {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.warn('Firebase Admin initialization error:', error);
    }
  }
} else {
  adminApp = getApp();
}

export const adminDb: Firestore | null = (isAdminConfigured && adminApp) ? getFirestore(adminApp) : null;
export const adminStorage: Storage | null = (isAdminConfigured && adminApp) ? getStorage(adminApp) : null;
