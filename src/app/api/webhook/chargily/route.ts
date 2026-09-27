import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb, adminStorage } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // 1. Signature Verification
    const signature = req.headers.get('signature');
    if (!signature) {
      console.warn('Webhook received without signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const rawBody = await req.text();
    const secret = process.env.CHARGILY_API_SECRET || '';

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
    const paidAmount = body.data?.amount;

    if (!orderId) {
      return NextResponse.json({ success: false, message: 'No order_id in metadata' }, { status: 400 });
    }

    if (!adminDb) {
      throw new Error('adminDb is not configured');
    }

    // 2 & 3. Idempotency & Amount matching (Inside Transaction)
    const orderRef = adminDb!.collection('orders').doc(orderId);
    
    const result = await adminDb!.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data()!;
      
      // Idempotency check: If already processed, skip
      if (orderData.status === 'paid' || orderData.status === 'flagged') {
        return { status: orderData.status, alreadyProcessed: true };
      }

      // Amount matching check
      if (Number(orderData.productPrice) !== Number(paidAmount)) {
        // Flag it
        transaction.update(orderRef, { status: 'flagged', amountPaid: paidAmount });
        return { status: 'flagged', alreadyProcessed: false, orderData };
      }

      // 4. Fulfillment: generate signed URL or pull from stockLinks
      let downloadUrl = '';
      
      const productRef = adminDb!.collection('products').doc(orderData.productId);
      const productDoc = await transaction.get(productRef);
      let prodData = productDoc.exists ? productDoc.data() : null;

      if (prodData) {
        if (prodData.stockLinks && Array.isArray(prodData.stockLinks) && prodData.stockLinks.length > 0) {
           // Assign first available content (can be a URL, account credentials, code, etc.)
           downloadUrl = prodData.stockLinks[0];
           const newStock = prodData.stockLinks.slice(1);
           transaction.update(productRef, { stockLinks: newStock, stock: newStock.length });
        } else if (prodData.fileUrl) {
           // Generate 24h Signed URL if it's a firebase storage file
           if (prodData.fileUrl.includes('storage.googleapis.com')) {
              try {
                const urlParts = new URL(prodData.fileUrl);
                const pathParts = urlParts.pathname.split('/').filter(Boolean);
                pathParts.shift(); // remove bucket name
                const filePath = pathParts.join('/');
                
                if (adminStorage) {
                  const bucket = adminStorage.bucket();
                  const [signedUrl] = await bucket.file(filePath).getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                  });
                  downloadUrl = signedUrl;
                } else {
                  downloadUrl = prodData.fileUrl; // Fallback
                }
              } catch(e) {
                 downloadUrl = prodData.fileUrl; // Fallback
              }
           } else {
             downloadUrl = prodData.fileUrl;
           }
        }
      }

      // Update Order
      transaction.update(orderRef, {
        status: 'paid',
        downloadUrl: downloadUrl || null,
        paidAt: Date.now()
      });

      // Add Notification
      const notifRef = adminDb!.collection('notifications').doc();
      transaction.set(notifRef, {
        id: notifRef.id,
        title: 'طلب جديد مدفوع! 🎉',
        message: `تم دفع طلب بقيمة ${paidAmount} د.ج بنجاح!`,
        type: 'success',
        read: false,
        createdAt: Date.now(),
        orderId: orderId
      });

      return { status: 'paid', alreadyProcessed: false, orderData };
    });

    if (result.alreadyProcessed) {
      return NextResponse.json({ success: true, message: 'Already processed', status: result.status });
    }

    if (result.status === 'flagged') {
       const notifRef = adminDb!.collection('notifications').doc();
       await notifRef.set({
          id: notifRef.id,
          title: 'تحذير: تلاعب محتمل بالمبلغ ⚠️',
          message: `طلب رقم ${orderId}: المبلغ المدفوع (${paidAmount}) لا يطابق سعر المنتج الأصلي!`,
          type: 'error',
          read: false,
          createdAt: Date.now(),
          orderId: orderId
       });
       return NextResponse.json({ success: true, message: 'Order flagged due to amount mismatch' });
    }

    return NextResponse.json({ success: true, message: 'Order fulfilled successfully' });

  } catch (error: any) {
    console.error('Webhook Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
