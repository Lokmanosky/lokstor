import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import {
  sendPaymentReminderCustomerEmail,
  sendMultipleOrdersReminderCustomerEmail,
  OrderEmailData,
} from '@/lib/email';

// Mark route as dynamic (not static cached)
export const dynamic = 'force-dynamic';

async function verifyAuth(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  // 1. Check Vercel CRON_SECRET if configured
  const cronSecret = (process.env.CRON_SECRET || '').trim();
  if (cronSecret && token === cronSecret) {
    return true;
  }

  // 2. Check Admin Firebase Token
  if (token) {
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (
        decoded.email_verified &&
        decoded.email?.toLowerCase() === 'loktech.dz@gmail.com'
      ) {
        return true;
      }
    } catch {
      // Token wasn't a valid admin ID token
    }
  }

  // 3. Fallback: Allow localhost in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  return false;
}

interface CustomerGroupItem {
  docSnap: FirebaseFirestore.QueryDocumentSnapshot;
  orderData: OrderEmailData;
}

async function handleReminders(req: NextRequest) {
  try {
    const isAuthorized = await verifyAuth(req);
    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ success: false, error: 'Database not initialized' }, { status: 500 });
    }

    const now = Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    const cutoff24h = now - twentyFourHoursMs;
    // Don't send reminders for orders older than 14 days
    const maxAgeCutoff = now - (14 * twentyFourHoursMs);

    // Fetch all pending orders
    const snapshot = await adminDb
      .collection('orders')
      .where('status', '==', 'pending')
      .get();

    const rawBaseUrl = (process.env.NEXT_PUBLIC_BASE_URL || '').trim();
    const baseUrl = (!rawBaseUrl || rawBaseUrl.includes('localhost') || rawBaseUrl.includes('127.0.0.1'))
      ? 'https://lokstor.vercel.app'
      : rawBaseUrl.replace(/\/$/, '');

    let scannedCount = 0;
    let eligibleCount = 0;
    let remindedCount = 0;
    let customersReminded = 0;
    let singleRemindersCount = 0;
    let multipleRemindersCount = 0;
    const errors: string[] = [];

    // Group eligible orders by customerEmail (lowercase)
    const customerGroups = new Map<string, {
      customerName: string;
      customerEmail: string;
      items: CustomerGroupItem[];
    }>();

    for (const docSnap of snapshot.docs) {
      scannedCount++;
      const data = docSnap.data();
      const createdAt = Number(data.createdAt || 0);

      // Criteria:
      // 1. Created at least 24h ago
      // 2. Not older than 14 days
      // 3. Reminder has NOT been sent yet (مرة واحدة فقط)
      // 4. Has a valid customer email
      const isOlderThan24h = createdAt > 0 && createdAt <= cutoff24h;
      const isWithin14Days = createdAt >= maxAgeCutoff;
      const alreadyReminded = data.paymentReminderSent === true;
      const rawEmail = (data.customerEmail || '').trim();
      const hasValidEmail = Boolean(rawEmail && rawEmail.includes('@'));

      if (isOlderThan24h && isWithin14Days && !alreadyReminded && hasValidEmail) {
        eligibleCount++;
        const emailKey = rawEmail.toLowerCase();
        const customerName = data.customerName || data.userName || 'عميلنا العزيز';
        const orderData: OrderEmailData = {
          id: docSnap.id,
          productId: data.productId,
          productName: data.productName || 'منتج رقمي',
          productPrice: Number(data.productPrice || data.amount || 0),
          amount: Number(data.amount || data.productPrice || 0),
          customerName,
          customerEmail: rawEmail,
          customerPhone: data.customerPhone || '',
          paymentMethod: data.paymentMethod || '',
          paymentMethodDetails: data.paymentMethodDetails || '',
          createdAt,
        };

        if (!customerGroups.has(emailKey)) {
          customerGroups.set(emailKey, {
            customerName,
            customerEmail: rawEmail,
            items: [],
          });
        }
        customerGroups.get(emailKey)!.items.push({
          docSnap,
          orderData,
        });
      }
    }

    // Now send reminders: single email for single order, consolidated digest for multiple orders
    for (const [emailKey, group] of customerGroups.entries()) {
      try {
        if (group.items.length === 1) {
          // Exactly 1 order -> Single Reminder with direct checkout link
          const item = group.items[0];
          const checkoutUrl = `${baseUrl}/checkout/${item.docSnap.id}`;
          const res = await sendPaymentReminderCustomerEmail({
            order: item.orderData,
            checkoutUrl,
          });

          if (res.customerSent) {
            await item.docSnap.ref.update({
              paymentReminderSent: true,
              paymentReminderSentAt: now,
              paymentReminderType: 'single',
            });
            remindedCount++;
            customersReminded++;
            singleRemindersCount++;
          } else {
            errors.push(`فشل إرسال تذكير للطلب #${item.docSnap.id}: ${res.error || 'خطأ غير معروف'}`);
          }
        } else if (group.items.length > 1) {
          // Multiple orders -> Consolidated Reminder with link to account page
          const ordersList = group.items.map((i) => i.orderData);
          const accountUrl = `${baseUrl}/account`;
          const res = await sendMultipleOrdersReminderCustomerEmail({
            customerName: group.customerName,
            customerEmail: group.customerEmail,
            orders: ordersList,
            accountUrl,
          });

          if (res.customerSent) {
            const batch = adminDb.batch();
            for (const item of group.items) {
              batch.update(item.docSnap.ref, {
                paymentReminderSent: true,
                paymentReminderSentAt: now,
                paymentReminderType: 'consolidated',
                consolidatedWithCount: group.items.length,
              });
            }
            await batch.commit();

            remindedCount += group.items.length;
            customersReminded++;
            multipleRemindersCount++;
          } else {
            errors.push(`فشل إرسال تذكير مجمع للعميل (${group.customerEmail}): ${res.error || 'خطأ غير معروف'}`);
          }
        }
      } catch (custErr: any) {
        console.error(`Error processing reminder for customer ${emailKey}:`, custErr);
        errors.push(`خطأ مع العميل (${emailKey}): ${custErr?.message || custErr}`);
      }
    }

    console.log(`[Cron: Payment Reminders] Scanned ${scannedCount} pending orders, ${eligibleCount} eligible across ${customerGroups.size} customers. Sent reminders to ${customersReminded} customers for ${remindedCount} orders.`);

    return NextResponse.json({
      success: true,
      scannedCount,
      eligibleCount,
      remindedCount,
      customersReminded,
      singleRemindersCount,
      multipleRemindersCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `تم فحص (${scannedCount}) طلب معلق. تم تذكير (${customersReminded}) عميل بنجاح (${remindedCount} طلب إجمالاً: ${singleRemindersCount} رسالة فردية + ${multipleRemindersCount} رسالة مجمعة).`
    });

  } catch (error: any) {
    console.error('[Cron: Payment Reminders] Exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Vercel Crons use GET by default
export async function GET(req: NextRequest) {
  return handleReminders(req);
}

// Support POST for manual dashboard invocation
export async function POST(req: NextRequest) {
  return handleReminders(req);
}
