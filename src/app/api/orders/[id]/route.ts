import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Order } from '@/types';
import { getChargilyClient, isChargilyConfigured } from '@/lib/chargily';
import crypto from 'crypto';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { searchParams } = new URL(req.url);
    const mockConfirm = searchParams.get('mock_confirm') === 'true';

    if (!orderId) {
      return NextResponse.json({ error: 'مُعرّف الطلب مطلوب' }, { status: 400 });
    }

    let order: Order | null = null;

    if (adminDb) {
      try {
        const docSnap = await adminDb.collection('orders').doc(orderId).get();
        if (docSnap.exists) {
          order = { id: docSnap.id, ...docSnap.data() } as Order;
        }
      } catch (e) {}
    }

    if (!order) {
      try {
        const docRef = doc(db, 'orders', orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          order = { id: docSnap.id, ...docSnap.data() } as Order;
        }
      } catch (err) {}
    }

    if (!order) {
      return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
    }

    // Auto-verify with Chargily API if pending and chargilyInvoiceId exists
    if (order.status !== 'paid' && order.chargilyInvoiceId && isChargilyConfigured) {
      try {
        const chargily = getChargilyClient();
        const chargilyCheckout = await chargily.getCheckout(order.chargilyInvoiceId);

        if (chargilyCheckout && (chargilyCheckout.status === 'paid')) {
          let downloadUrl = '';

          // Fetch product digital deliverable
          let prodData: any = null;
          if (adminDb) {
            try {
              const pDoc = await adminDb.collection('products').doc(order.productId).get();
              if (pDoc.exists) prodData = pDoc.data();
            } catch (e) {}
          }
          if (!prodData) {
            try {
              const pDoc = await getDoc(doc(db, 'products', order.productId));
              if (pDoc.exists()) prodData = pDoc.data();
            } catch (e) {}
          }

          if (prodData) {
            if (prodData.stockLinks && prodData.stockLinks.length > 0) {
              downloadUrl = prodData.stockLinks[0];
              const newStock = prodData.stockLinks.slice(1);
              if (adminDb) {
                try {
                  await adminDb.collection('products').doc(order.productId).update({ stockLinks: newStock, stock: newStock.length });
                } catch (e) {}
              } else {
                try {
                  await updateDoc(doc(db, 'products', order.productId), { stockLinks: newStock, stock: newStock.length });
                } catch (e) {}
              }
            } else {
              if (prodData.fileUrl) {
                downloadUrl = prodData.fileUrl;
              }
              // Decrement numeric stock if limited
              if (prodData.stockType === 'numeric' && !prodData.unlimitedStock) {
                const newStock = Math.max(0, Number(prodData.stock || 1) - 1);
                if (adminDb) {
                  try {
                    await adminDb.collection('products').doc(order.productId).update({ stock: newStock, updatedAt: Date.now() });
                  } catch (e) {}
                } else {
                  try {
                    await updateDoc(doc(db, 'products', order.productId), { stock: newStock, updatedAt: Date.now() });
                  } catch (e) {}
                }
              }
            }
          }

          if (!downloadUrl) {
            const downloadToken = crypto.randomBytes(24).toString('hex');
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            downloadUrl = `${baseUrl}/api/download?order_id=${orderId}&token=${downloadToken}`;
          }

          const updatedFields = {
            status: 'paid' as const,
            downloadUrl,
            paidAt: Date.now(),
          };

          if (adminDb) {
            await adminDb.collection('orders').doc(orderId).update(updatedFields);
          } else {
            await updateDoc(doc(db, 'orders', orderId), updatedFields);
          }

          order = { ...order, ...updatedFields };
        }
      } catch (chErr) {
        console.error('Chargily verify status check error:', chErr);
      }
    }

    // Mock confirm simulation helper for dev testing when Chargily Webhooks are local
    if (mockConfirm && order.status !== 'paid') {
      const downloadToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const downloadUrl = `${baseUrl}/api/download?order_id=${orderId}&token=${downloadToken}&demo=true`;

      const updatedFields = {
        status: 'paid' as const,
        downloadToken,
        downloadUrl,
        downloadExpiresAt: expiresAt,
        paidAt: Date.now(),
      };

      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).update(updatedFields);
      } else {
        try {
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, updatedFields);
        } catch (e) {}
      }

      order = { ...order, ...updatedFields };
    }

    // Security check: Only return downloadUrl if status === 'paid'
    if (order.status !== 'paid') {
      const { downloadUrl, downloadToken, ...safeOrder } = order as any;
      return NextResponse.json({ order: safeOrder });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Fetch order error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ أثناء جلب الطلب' },
      { status: 500 }
    );
  }
}
