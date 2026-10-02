import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { sendChargilyPaidEmails } from '@/lib/email';
import { adminMessaging } from '@/lib/firebase-admin';
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
    const secret = (process.env.CHARGILY_API_SECRET || '').trim();
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

    // 2. Fetch Order Data (Supporting both adminDb and client SDK fallback)
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

    // 3. Fulfill Order via shared delivery function
    const deliveryResult = await processOrderDelivery(orderId, paidAmount, paymentMethodDetail);
    
    if (!deliveryResult.success) {
      return NextResponse.json({ success: false, message: deliveryResult.message }, { status: deliveryResult.status });
    }

    if (deliveryResult.status === 200 && deliveryResult.message === 'Already processed') {
      return NextResponse.json({ success: true, message: 'Already processed', status: deliveryResult.orderStatus });
    }

    const orderUpdate = deliveryResult.orderData;
    const downloadUrl = deliveryResult.deliveredLink || orderData.downloadUrl;

    // 5. Create in-app Notification for Admin
    try {
      const notifData = {
        title: 'طلب جديد مدفوع! 🎉',
        message: `تم دفع طلب بقيمة ${paidAmount} د.ج بنجاح عبر شارجيلي (${paymentMethodDetail})!`,
        type: 'success',
        read: false,
        createdAt: Date.now(),
        orderId: orderId,
      };

      if (adminDb) {
        await adminDb.collection('notifications').add(notifData);
      }
    } catch (nErr) {
      console.warn('Failed to create notification:', nErr);
    }

    // 6. Send Notification & Confirmation Emails via Resend (Admin + Customer)
    try {
      if (!orderData.chargilyEmailsSent) {
        await sendChargilyPaidEmails({
          order: {
            id: orderId,
            productName: orderData.productName || 'منتج رقمي',
            customerName: orderData.customerName || 'عميل',
            customerEmail: orderData.customerEmail || '',
            customerPhone: orderData.customerPhone,
            customFieldsData: orderData.customFieldsData,
            ...orderData,
            ...orderUpdate,
          },
          paidAmount,
          paymentMethodDetail,
          downloadUrl: downloadUrl || undefined,
        });

        if (adminDb) {
          await adminDb.collection('orders').doc(orderId).update({ chargilyEmailsSent: true });
        }
      }
    } catch (eErr) {
      console.warn('Failed to dispatch Chargily paid emails:', eErr);
    }

    // 7. Send Push Notifications (FCM)
    try {
      if (adminMessaging) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lokstor.vercel.app';
        
        // Notify Customer
        if (orderData.fcmToken) {
          await adminMessaging.send({
            token: orderData.fcmToken,
            notification: {
              title: 'تم تأكيد الدفع بنجاح ✅',
              body: `تم الدفع بنجاح لطلبك #${orderId.replace('ord_', '').slice(0,8)}. اضغط هنا لعرض تفاصيل الطلب.`,
            },
            data: {
              url: `${baseUrl}/account/orders`,
            }
          }).catch((e: any) => console.warn('Customer push failed:', e));
        }

        // Notify Admins
        let adminTokens: string[] = [];
        if (adminDb) {
          const adminsSnap = await adminDb.collection('users').where('role', '==', 'admin').get();
          const ownerSnap = await adminDb.collection('users').where('email', 'in', ['loktech.dz@gmail.com', 'admin@lokstor.dz', 'admin@lokstor.com']).get();
          
          const tokenSet = new Set<string>();
          adminsSnap.docs.forEach((d: any) => { if (d.data().fcmToken) tokenSet.add(d.data().fcmToken); });
          ownerSnap.docs.forEach((d: any) => { if (d.data().fcmToken) tokenSet.add(d.data().fcmToken); });
          adminTokens = Array.from(tokenSet);
        }
        if (adminTokens.length > 0) {
          const notifTitle = 'دفع جديد ناجح 💰';
          const notifBody = `تم دفع ${paidAmount} د.ج لطلب #${orderId.replace('ord_', '').slice(0,8)} عبر شارجيلي.`;
          const notifUrl = `${baseUrl}/admin/orders?search=${orderId}`;

          await adminMessaging.sendEachForMulticast({
            tokens: adminTokens,
            data: {
              title: notifTitle,
              body: notifBody,
              url: notifUrl,
              tag: 'lokstor-order',
              orderId: String(orderId || ''),
              sound: 'default'
            },
            webpush: {
              headers: {
                Urgency: 'high',
                TTL: '86400'
              }
            },
            android: {
              priority: 'high'
            }
          }).catch((e: any) => console.warn('Admin push failed:', e));
        }
      }
    } catch (pushErr) {
      console.warn('Failed to dispatch push notifications:', pushErr);
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
