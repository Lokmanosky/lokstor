import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { sendOrderPaidEmails, formatPaymentMethod } from '@/lib/email';

export interface HandleOrderPaidNotificationsParams {
  orderId: string;
  orderData: any;
  paidAmount: number;
  paymentMethod?: string;
  paymentMethodDetail?: string;
  downloadUrl?: string;
}

/**
 * Unified post-payment notification handler for ALL payment gateways (Chargily, OneClick, Binance, RedotPay, etc.)
 *
 * Responsibilities:
 * 1. Checks idempotency so emails and push notifications are NEVER sent twice for the same order.
 * 2. Creates in-app admin notification in Firestore.
 * 3. Sends styled HTML confirmation email to Customer (with invoice & download/code details).
 * 4. Sends styled HTML notification email to Store Admin (with complete customer and order details).
 * 5. Sends FCM push notifications to Customer and Admins.
 * 6. Flags order document with { paidEmailsSent: true, chargilyEmailsSent: true }.
 */
export async function handleOrderPaidNotifications(params: HandleOrderPaidNotificationsParams) {
  const { orderId, orderData, paidAmount, paymentMethod, paymentMethodDetail, downloadUrl } = params;

  if (!orderId || !orderData) {
    return { success: false, reason: 'Missing orderId or orderData' };
  }

  // Idempotency: avoid sending duplicate emails/notifications if already sent
  if (orderData.paidEmailsSent || orderData.chargilyEmailsSent) {
    return { success: true, reason: 'Already sent' };
  }

  // Double-check DB in case in-memory orderData is stale
  if (adminDb) {
    try {
      const snap = await adminDb.collection('orders').doc(orderId).get();
      if (snap.exists) {
        const freshData = snap.data();
        if (freshData?.paidEmailsSent || freshData?.chargilyEmailsSent) {
          return { success: true, reason: 'Already sent in DB' };
        }
      }
      // Immediately mark as sent to prevent concurrent execution (e.g. webhook vs user redirect)
      await adminDb.collection('orders').doc(orderId).update({
        paidEmailsSent: true,
        chargilyEmailsSent: true,
      });
    } catch (dbErr) {
      console.warn('Failed to update paidEmailsSent flag:', dbErr);
    }
  }

  const effectiveMethod = paymentMethod || orderData.paymentMethod || 'electronic';
  const effectiveDetails = paymentMethodDetail || orderData.paymentMethodDetails;
  const formattedGateway = formatPaymentMethod(effectiveMethod, effectiveDetails);
  const shortId = orderId.replace('ord_', '').slice(0, 8).toUpperCase();

  // 1. In-app notification for Store Admin
  try {
    if (adminDb) {
      await adminDb.collection('notifications').add({
        title: 'طلب جديد مدفوع! 🎉',
        message: `تم دفع طلب بقيمة ${paidAmount} د.ج بنجاح عبر ${formattedGateway}!`,
        type: 'success',
        read: false,
        createdAt: Date.now(),
        orderId: orderId,
      });
    }
  } catch (notifErr) {
    console.warn('Failed to create in-app notification:', notifErr);
  }

  // 2. Dispatch Notification & Confirmation Emails (Admin + Customer)
  try {
    await sendOrderPaidEmails({
      order: {
        id: orderId,
        productName: orderData.productName || 'منتج رقمي',
        customerName: orderData.customerName || 'عميل',
        customerEmail: orderData.customerEmail || '',
        customerPhone: orderData.customerPhone,
        customFieldsData: orderData.customFieldsData,
        paymentMethod: effectiveMethod,
        paymentMethodDetails: effectiveDetails,
        ...orderData,
      },
      paidAmount,
      paymentMethod: effectiveMethod,
      paymentMethodDetail: effectiveDetails,
      downloadUrl: downloadUrl || orderData.downloadUrl,
    });
  } catch (emailErr) {
    console.warn('Failed to dispatch order paid emails:', emailErr);
  }

  // 3. FCM Push Notifications
  try {
    if (adminMessaging) {
      const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://lokstor.vercel.app';
      const baseUrl = (rawBaseUrl.includes('localhost') || rawBaseUrl.includes('127.0.0.1'))
        ? 'https://lokstor.vercel.app'
        : rawBaseUrl.replace(/\/$/, '');

      // Customer Push
      if (orderData.fcmToken) {
        await adminMessaging.send({
          token: orderData.fcmToken,
          notification: {
            title: 'تم تأكيد الدفع بنجاح ✅',
            body: `تم الدفع بنجاح لطلبك #${shortId}. اضغط هنا لعرض تفاصيل الطلب.`,
          },
          data: {
            url: `${baseUrl}/account/orders`,
          },
          webpush: {
            fcmOptions: {
              link: `${baseUrl}/account/orders`,
            },
          },
        }).catch((e: any) => console.warn('Customer push failed:', e));
      }

      // Admin Push
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
        const notifBody = `تم دفع ${paidAmount} د.ج لطلب #${shortId} عبر ${formattedGateway}.`;
        const notifUrl = `${baseUrl}/admin/orders?search=${orderId}`;

        await adminMessaging.sendEachForMulticast({
          tokens: adminTokens,
          data: {
            title: notifTitle,
            body: notifBody,
            url: notifUrl,
            tag: 'lokstor-order',
            orderId: String(orderId || ''),
            sound: 'default',
          },
          webpush: {
            headers: {
              Urgency: 'high',
              TTL: '86400',
            },
            fcmOptions: {
              link: notifUrl,
            },
          },
          android: {
            priority: 'high',
          },
        }).catch((e: any) => console.warn('Admin push failed:', e));
      }
    }
  } catch (pushErr) {
    console.warn('Failed to dispatch push notifications:', pushErr);
  }

  return { success: true };
}

