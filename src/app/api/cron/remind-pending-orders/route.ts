import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { sendPaymentReminderCustomerEmail, OrderEmailData } from '@/lib/email';

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
    const errors: string[] = [];

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
      const customerEmail = (data.customerEmail || '').trim();
      const hasValidEmail = Boolean(customerEmail && customerEmail.includes('@'));

      if (isOlderThan24h && isWithin14Days && !alreadyReminded && hasValidEmail) {
        eligibleCount++;
        try {
          const orderData: OrderEmailData = {
            id: docSnap.id,
            productId: data.productId,
            productName: data.productName || 'منتج رقمي',
            productPrice: Number(data.productPrice || data.amount || 0),
            amount: Number(data.amount || data.productPrice || 0),
            customerName: data.customerName || data.userName || 'عميلنا العزيز',
            customerEmail,
            customerPhone: data.customerPhone || '',
            paymentMethod: data.paymentMethod || '',
            paymentMethodDetails: data.paymentMethodDetails || '',
            createdAt,
          };

          const checkoutUrl = `${baseUrl}/checkout/${docSnap.id}`;
          const res = await sendPaymentReminderCustomerEmail({
            order: orderData,
            checkoutUrl,
          });

          if (res.customerSent) {
            await docSnap.ref.update({
              paymentReminderSent: true,
              paymentReminderSentAt: now,
            });
            remindedCount++;
          } else {
            errors.push(`فشل إرسال تذكير للطلب #${docSnap.id}: ${res.error || 'خطأ غير معروف'}`);
          }
        } catch (itemErr: any) {
          console.error(`Error sending reminder for order #${docSnap.id}:`, itemErr);
          errors.push(`خطأ مع الطلب #${docSnap.id}: ${itemErr.message}`);
        }
      }
    }

    console.log(`[Cron: Payment Reminders] Scanned ${scannedCount} pending orders, ${eligibleCount} eligible, ${remindedCount} reminded.`);

    return NextResponse.json({
      success: true,
      scannedCount,
      eligibleCount,
      remindedCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `تم فحص (${scannedCount}) طلب معلق، وإرسال تذكير الدفع لـ (${remindedCount}) طلب بنجاح.`
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
