import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Order } from '@/types';
import { getChargilyClient, isChargilyConfigured } from '@/lib/chargily';
import { processOrderDelivery } from '@/lib/delivery';

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const isOwner = decodedToken.email?.toLowerCase() === 'loktech.dz@gmail.com' && decodedToken.email_verified;

    let order: Order | null = null;

    if (adminDb) {
      try {
        const docSnap = await adminDb.collection('orders').doc(orderId).get();
        if (docSnap.exists) {
          order = { id: docSnap.id, ...docSnap.data() } as Order;
        }
      } catch (e) {}
    }

    if (!order) {
      try {
        const docRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          order = { id: docSnap.id, ...docSnap.data() } as Order;
        }
      } catch (err) {}
    }

    if (!order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    if (!isOwner && (order as any).userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Auto-verify with Chargily API if pending and chargilyInvoiceId exists
    if (order.status !== 'paid' && order.chargilyInvoiceId && isChargilyConfigured) {
      try {
        const chargily = getChargilyClient();
        const chargilyCheckout = await chargily.getCheckout(order.chargilyInvoiceId);

        if (chargilyCheckout && (chargilyCheckout.status === 'paid')) {
          const paidAmount = Number(order.productPrice || (order as any).amount || 0);
          const deliveryResult = await processOrderDelivery(orderId, paidAmount, 'chargily');
          if (deliveryResult.success && deliveryResult.orderData) {
            order = { ...order, ...deliveryResult.orderData } as Order;
          }
        }
      } catch (chErr) {
        console.error('Chargily verify status check error:', chErr);
      }
    }

    // Mock confirm simulation helper for dev testing when Chargily Webhooks are local
    if (mockConfirm && order.status !== 'paid' && process.env.NODE_ENV !== 'production') {
      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).update({ status: 'paid', paidAt: Date.now(), isMock: true });
        order.status = 'paid';
      }
    }

    // Security check: Only return downloadUrl if status === 'paid'
    if (order.status !== 'paid') {
      const { downloadUrl, downloadToken, ...safeOrder } = order as any;
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
