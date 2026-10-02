import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { sendDeliveryEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if admin by email
    const isAdmin = decodedToken.email_verified && decodedToken.email?.toLowerCase() === 'loktech.dz@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, link, email, productName, keepLink } = body;

    if (!orderId || !link) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let emailSent = false;
    // Send email if requested
    if (email) {
      emailSent = await sendDeliveryEmail({
        to: email,
        link,
        productName,
        orderId,
      });
    }

    // Save link to Firestore if keepLink is true
    const updateData: any = { linkDeliveredAt: Date.now() };
    if (keepLink) {
      updateData.deliveryLink = link;
    }
    
    // Always mark order as delivered state? We don't have a status for that, but linkDeliveredAt implies it.
    await adminDb.collection('orders').doc(orderId).update(updateData);

    return NextResponse.json({ success: true, emailSent });
  } catch (error: any) {
    console.error('Deliver link error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
