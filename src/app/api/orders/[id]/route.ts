import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Order } from '@/types';
import { getChargilyClient, isChargilyConfigured } from '@/lib/chargily';
import { processOrderDelivery } from '@/lib/delivery';
import { checkOneClickPayment, isOneClickConfigured } from '@/lib/oneclick';

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

    const guestToken = searchParams.get('token');
    const authHeader = req.headers.get('Authorization');
    let decodedToken: any = null;
    let isOwner = false;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      try {
        decodedToken = await adminAuth.verifyIdToken(idToken);
        isOwner = decodedToken.email?.toLowerCase() === 'loktech.dz@gmail.com' && decodedToken.email_verified;
      } catch (e) {
        // Token verification failed; fallback to guest token if present
      }
    }

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

    const isUserOrder = decodedToken && (
      (order as any).userId === decodedToken.uid ||
      ((order as any).customerEmail && (order as any).customerEmail.toLowerCase() === decodedToken.email?.toLowerCase())
    );
    const isGuestTokenValid = Boolean(
      guestToken &&
      (order as any).guestAccessToken &&
      (order as any).guestAccessToken === guestToken
    );

    if (!isOwner && !isUserOrder && !isGuestTokenValid) {
      return NextResponse.json({ error: 'غير مصرح لك بعرض هذا الطلب' }, { status: 403 });
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

    // Auto-verify with OneClickDz API if pending and oneclickPaymentRef exists
    if (order.status !== 'paid' && (order as any).oneclickPaymentRef && isOneClickConfigured()) {
      try {
        let customOneClickKey = '';
        if (adminDb) {
          try {
            const privateSnap = await adminDb.collection('settings').doc('private').get();
            if (privateSnap.exists) {
              customOneClickKey = privateSnap.data()?.oneclickApiKey || '';
            }
          } catch (err) {}
        }

        const onecheck = await checkOneClickPayment((order as any).oneclickPaymentRef, customOneClickKey);
        if (onecheck.success && onecheck.isPaid) {
          const paidAmount = Number(order.productPrice || (order as any).amount || 0);
          const deliveryResult = await processOrderDelivery(orderId, paidAmount, 'oneclick');
          if (deliveryResult.success && deliveryResult.orderData) {
            order = { ...order, ...deliveryResult.orderData } as Order;
          }
        }
      } catch (ocErr) {
        console.error('OneClickDz verify status check error:', ocErr);
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
