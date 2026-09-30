import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Order } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim();
    const email = searchParams.get('email')?.trim();
    const all = searchParams.get('all') === 'true';
    const adminEmail = searchParams.get('adminEmail')?.trim().toLowerCase();

    // Check if admin request
    const isOwner = adminEmail === 'loktech.dz@gmail.com';

    const orderMap = new Map<string, Order>();

    // 1. Try Firebase Admin DB (bypasses all security rules and indexes completely)
    if (adminDb) {
      try {
        if (all && isOwner) {
          const snap = await adminDb.collection('orders').get();
          snap.forEach(doc => {
            orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
          });
        } else {
          // Query by userId
          if (userId) {
            const snapUid = await adminDb.collection('orders').where('userId', '==', userId).get();
            snapUid.forEach(doc => {
              orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
            });
          }

          // Query by customerEmail (exact and lowercase)
          if (email) {
            const snapEmail1 = await adminDb.collection('orders').where('customerEmail', '==', email).get();
            snapEmail1.forEach(doc => {
              orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
            });

            const lower = email.toLowerCase();
            if (lower !== email) {
              const snapEmail2 = await adminDb.collection('orders').where('customerEmail', '==', lower).get();
              snapEmail2.forEach(doc => {
                orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
              });
            }
          }
        }
      } catch (adminErr) {
        console.warn('adminDb orders query error, falling back to client db:', adminErr);
      }
    }

    // 2. Fallback to client SDK db if adminDb had no results or is null
    if (orderMap.size === 0) {
      try {
        const ordersRef = collection(db, 'orders');

        if (all && isOwner) {
          const snap = await getDocs(ordersRef);
          snap.forEach(doc => {
            orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
          });
        } else {
          if (userId) {
            const qUid = query(ordersRef, where('userId', '==', userId));
            const snapUid = await getDocs(qUid);
            snapUid.forEach(doc => {
              orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
            });
          }

          if (email) {
            const qEmail1 = query(ordersRef, where('customerEmail', '==', email));
            const snapEmail1 = await getDocs(qEmail1);
            snapEmail1.forEach(doc => {
              orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
            });

            const lower = email.toLowerCase();
            if (lower !== email) {
              const qEmail2 = query(ordersRef, where('customerEmail', '==', lower));
              const snapEmail2 = await getDocs(qEmail2);
              snapEmail2.forEach(doc => {
                orderMap.set(doc.id, { id: doc.id, ...doc.data() } as Order);
              });
            }
          }
        }
      } catch (clientDbErr) {
        console.warn('clientDb orders query error:', clientDbErr);
      }
    }

    const orders = Array.from(orderMap.values()).sort(
      (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
    );

    return NextResponse.json({
      success: true,
      orders,
      total: orders.length,
    });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch orders', orders: [] },
      { status: 500 }
    );
  }
}
