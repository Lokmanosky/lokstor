import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { processOrderDelivery } from '@/lib/delivery';

export async function POST(req: NextRequest) {
  try {
    // 1. Signature Verification
    const signature = req.headers.get('signature');
    if (!signature) {
      console.warn('Webhook received without signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const rawBody = await req.text();
    let secret = (process.env.CHARGILY_API_SECRET || '').trim();
    if (adminDb) {
      try {
        const privateSnap = await adminDb.collection('settings').doc('private').get();
        if (privateSnap.exists && privateSnap.data()?.chargilyApiKey) {
          secret = privateSnap.data().chargilyApiKey.trim();
        }
      } catch (e) {}
    }
    if (!secret) {
      console.error('CHARGILY_API_SECRET is not configured');
      return NextResponse.json({ success: false, message: 'Webhook not configured' }, { status: 500 });
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const computedSignature = hmac.digest('hex');

    const signatureBuffer = Buffer.from(signature, 'utf8');
    const computedSignatureBuffer = Buffer.from(computedSignature, 'utf8');

    if (
      signatureBuffer.length !== computedSignatureBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, computedSignatureBuffer)
    ) {
      console.warn('Webhook signature mismatch');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = JSON.parse(rawBody);
    
    // Check if it's checkout.paid
    if (body.type !== 'checkout.paid') {
      return NextResponse.json({ success: true, message: 'Ignored event type' });
    }

    const orderId = body.data?.metadata?.order_id;
    const paidAmount = Number(body.data?.amount);
    const paymentMethodDetail = body.data?.payment_method || 'cib';

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'No order_id in metadata' }, { status: 400 });
    }

    // 2. Fetch Order Data
    if (!adminDb) {
      console.error('Firebase Admin not initialized in webhook');
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }

    let orderData = null;
    try {
      const orderSnap = await adminDb.collection('orders').doc(orderId).get();
      if (orderSnap.exists) orderData = orderSnap.data();
    } catch (e) {
      console.error('adminDb order fetch error:', e);
      return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
    }

    if (!orderData) {
      console.error(`Order ${orderId} not found in database`);
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    // Idempotency: If already paid or manual delivery, return early
    if (orderData.status === 'paid' || orderData.status === 'needs_manual_delivery') {
      return NextResponse.json({ success: true, message: 'Already processed', status: orderData.status });
    }

    if (orderData.status !== 'pending') {
       console.error(`Order ${orderId} has invalid status for payment: ${orderData.status}`);
       return NextResponse.json({ success: false, message: 'Invalid order status' }, { status: 400 });
    }

    // Amount and Currency matching check
    const unitPrice = Number(orderData.productPrice || orderData.amount || 0);
    const quantity = Number(orderData.quantity || 1);
    const expectedTotal = unitPrice * quantity;
    const webhookCurrency = (body.data?.currency || '').toLowerCase();
    
    if (
      expectedTotal <= 0 || 
      typeof paidAmount !== 'number' || 
      isNaN(paidAmount) || 
      expectedTotal !== paidAmount ||
      (webhookCurrency && webhookCurrency !== 'dzd')
    ) {
      console.error(`Mismatch for order ${orderId}: expected ${expectedTotal} dzd, got ${paidAmount} ${webhookCurrency}`);
      const flagUpdate = { 
        status: 'needs_manual_delivery', 
        amountPaid: paidAmount || 0, 
        error: `Verification mismatch. Expected ${expectedTotal} dzd, got ${paidAmount} ${webhookCurrency}` 
      };
      await adminDb.collection('orders').doc(orderId).update(flagUpdate);
      return NextResponse.json({ success: true, message: 'Order marked for manual delivery due to mismatch' });
    }

    // 3. Fulfill Order via shared delivery function (automatically dispatches emails & notifications)
    const deliveryResult = await processOrderDelivery(orderId, paidAmount, paymentMethodDetail);
    
    if (!deliveryResult.success) {
      return NextResponse.json({ success: false, message: deliveryResult.message }, { status: deliveryResult.status });
    }

    if (deliveryResult.status === 200 && deliveryResult.message === 'Already processed') {
      return NextResponse.json({ success: true, message: 'Already processed', status: deliveryResult.orderStatus });
    }

    return NextResponse.json({ success: true, message: 'Order fulfilled successfully' });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error: ' + (error?.message || error), { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'chargily-webhook' });
}
