import { NextRequest, NextResponse } from 'next/server';
import { getChargilyClient, isChargilyConfigured } from '@/lib/chargily';
import { adminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDoc } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { Product, Order } from '@/types';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, customerName, customerEmail } = body;

    if (!productId || !customerName || !customerEmail) {
      return NextResponse.json(
        { error: 'يرجى تقديم جميع البيانات المطلوبة (المنتج، الاسم، والبريد الإلكتروني)' },
        { status: 400 }
      );
    }

    // 1. Fetch Product from Firestore or local fallback
    let product: Product | null = null;
    
    if (adminDb) {
      const prodDoc = await adminDb.collection('products').doc(productId).get();
      if (prodDoc.exists) {
        product = { id: prodDoc.id, ...prodDoc.data() } as Product;
      }
    }

    if (!product) {
      // Try Client Firestore fallback
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          product = { id: docSnap.id, ...docSnap.data() } as Product;
        }
      } catch (err) {
        // ignore
      }
    }

    if (!product) {
      // Check in INITIAL_PRODUCTS seed
      const seedProd = INITIAL_PRODUCTS.find((p) => p.id === productId);
      if (seedProd) {
        product = seedProd;
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'المنتج غير موجود' }, { status: 444 });
    }

    // Check stock for digital products
    if (product.category === 'منتجات رقمية') {
      const stock = product.stockLinks || [];
      if (stock.length === 0) {
        return NextResponse.json({ error: 'عذراً، لقد نفذت كمية هذا المنتج من المخزون حالياً' }, { status: 400 });
      }
    }

    // 2. Generate unique order ID
    const orderId = 'ord_' + crypto.randomBytes(8).toString('hex');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // 3. Create Order object in Firestore
    const orderData: Order = {
      id: orderId,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      currency: product.currency || 'dzd',
      customerName,
      customerEmail,
      status: 'pending',
      createdAt: Date.now(),
    };

    // Save to Firestore
    if (adminDb) {
      await adminDb.collection('orders').doc(orderId).set(orderData);
    } else {
      try {
        await setDoc(doc(db, 'orders', orderId), orderData);
      } catch (err) {
        console.warn('Fallback setDoc error:', err);
      }
    }

    // 4. Create Chargily Checkout or Demo Mock
    if (isChargilyConfigured) {
      const chargily = getChargilyClient();
      const checkout = await chargily.createCheckout({
        amount: product.price,
        currency: 'dzd',
        success_url: `${baseUrl}/success?order_id=${orderId}`,
        failure_url: `${baseUrl}/failure?order_id=${orderId}`,
        webhook_endpoint: `${baseUrl}/api/webhook/chargily`,
        description: `طلب شراء: ${product.name}`,
        metadata: {
          order_id: orderId,
          customer_email: customerEmail,
        },
      });

      // Update Order with Chargily checkout ID and URL
      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).update({
          chargilyInvoiceId: checkout.id,
          chargilyCheckoutUrl: checkout.checkout_url,
        });
      }

      return NextResponse.json({
        success: true,
        checkoutUrl: checkout.checkout_url,
        orderId,
      });
    } else {
      // Mock Fallback for preview/development when CHARGILY_API_KEY is not set yet
      const mockCheckoutUrl = `${baseUrl}/success?order_id=${orderId}&mock=true`;
      
      if (adminDb) {
        await adminDb.collection('orders').doc(orderId).update({
          chargilyInvoiceId: 'mock_inv_' + orderId,
          chargilyCheckoutUrl: mockCheckoutUrl,
        });
      }

      return NextResponse.json({
        success: true,
        checkoutUrl: mockCheckoutUrl,
        orderId,
        isMock: true,
        message: 'تم إنشاء الطلب بنجاح (وضع المحاكاة التجريبي - قم بإضافة CHARGILY_API_KEY للتكامل الحقيقي)',
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
