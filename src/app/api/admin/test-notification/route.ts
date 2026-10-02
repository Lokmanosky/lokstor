import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { adminMessaging } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    const isAdmin =
      decodedToken.email_verified === true &&
      decodedToken.email?.toLowerCase() === 'loktech.dz@gmail.com';

    if (!isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!adminMessaging || !adminDb) {
      return NextResponse.json({ success: false, error: 'Firebase Admin not configured' }, { status: 500 });
    }

    // Optional token passed directly from body (e.g. current device token)
    let bodyToken = '';
    try {
      const body = await req.json();
      bodyToken = body?.token;
    } catch (_) {}

    const tokenSet = new Set<string>();
    if (bodyToken) {
      tokenSet.add(bodyToken);
    }

    // Also fetch all admin tokens from DB
    const adminsSnap = await adminDb.collection('users').where('role', '==', 'admin').get();
    const ownerSnap = await adminDb.collection('users').where('email', 'in', ['loktech.dz@gmail.com']).get();

    adminsSnap.docs.forEach((d: any) => { if (d.data().fcmToken) tokenSet.add(d.data().fcmToken); });
    ownerSnap.docs.forEach((d: any) => { if (d.data().fcmToken) tokenSet.add(d.data().fcmToken); });

    const tokens = Array.from(tokenSet);

    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'لم يتم العثور على أي رمز جهاز (FCM Token). يرجى الضغط على زر تفعيل/تحديث الإشعارات أولاً.'
      }, { status: 400 });
    }

    const testTitle = '🔔 تجربة إشعار فوري (Lokstor)';
    const testBody = `طلب جديد تجريبي رقم #${Math.floor(1000 + Math.random() * 9000)} بقيمة 3200 د.ج`;
    const targetUrl = 'https://lokstor.vercel.app/admin/orders';

    const sendPromises = tokens.map(async (fcmToken) => {
      try {
        const res = await adminMessaging.send({
          token: fcmToken,
          data: {
            title: testTitle,
            body: testBody,
            url: targetUrl,
            tag: 'lokstor-order',
            sound: 'default'
          },
          webpush: {
            headers: {
              Urgency: 'high',
              TTL: '86400'
            }
          },
          android: {
            priority: 'high'
          }
        });
        return { token: fcmToken.slice(0, 15) + '...', success: true, id: res };
      } catch (err: any) {
        return { token: fcmToken.slice(0, 15) + '...', success: false, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);

    return NextResponse.json({
      success: true,
      message: 'تم إرسال الإشعار التجريبي بنجاح إلى جميع أجهزتك!',
      results
    });

  } catch (error: any) {
    console.error('Test notification error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
