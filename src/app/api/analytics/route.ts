import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const { uniqueId, isNewVisitor } = await req.json();

    const statsRef = db.collection('analytics').doc('global');
    
    // Use a transaction to safely increment
    await db.runTransaction(async (transaction) => {
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
