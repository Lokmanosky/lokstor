// Re-export from the single Firebase Admin initializer.
// All code should import from @/lib/firebaseAdmin directly;
// this shim exists only for backward-compat with older imports.
export { adminDb, adminAuth } from '@/lib/firebaseAdmin';

// adminStorage and adminMessaging live in firebaseAdmin too via the same app instance.
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';
import { getApps } from 'firebase-admin/app';
import '@/lib/firebaseAdmin'; // ensure app is initialized

let adminStorage: any = null;
let adminMessaging: any = null;
try {
  adminStorage = getApps().length > 0 ? getStorage() : null;
  adminMessaging = getApps().length > 0 ? getMessaging() : null;
} catch (e) {
  console.warn("Failed to initialize adminStorage or adminMessaging:", e);
}
export { adminStorage, adminMessaging };

export const isAdminConfigured = Boolean(
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_PRIVATE_KEY)
);
