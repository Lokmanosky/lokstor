import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

async function checkRateLimit(ip: string): Promise<boolean> {
  if (!adminDb) return true;
  try {
    const rlRef = adminDb.collection('rateLimits').doc(`presence_${ip}`);
    const docSnap = await rlRef.get();
    
    const now = Date.now();
    const limit = 60; // max 60 pings per minute per IP
    const windowMs = 60000;
    
    if (docSnap.exists) {
      const data = docSnap.data()!;
      if (now - data.lastRequest < windowMs) {
        if (data.count >= limit) return false;
        await rlRef.update({ count: data.count + 1 });
      } else {
        await rlRef.update({ count: 1, lastRequest: now });
      }
    } else {
      await rlRef.set({ count: 1, lastRequest: now });
    }
    return true;
  } catch (error) {
    return true; // fail open
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not configured' }, { status: 500 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const rawBody = await req.text();
    if (rawBody.length > 500) {
      return NextResponse.json({ success: false, error: 'Payload too large' }, { status: 413 });
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const visitorId = parsedBody.visitorId;
    const isNewVisitor = Boolean(parsedBody.isNewVisitor);

    if (!visitorId || typeof visitorId !== 'string' || visitorId.length > 100) {
      return NextResponse.json({ success: false, error: 'Invalid visitorId' }, { status: 400 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const ref = adminDb.collection('active_users').doc(visitorId);
    
    if (action === 'leave') {
      await ref.delete();
    } else {
      await ref.set({ lastActive: Date.now() });

      // Update analytics only on initial ping
      if (action === 'visit') {
        const statsRef = adminDb.collection('analytics').doc('global');
        const updatePayload: Record<string, any> = { totalVisits: FieldValue.increment(1) };
        if (isNewVisitor) {
          updatePayload.uniqueVisitors = FieldValue.increment(1);
        }
        await statsRef.set(updatePayload, { merge: true });
      }
    }

    // Cleanup old users randomly (5% chance)
    if (Math.random() < 0.05) {
      const oldUsers = await adminDb.collection('active_users')
        .where('lastActive', '<', Date.now() - 60000)
        .limit(50)
        .get();
      
      if (!oldUsers.empty) {
        const batch = adminDb.batch();
        oldUsers.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Presence API Error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
