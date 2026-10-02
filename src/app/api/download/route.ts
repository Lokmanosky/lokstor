import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { adminAuth } from '@/lib/firebaseAdmin';
import { Order } from '@/types';

export async function GET(req: NextRequest) {
  try {
    // 1. Require valid ID token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let callerUid: string;
    let callerIsAdmin = false;
    try {
      const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
      callerUid = decoded.uid;
      callerIsAdmin = decoded.email_verified === true && decoded.email?.toLowerCase() === 'loktech.dz@gmail.com';
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    const token = searchParams.get('token');
    const isDemo = searchParams.get('demo') === 'true';

    if (!orderId && !token) {
      return NextResponse.json({ error: 'مُعرّف الطلب غير محدد' }, { status: 400 });
    }

    // 2. Fetch Order — Admin SDK only (no client SDK fallback here)
    let order: Order | null = null;
    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    if (!orderId && token) {
      const snapToken = await adminDb.collection('orders').where('downloadToken', '==', token).limit(1).get();
      if (!snapToken.empty) {
        order = { id: snapToken.docs[0].id, ...snapToken.docs[0].data() } as Order;
      }
    }
    if (orderId && !order) {
      const snap = await adminDb.collection('orders').doc(orderId).get();
      if (snap.exists) {
        order = { id: snap.id, ...snap.data() } as Order;
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'عذراً، الطلب غير موجود' }, { status: 404 });
    }

    // 3. Ownership check: caller must own the order or be admin
    if (!callerIsAdmin && (order as any).userId !== callerUid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. CRITICAL SECURITY RULE: Verify status is "paid"
    if (order.status !== 'paid') {
      return NextResponse.json(
        { error: 'غير مصرح بالتحميل. لم يتم تأكيد دفع الفاتورة بعد.' },
        { status: 403 }
      );
    }

    // 3. Verify Download Token match (if token checking is enabled)
    if (order.downloadToken && token && order.downloadToken !== token && !isDemo) {
      return NextResponse.json(
        { error: 'رمز التحميل غير صالح أو منتهي الصلاحية' },
        { status: 403 }
      );
    }

    // 4. Verify expiration date (if set)
    if (order.downloadExpiresAt && Date.now() > order.downloadExpiresAt) {
      return NextResponse.json(
        { error: 'لقد انتهت صلاحية رابط التحميل المباشر (تتجاوز 24 ساعة)' },
        { status: 410 }
      );
    }

    // 5. If Storage is configured, try returning direct Firebase Storage Signed URL
    if (adminStorage) {
      try {
        let storagePath = '';
        if (adminDb) {
          const prodSnap = await adminDb.collection('products').doc(order.productId).get();
          if (prodSnap.exists) {
            storagePath = prodSnap.data()?.fileUrl || '';
          }
        }

        if (storagePath) {
          const file = adminStorage.bucket().file(storagePath);
          const [signedUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000, // 1 hour download window
          });
          return NextResponse.redirect(signedUrl);
        }
      } catch (storageErr) {
        console.warn('Storage redirect fallback:', storageErr);
      }
    }

    // 6. Digital deliverable stream / file content
    const deliverable = (order.downloadUrl || '').trim();
    const isLink = deliverable && (/https?:\/\/[^\s]+/i.test(deliverable));
    
    const detailsSection = deliverable
      ? (isLink
          ? `-------------------------------------------
رابط التفعيل / التحميل:
يرجى الدخول إلى الرابط التالي للتفعيل:
${deliverable}
-------------------------------------------`
          : `-------------------------------------------
محتوى التفعيل / بيانات الحساب:
${deliverable}
-------------------------------------------`)
      : 'تم تأكيد طلبك وتجهيزه بنجاح.';

    const demoContent = `===========================================
Lokstor - بيانات المنتج الرقمي والتفعيل
===========================================
المنتج: ${order.productName}
رقم الطلب: #${order.id}
العميل: ${order.customerName} (${order.customerEmail})
تاريخ الشراء: ${new Date(order.createdAt).toLocaleString('ar-DZ')}

${detailsSection}

شكراً لتسوقكم من Lokstor!
الموقع: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://lokstor.vercel.app'}
`;

    return new NextResponse('\uFEFF' + demoContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(order.productName || "digital_product")}.txt"`,
      },
    });
  } catch (error: any) {
    console.error('Download route error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ أثناء تحميل الملف' },
      { status: 500 }
    );
  }
}
