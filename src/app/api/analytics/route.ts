import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not configured' }, { status: 500 });
    }

    const { uniqueId, isNewVisitor } = await req.json();

    const statsRef = adminDb.collection('analytics').doc('global');
    
    // Use a transaction to safely increment
    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(statsRef);
      
      if (!doc.exists) {
        transaction.set(statsRef, {
          totalVisits: 1,
          uniqueVisitors: isNewVisitor ? 1 : 0,
        });
      } else {
        const data = doc.data();
        transaction.update(statsRef, {
          totalVisits: (data?.totalVisits || 0) + 1,
          uniqueVisitors: isNewVisitor ? (data?.uniqueVisitors || 0) + 1 : (data?.uniqueVisitors || 0),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
