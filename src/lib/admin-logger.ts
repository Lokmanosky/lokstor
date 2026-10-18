import { db, auth } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AdminLog, AdminActionCategory, AdminActionType } from '@/types';

export interface LogInput {
  category: AdminActionCategory;
  actionType: AdminActionType;
  title: string;
  description: string;
  targetId?: string;
  targetName?: string;
  adminEmail?: string;
  adminName?: string;
  diff?: {
    before?: any;
    after?: any;
    changes?: Record<string, { from: any; to: any; label?: string }>;
  };
  metadata?: Record<string, any>;
}

// Clean any undefined fields recursively so Firestore never throws 'Unsupported field value: undefined'
function sanitizeForFirestore(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore).filter(v => v !== undefined);
  }
  if (obj !== null && typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) {
        cleaned[k] = sanitizeForFirestore(v);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Records an admin action into the `adminLogs` collection in Firestore.
 * This is non-blocking and will never throw an unhandled error to disrupt the admin UI.
 */
export async function logAdminActivity(input: LogInput): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    const email = input.adminEmail || currentUser?.email || 'loktech.dz@gmail.com';
    const name = input.adminName || currentUser?.displayName || email.split('@')[0] || 'المدير';
    const uid = currentUser?.uid || '';

    const payload: AdminLog = {
      category: input.category,
      actionType: input.actionType,
      title: input.title.trim(),
      description: input.description.trim(),
      targetId: input.targetId || '',
      targetName: input.targetName || '',
      adminEmail: email,
      adminName: name,
      adminUid: uid,
      diff: input.diff || {},
      metadata: input.metadata || {},
      createdAt: Date.now(),
    };

    const cleanPayload = sanitizeForFirestore(payload);
    const docRef = await addDoc(collection(db, 'adminLogs'), cleanPayload);
    return docRef.id;
  } catch (error) {
    console.warn('Could not record admin activity log:', error);
    return null;
  }
}
