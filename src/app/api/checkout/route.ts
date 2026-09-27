import { NextRequest, NextResponse } from 'next/server';
import { getChargilyClient, isChargilyConfigured } from '@/lib/chargily';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { Product, Order } from '@/types';
import crypto from 'crypto';
import { checkoutSchema } from '@/lib/validations';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// DOMPurify setup for Server-side
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Firestore-based Rate Limiter helper
async function checkRateLimit(ip: string): Promise<boolean> {
  if (!adminDb) return true; // Fallback if adminDb is not initialized
  try {
    const rlRef = adminDb.collection('rateLimits').doc(ip);
    const docSnap = await rlRef.get();
    
    const now = Date.now();
    const limit = 15; // max 15 requests per minute
    const windowMs = 60000;
    
    if (docSnap.exists) {
      const data = docSnap.data()!;
      if (now - data.lastRequest < windowMs) {
        if (data.count >= limit) return false;
        await rlRef.update({ count: data.count + 1 });
      } else {
        await rlRef.update({ count: 1, lastRequest: now });
      }
    } else {
      await rlRef.set({ count: 1, lastRequest: now });
    }
    return true;
  } catch (error) {
    console.error('Rate limit error:', error);
    return true; // fail open
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    
    // 1. Rate Limiting Check
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: 'لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد دقيقة.' }, { status: 429 });
    }

    const body = await req.json();

    // 2. Server-side Validation with Zod
    const validationResult = checkoutSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, customerName, customerEmail, customerPhone } = validationResult.data;

    // 3. XSS Protection (Sanitize inputs)
    const cleanName = purify.sanitize(customerName);
    const cleanEmail = purify.sanitize(customerEmail);
    const cleanPhone = customerPhone ? purify.sanitize(customerPhone) : undefined;

    // 4. Fetch Product from Firestore or local fallback
    let product: Product | null = null;
    
    if (adminDb) {
      try {
        const prodDoc = await adminDb.collection('products').doc(productId).get();
        if (prodDoc.exists) {
          product = { id: prodDoc.id, ...prodDoc.data() } as Product;
        }
      } catch (e) {}
    }

    if (!product) {
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          product = { id: docSnap.id, ...docSnap.data() } as Product;
        }
      } catch (err) {}
    }

    if (!product) {
      const seedProd = INITIAL_PRODUCTS.find((p) => p.id === productId);
      if (seedProd) product = seedProd;
    }

    if (!product) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 444 });
    }

    // Check stock
    if (product.stock !== undefined && product.stock <= 0) {
        return NextResponse.json({ error: 'عذراً، لقد نفذت كمية هذا المنتج من المخزون حالياً' }, { status: 400 });
    }
    if (product.stockLinks && product.stockLinks.length === 0) {
      return NextResponse.json({ error: 'عذراً، لقد نفذت كمية هذا المنتج من المخزون حالياً' }, { status: 400 });
    }

    // 5. Generate Order ID
    const orderId = 'ord_' + crypto.randomBytes(8).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 6. Create Order object without undefined fields
    const orderData: any = {
      id: orderId,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      currency: product.currency || 'dzd',
      customerName: cleanName,
      customerEmail: cleanEmail,
      status: 'pending',
      createdAt: Date.now(),
    };

    if (cleanPhone) {
      orderData.customerPhone = cleanPhone;
    }

    // Save to Firestore
    if (adminDb) {
      await adminDb.collection('orders').doc(orderId).set(orderData);
    } else {
      await setDoc(doc(db, 'orders', orderId), orderData);
    }

    // 7. Create Chargily Checkout
    if (isChargilyConfigured) {
      const chargily = getChargilyClient();
      let customerId: string | undefined = undefined;

      try {
        const customer = await chargily.createCustomer({
          name: cleanName,
          email: cleanEmail,
        });
        if (customer && customer.id) {
          customerId = customer.id;
        }
      } catch (custErr: any) {
        console.warn('Chargily createCustomer notice:', custErr?.message || custErr);
      }

      const checkoutPayload: any = {
        amount: product.price,
        currency: 'dzd',
        success_url: `${baseUrl}/success?order_id=${orderId}`,
        failure_url: `${baseUrl}/failure?order_id=${orderId}`,
        webhook_endpoint: `${baseUrl}/api/webhook/chargily`,
        description: `طلب شراء: ${product.name}`,
        metadata: {
          order_id: orderId,
          customer_email: cleanEmail,
        },
      };

      if (customerId) {
        checkoutPayload.customer_id = customerId;
      }

      const checkout = await chargily.createCheckout(checkoutPayload);

      const updatePayload = {
        chargilyInvoiceId: checkout.id,
        chargilyCheckoutUrl: checkout.checkout_url,
      };

      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).update(updatePayload);
      } else {
        await updateDoc(doc(db, 'orders', orderId), updatePayload);
      }

      return NextResponse.json({
        success: true,
        checkoutUrl: checkout.checkout_url,
        orderId,
      });
    } else {
      const mockCheckoutUrl = `${baseUrl}/success?order_id=${orderId}&mock=true`;
      const updatePayload = {
        chargilyInvoiceId: 'mock_inv_' + orderId,
        chargilyCheckoutUrl: mockCheckoutUrl,
      };

      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).update(updatePayload);
      } else {
        await updateDoc(doc(db, 'orders', orderId), updatePayload);
      }

      return NextResponse.json({
        success: true,
        checkoutUrl: mockCheckoutUrl,
        orderId,
        isMock: true,
      });
    }
  } catch (error: any) {
    console.error('Checkout API error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ أثناء معالجة الطلب' },
      { status: 500 }
    );
  }
}
