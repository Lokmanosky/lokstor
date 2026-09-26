import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Order } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('order_id');
    const token = searchParams.get('token');
    const isDemo = searchParams.get('demo') === 'true';

    if (!orderId) {
      return NextResponse.json({ error: 'مُعرّف الطلب غير محدد' }, { status: 400 });
    }

    // 1. Fetch Order from Firestore
    let order: Order | null = null;
    if (adminDb) {
      const snap = await adminDb.collection('orders').doc(orderId).get();
      if (snap.exists) {
        order = { id: snap.id, ...snap.data() } as Order;
      }
    }

    if (!order) {
      try {
        const snap = await getDoc(doc(db, 'orders', orderId));
        if (snap.exists()) {
          order = { id: snap.id, ...snap.data() } as Order;
        }
      } catch (err) {
        // ignore
      }
    }

    if (!order) {
      return NextResponse.json({ error: 'عذراً، الطلب غير موجود' }, { status: 444 });
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

    // 6. Demo / Fallback digital deliverable stream / file content
    const seedProd = INITIAL_PRODUCTS.find((p) => p.id === order.productId) || INITIAL_PRODUCTS[0];
    const demoContent = `=== lokstor Digital Product Deliverable ===
المنتج: ${order.productName}
رقم الطلب: ${order.id}
العميل: ${order.customerName} (${order.customerEmail})
تاريخ الشراء: ${new Date(order.createdAt).toLocaleString('ar-DZ')}
حالة الدفع: مؤكد مدفوع عبر Chargily Pay

شكراً لتسوقكم من لوقستور! هذا الملف الرقمي تجريبي تم توليده تلقائياً لتأكيد نجاح عملية الشراء والتحميل.
تصفح المنتجات القادمة: ${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}
`;

    return new NextResponse(demoContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(seedProd.name)}.txt"`,
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
