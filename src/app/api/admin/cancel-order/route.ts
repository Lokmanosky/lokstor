import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendOrderCancelledCustomerEmail, OrderEmailData } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (
      !decodedToken.email_verified ||
      decodedToken.email?.toLowerCase() !== 'loktech.dz@gmail.com'
    ) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, orderIds, reason, notifyCustomer = true } = body;

    const targetIds: string[] = Array.isArray(orderIds) && orderIds.length > 0
      ? orderIds
      : (orderId ? [orderId] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'orderId or orderIds required' }, { status: 400 });
    }

    let cancelledCount = 0;
    let emailsSentCount = 0;
    const errors: string[] = [];

    for (const id of targetIds) {
      try {
        const orderRef = adminDb.collection('orders').doc(id);
        const snap = await orderRef.get();
        if (!snap.exists) {
          errors.push(`الطلب ${id} غير موجود`);
          continue;
        }

        const orderData = snap.data() as any;

        // Update status to 'failed' (ملغي) and record cancellation time and reason
        await orderRef.update({
          status: 'failed',
          cancelledAt: Date.now(),
          ...(reason ? { cancellationReason: reason } : {}),
        });
        cancelledCount++;

        // Send email to the customer only if notifyCustomer is true
        const customerEmail = (orderData.customerEmail || '').trim();
        if (notifyCustomer && customerEmail && customerEmail.includes('@')) {
          const emailData: OrderEmailData = {
            id,
            productId: orderData.productId,
            productName: orderData.productName || 'منتج رقمي',
            productPrice: Number(orderData.productPrice || orderData.amount || 0),
            amount: Number(orderData.amount || orderData.productPrice || 0),
            customerName: orderData.customerName || orderData.userName || 'عميلنا العزيز',
            customerEmail,
            customerPhone: orderData.customerPhone || '',
            paymentMethod: orderData.paymentMethod || '',
            paymentMethodDetails: orderData.paymentMethodDetails || '',
            createdAt: orderData.createdAt || Date.now(),
          };

          const emailRes = await sendOrderCancelledCustomerEmail({
            order: emailData,
            reason: typeof reason === 'string' && reason.trim() ? reason.trim() : undefined,
          });

          if (emailRes.customerSent) {
            emailsSentCount++;
          }
        }
      } catch (itemErr: any) {
        console.error(`Error processing cancellation for order ${id}:`, itemErr);
        errors.push(`خطأ في معالجة الطلب ${id}: ${itemErr.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      cancelledCount,
      emailsSentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Cancel order API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
