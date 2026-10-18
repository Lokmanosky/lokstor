import { adminDb } from '@/lib/firebaseAdmin';
import { AdminLog, AdminActionCategory, AdminActionType } from '@/types';

export interface ServerLogInput {
  category: AdminActionCategory;
  actionType: AdminActionType;
  title: string;
  description: string;
  targetId?: string;
  targetName?: string;
  adminEmail?: string;
  adminName?: string;
  adminUid?: string;
  diff?: {
    before?: any;
    after?: any;
    changes?: Record<string, { from: any; to: any; label?: string }>;
  };
  metadata?: Record<string, any>;
}

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

export async function logServerAdminActivity(input: ServerLogInput): Promise<string | null> {
  try {
    const email = input.adminEmail || 'loktech.dz@gmail.com';
    const name = input.adminName || email.split('@')[0] || 'المدير';
    const uid = input.adminUid || '';

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
    const docRef = await adminDb.collection('adminLogs').add(cleanPayload);
    return docRef.id;
  } catch (error) {
    console.warn('Could not record server admin activity log:', error);
    return null;
  }
}
