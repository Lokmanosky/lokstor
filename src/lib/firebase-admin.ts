// Re-export from the single Firebase Admin initializer.
// All code should import from @/lib/firebaseAdmin directly;
// this shim exists only for backward-compat with older imports.
export { adminDb, adminAuth } from '@/lib/firebaseAdmin';

// adminStorage and adminMessaging live in firebaseAdmin too via the same app instance.
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';
import { getApps } from 'firebase-admin/app';
import '@/lib/firebaseAdmin'; // ensure app is initialized

export const adminStorage = getApps().length > 0 ? getStorage() : null;
export const adminMessaging = getApps().length > 0 ? getMessaging() : null;

export const isAdminConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PRIVATE_KEY)
);
