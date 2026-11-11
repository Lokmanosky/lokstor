import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import { clearHomepageMemoryCache } from '@/app/page';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin email
    const isAdmin =
      decodedToken.email_verified &&
      decodedToken.email?.toLowerCase() === 'loktech.dz@gmail.com';

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = Date.now();

    // 1. Clear in-memory server cache
    try {
      clearHomepageMemoryCache();
    } catch (e) {
      console.warn('Failed to clear homepage memory cache:', e);
    }

    // 2. Revalidate Next.js ISR cache
    try {
      revalidatePath('/', 'layout');
      revalidatePath('/');
    } catch (e) {
      console.warn('revalidatePath error:', e);
    }

    // 3. Update Firestore settings to signal all client browsers
    if (adminDb) {
      await adminDb.collection('settings').doc('store').set({
        forceRefreshTimestamp: now,
        lastForcedRefreshBy: decodedToken.email,
      }, { merge: true });
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      message: 'تم فرض التحديث القسري وتطهير الكاش بنجاح.'
    });
  } catch (error: any) {
    console.error('Purge cache error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to purge cache' },
      { status: 500 }
    );
  }
}
