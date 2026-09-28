import { NextRequest, NextResponse } from 'next/server';
import { getChargilyClient, isChargilyConfigured } from '@/lib/chargily';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { Product } from '@/types';
import crypto from 'crypto';
import { checkoutSchema } from '@/lib/validations';

// Safe lightweight string sanitizer (No heavy/broken serverless libraries like JSDOM)
function sanitizeText(str: string): string {
  if (!str) return '';
  return str.replace(/[<>]/g, '').trim();
}

// Firestore-based Rate Limiter helper
async function checkRateLimit(ip: string): Promise<boolean> {
  if (!adminDb) return true; // Fallback if adminDb is not initialized
  try {
    const rlRef = adminDb.collection('rateLimits').doc(ip);
    const docSnap = await rlRef.get();
    
    const now = Date.now();
    const limit = 20; // max 20 requests per minute
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
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    
    // 1. Rate Limiting Check
    const allowed = await checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد دقيقة.' }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      return NextResponse.json({ success: false, error: 'تنسيق البيانات غير صحيح.' }, { status: 400 });
    }

    // 2. Server-side Validation with Zod
    const validationResult = checkoutSchema.safeParse(body);
    if (!validationResult.success) {
      const issues = validationResult.error.issues.map(i => i.message).join('، ');
      return NextResponse.json(
        { success: false, error: issues || 'بيانات غير صالحة', details: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { productId, customerName, customerEmail, customerPhone, paymentMethod = 'chargily', customAmount, variantId, customFieldsData } = validationResult.data as any;

    // 3. Clean inputs
    const cleanName = sanitizeText(customerName);
    const cleanEmail = sanitizeText(customerEmail).toLowerCase().trim();
    const cleanPhone = customerPhone ? sanitizeText(customerPhone) : undefined;

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
      return NextResponse.json({ success: false, error: 'المنتج المطلوب غير موجود أو تم حذفه' }, { status: 404 });
    }

    // Check stock for strictly inventory-limited items
    // Strict stock check - no bypass
    const isOutOfStock = Boolean(
      product.status === 'out_of_stock' ||
      (product.stockType === 'numeric'
        ? (!product.unlimitedStock && typeof product.stock === 'number' && product.stock <= 0)
        : (product.stockLinks && Array.isArray(product.stockLinks) ? product.stockLinks.length === 0 : typeof product.stock === 'number' && product.stock <= 0))
    );
    if (isOutOfStock) {
      return NextResponse.json(
        { success: false, error: 'عذراً، لقد تم نفاذ كمية هذا المنتج من المخزون حالياً ولا يمكن إتمام عملية الشراء.' },
        { status: 400 }
      );
    }

    // 5. Generate Order ID
    const orderId = 'ord_' + crypto.randomBytes(8).toString('hex');
    
    // Dynamic Base URL detection (works on Vercel, localhost, custom domains)
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_BASE_URL || 'https://lokstor.vercel.app');

            // 5.5. Resolve Selected Variant Price & Details
    const DEFAULT_COD_VARIANTS = [
      { id: 'cod_80', name: '80 CP', price: 290, image: '/images/game-coin.jpg' },
      { id: 'cod_420', name: '420 CP', price: 1390, image: '/images/game-coin.jpg' },
      { id: 'cod_880', name: '880 CP', price: 2690, image: '/images/game-coin.jpg' },
      { id: 'cod_2400', name: '2400 CP', price: 6790, image: '/images/game-coin.jpg' },
      { id: 'cod_5000', name: '5000 CP', price: 13990, image: '/images/game-coin.jpg' },
      { id: 'cod_10800', name: '10800 CP', price: 29500, image: '/images/game-coin.jpg' },
      { id: 'cod_pass_w', name: 'تذكرة الإمداد الأسبوعية', price: 290, image: '/images/game-coin.jpg' },
      { id: 'cod_pass_m', name: 'تذكرة الإمداد الشهرية', price: 990, image: '/images/game-coin.jpg' },
    ];

    let finalOrderPrice = product.price;
    let selectedVariantObj: any = null;

    if (variantId) {
      let foundVar = product.variants?.find((v: any) => v.id === variantId);
      if (!foundVar) {
        foundVar = DEFAULT_COD_VARIANTS.find((v: any) => v.id === variantId);
      }
      if (foundVar) {
        finalOrderPrice = Number(foundVar.price);
        selectedVariantObj = {
          id: foundVar.id,
          name: foundVar.name,
          price: Number(foundVar.price),
          image: foundVar.image || '/images/game-coin.jpg',
        };
      }
    } else if (product.priceUnspecified && customAmount && customAmount > 0) {
      finalOrderPrice = Number(customAmount);
    }

    // 6. Create Order object without undefined fields (Strictly sanitized for Firestore)
    const orderData: any = {
      id: orderId,
      productId: product.id,
      productName: selectedVariantObj ? `${product.name} (${selectedVariantObj.name})` : product.name,
      productPrice: finalOrderPrice,
      currency: product.currency || 'dzd',
      customerName: cleanName,
      customerEmail: cleanEmail,
      paymentMethod,
      status: 'pending',
      createdAt: Date.now(),
    };

    if (selectedVariantObj) {
      orderData.selectedVariant = selectedVariantObj;
    }
    if (customFieldsData && typeof customFieldsData === 'object' && Object.keys(customFieldsData).length > 0) {
      orderData.customFieldsData = customFieldsData;
    }
    if (cleanPhone) {
      orderData.customerPhone = cleanPhone;
    }

    // Safety check: remove any undefined keys
    Object.keys(orderData).forEach(key => {
      if (orderData[key] === undefined) {
        delete orderData[key];
      }
    });

    // 6.5. Handle Binance Checkout
    if (paymentMethod === 'binance') {
      orderData.paymentMethod = 'binance';
      orderData.binanceUid = '427636242';
      orderData.status = 'pending';

      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).set(orderData);
      } else {
        await setDoc(doc(db, 'orders', orderId), orderData);
      }

      return NextResponse.json({
        success: true,
        orderId,
        paymentMethod: 'binance',
      });
    }

    // 6.6. Handle RedotPay Checkout
    if (paymentMethod === 'redotpay') {
      orderData.paymentMethod = 'redotpay';
      orderData.redotpayId = '1622725404';
      orderData.redotpayName = 'Lokmanosky';
      orderData.status = 'pending';

      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).set(orderData);
      } else {
        await setDoc(doc(db, 'orders', orderId), orderData);
      }

      return NextResponse.json({
        success: true,
        orderId,
        paymentMethod: 'redotpay',
      });
    }

    // Save initial order for Chargily
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
        amount: finalOrderPrice,
        currency: 'dzd',
        success_url: `${baseUrl}/success?order_id=${orderId}`,
        failure_url: `${baseUrl}/failure?order_id=${orderId}`,
        webhook_endpoint: `${baseUrl}/api/chargily-webhook`,
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
      // Mock mode fallback if Chargily keys are not yet configured on environment
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
      { success: false, error: error?.message || 'حدث خطأ أثناء معالجة الطلب في الخادم' },
      { status: 500 }
    );
  }
}
