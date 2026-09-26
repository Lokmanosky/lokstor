import { NextRequest, NextResponse } from 'next/server';
import { verifySignature } from '@/lib/chargily';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('signature') || req.headers.get('x-chargily-signature') || '';
    const secretKey = process.env.CHARGILY_API_SECRET || process.env.CHARGILY_API_KEY || '';

    // 1. Verify Chargily Signature if Secret is defined
    if (secretKey) {
      const isValid = verifySignature(Buffer.from(rawBody), signature, secretKey);
      if (!isValid) {
        console.error('Invalid Webhook Signature');
        return NextResponse.json({ error: 'التوقيع الرقمي غير صالح (Invalid signature)' }, { status: 403 });
      }
    } else {
      console.warn('CHARGILY_API_SECRET is not set - Skipping signature verification in dev mode.');
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.type || payload.event;
    const checkoutData = payload.data || payload;

    // Check if event indicates paid checkout
    const isPaidEvent =
      eventType === 'checkout.paid' ||
      eventType === 'invoice.paid' ||
      checkoutData.status === 'paid';

    if (!isPaidEvent) {
      return NextResponse.json({ message: 'Event ignored (not paid status)' }, { status: 200 });
    }

    // Retrieve order_id from checkout metadata
    const orderId = checkoutData.metadata?.order_id || checkoutData.metadata?.orderId;

    if (!orderId) {
      return NextResponse.json({ error: 'order_id missing in webhook metadata' }, { status: 400 });
    }

    // 2. Generate secure download token and expiration (24h)
    const downloadToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // 3. Fetch Order & Product to retrieve the download link (from stockLinks or fileUrl)
    let downloadUrl = '';

    if (adminDb) {
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (orderSnap.exists) {
        const order = orderSnap.data();
        const productId = order?.productId;

        if (productId) {
          const prodRef = adminDb.collection('products').doc(productId);
          const prodSnap = await prodRef.get();
          
          if (prodSnap.exists) {
            const prodData = prodSnap.data();
            
            // Check if it's a stock-based product
            if (prodData?.stockLinks && Array.isArray(prodData.stockLinks) && prodData.stockLinks.length > 0) {
              const stockLinks = [...prodData.stockLinks];
              downloadUrl = stockLinks.shift(); // Get the first unused link
              
              // Update product to remove the used link
              await prodRef.update({
                stockLinks: stockLinks
              });
            } else if (prodData?.fileUrl) {
              // Standard single shared link
              downloadUrl = prodData.fileUrl;
            }
          }
        }
      }
    }

    // Fallback URL using internal download route if no direct URL is found
    if (!downloadUrl) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      downloadUrl = `${baseUrl}/api/download?order_id=${orderId}&token=${downloadToken}`;
    }

    // 4. Update Order Status in Firestore to "paid"
    if (adminDb) {
      await adminDb.collection('orders').doc(orderId).update({
        status: 'paid',
        downloadToken,
        downloadUrl,
        downloadExpiresAt: expiresAt,
        paidAt: Date.now(),
      });
    } else {
      try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
          status: 'paid',
          downloadToken,
          downloadUrl,
          downloadExpiresAt: expiresAt,
          paidAt: Date.now(),
        });
      } catch (err) {
        console.warn('Fallback updateDoc error:', err);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'تم تحديث حالة الطلب إلى مدفوع بنجاح',
      orderId,
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error?.message || 'خطأ في معالجة الـ Webhook' },
      { status: 500 }
    );
  }
}
