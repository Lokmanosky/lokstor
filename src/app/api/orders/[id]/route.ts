import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Order } from '@/types';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { searchParams } = new URL(req.url);
    const mockConfirm = searchParams.get('mock_confirm') === 'true';

    if (!orderId) {
      return NextResponse.json({ error: 'مُعرّف الطلب مطلوب' }, { status: 400 });
    }

    let order: Order | null = null;

    if (adminDb) {
      const docSnap = await adminDb.collection('orders').doc(orderId).get();
      if (docSnap.exists) {
        order = { id: docSnap.id, ...docSnap.data() } as Order;
      }
    }

    if (!order) {
      try {
        const docRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          order = { id: docSnap.id, ...docSnap.data() } as Order;
        }
      } catch (err) {
        // ignore
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 444 });
    }

    // Mock confirm simulation helper for dev testing when Chargily Webhooks are local
    if (mockConfirm && order.status !== 'paid') {
      const downloadToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const downloadUrl = `${baseUrl}/api/download?order_id=${orderId}&token=${downloadToken}&demo=true`;

      const updatedFields = {
        status: 'paid' as const,
        downloadToken,
        downloadUrl,
        downloadExpiresAt: expiresAt,
        paidAt: Date.now(),
      };

      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).update(updatedFields);
      } else {
        try {
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, updatedFields);
        } catch (e) {
          // ignore
        }
      }

      order = { ...order, ...updatedFields };
    }

    // Security check: Only return downloadUrl if status === 'paid'
    if (order.status !== 'paid') {
      const { downloadUrl, downloadToken, ...safeOrder } = order;
      return NextResponse.json({ order: safeOrder });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Fetch order error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ أثناء جلب الطلب' },
      { status: 500 }
    );
  }
}
