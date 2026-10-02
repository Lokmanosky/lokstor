import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { processOrderDelivery } from '@/lib/delivery';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (
      !decodedToken.email_verified ||
      decodedToken.email?.toLowerCase() !== 'loktech.dz@gmail.com'
    ) {
      return NextResponse.json({ success: false, error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, amountPaid, paymentMethodDetails } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId required' }, { status: 400 });
    }

    const deliveryResult = await processOrderDelivery(orderId, amountPaid || 0, paymentMethodDetails || 'manual_approval');

    if (!deliveryResult.success) {
      return NextResponse.json({ success: false, error: deliveryResult.message }, { status: deliveryResult.status || 400 });
    }

    return NextResponse.json(deliveryResult);

  } catch (error: any) {
    console.error('Approve order error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
