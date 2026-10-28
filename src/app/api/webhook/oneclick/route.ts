import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { processOrderDelivery } from '@/lib/delivery';
import { checkOneClickPayment } from '@/lib/oneclick';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid JSON' }, { status: 400 });
    }

    // Extract payment reference or order ID
    const paymentRef = body.data?.paymentRef || body.paymentRef || body.ref;
    let orderId = body.data?.orderId || body.orderId || body.data?.metadata?.order_id || body.metadata?.order_id;

    if (!paymentRef && !orderId) {
      return NextResponse.json({ success: false, message: 'Missing paymentRef and orderId' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, message: 'DB not available' }, { status: 500 });
    }

    // If orderId is not directly in payload, search for order by oneclickPaymentRef
    if (!orderId && paymentRef) {
      const snap = await adminDb.collection('orders').where('oneclickPaymentRef', '==', paymentRef).limit(1).get();
      if (!snap.empty) {
        orderId = snap.docs[0].id;
      }
    }

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'Order not found for reference' }, { status: 404 });
    }

    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ success: false, message: 'Order doc not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;
    if (orderData.status === 'paid') {
      return NextResponse.json({ success: true, message: 'Order already paid' });
    }

    // Verify payment status with OneClickDz API
    const refToCheck = paymentRef || orderData.oneclickPaymentRef;
    if (refToCheck) {
      const verifyResult = await checkOneClickPayment(refToCheck);
      if (!verifyResult.success || !verifyResult.isPaid) {
        console.warn('OneClick webhook verification was not confirmed:', verifyResult);
        return NextResponse.json({ success: false, message: 'Payment not confirmed' }, { status: 400 });
      }
    }

    const paidAmount = Number(orderData.productPrice || orderData.amount || 0);
    const deliveryResult = await processOrderDelivery(orderId, paidAmount, 'oneclick');

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully',
      deliveryResult,
    });
  } catch (error: any) {
    console.error('OneClickDz webhook error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

