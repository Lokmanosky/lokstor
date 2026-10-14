import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendPaymentReminderCustomerEmail, OrderEmailData } from '@/lib/email';

export const dynamic = 'force-dynamic';

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

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'Database not initialized' }, { status: 500 });
    }

    const body = await req.json();
    const { orderId, orderIds } = body;

    const targetIds: string[] = Array.isArray(orderIds) && orderIds.length > 0
      ? orderIds
      : (orderId ? [orderId] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'orderId or orderIds required' }, { status: 400 });
    }

    const rawBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').trim();
    const baseUrl = (!rawBaseUrl || rawBaseUrl.includes('localhost') || rawBaseUrl.includes('127.0.0.1'))
      ? 'https://lokstor.vercel.app'
      : rawBaseUrl.replace(/\/$/, '');

    let remindedCount = 0;
    const errors: string[] = [];
    const now = Date.now();
    let firstCustomerEmail = '';

    for (const id of targetIds) {
      try {
        const orderRef = adminDb.collection('orders').doc(id);
        const snap = await orderRef.get();
        if (!snap.exists) {
          errors.push(`الطلب #${id} غير موجود`);
          continue;
        }

        const data = snap.data() as any;
        const customerEmail = (data.customerEmail || '').trim();

        if (!customerEmail || !customerEmail.includes('@')) {
          errors.push(`الطلب #${id} لا يحتوي على بريد إلكتروني صالح للعميل`);
          continue;
        }

        if (!firstCustomerEmail) {
          firstCustomerEmail = customerEmail;
        }

        const orderData: OrderEmailData = {
          id,
          productId: data.productId,
          productName: data.productName || 'منتج رقمي',
          productPrice: Number(data.productPrice || data.amount || 0),
          amount: Number(data.amount || data.productPrice || 0),
          customerName: data.customerName || data.userName || 'عميلنا العزيز',
          customerEmail,
          customerPhone: data.customerPhone || '',
          paymentMethod: data.paymentMethod || '',
          paymentMethodDetails: data.paymentMethodDetails || '',
          createdAt: Number(data.createdAt || now),
        };

        const checkoutUrl = `${baseUrl}/account`;

        const res = await sendPaymentReminderCustomerEmail({
          order: orderData,
          checkoutUrl,
        });

        if (res.customerSent) {
          await orderRef.update({
            paymentReminderSent: true,
            paymentReminderSentAt: now,
            paymentReminderType: 'forced_manual',
          });
          remindedCount++;
        } else {
          errors.push(`فشل إرسال التذكير للطلب #${id}: ${res.error || 'خطأ غير معروف'}`);
        }
      } catch (itemErr: any) {
        console.error(`Error forcing reminder for order #${id}:`, itemErr);
        errors.push(`خطأ في معالجة الطلب #${id}: ${itemErr.message}`);
      }
    }

    if (remindedCount === 0 && errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: errors.join(' | '),
        errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      remindedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: remindedCount === 1
        ? `تم إرسال تذكير الدفع القسري بنجاح للعميل (${firstCustomerEmail}).`
        : `تم إرسال تذكير الدفع القسري لـ (${remindedCount}) طلب بنجاح.`
    });
  } catch (error: any) {
    console.error('Forced reminder API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
