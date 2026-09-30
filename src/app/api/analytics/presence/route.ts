import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not configured' }, { status: 500 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const { visitorId } = await req.json();

    if (!visitorId) return NextResponse.json({ success: false });

    const ref = adminDb.collection('active_users').doc(visitorId);
    
    if (action === 'leave') {
      await ref.delete();
    } else {
      await ref.set({ lastActive: Date.now() });
    }

    // Cleanup old users randomly (10% chance) to keep the collection small
    if (Math.random() < 0.1) {
      const oldUsers = await adminDb.collection('active_users')
        .where('lastActive', '<', Date.now() - 60000)
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
    return NextResponse.json({ success: false });
  }
}
