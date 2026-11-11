import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول أولاً لإضافة تقييم' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: 'جلسة تسجيل الدخول منتهية، يرجى إعادة تسجيل الدخول' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { rating, comment, userName, productId } = body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: 'التقييم يجب أن يكون بين 1 و 5 نجوم' },
        { status: 400 }
      );
    }

    const cleanComment = typeof comment === 'string' ? comment.trim() : '';
    if (!cleanComment || cleanComment.length < 2) {
      return NextResponse.json(
        { error: 'يرجى كتابة نص التقييم' },
        { status: 400 }
      );
    }

    if (cleanComment.length > 500) {
      return NextResponse.json(
        { error: 'نص التقييم طويل جداً (الحد الأقصى 500 حرف)' },
        { status: 400 }
      );
    }

    const fallbackName = decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'عميل');
    const finalUserName = (typeof userName === 'string' && userName.trim()) ? userName.trim().slice(0, 50) : fallbackName;

    if (!adminDb) {
      return NextResponse.json(
        { error: 'قاعدة البيانات غير متاحة حالياً' },
        { status: 500 }
      );
    }

    const reviewDoc = {
      userId: decodedToken.uid,
      productId: (typeof productId === 'string' && productId.trim()) ? productId.trim() : null,
      userName: finalUserName,
      customerName: finalUserName,
      userEmail: decodedToken.email || null,
      rating: numRating,
      comment: cleanComment,
      status: 'pending', // Strictly set to pending for admin approval
      createdAt: Date.now()
    };

    const docRef = await adminDb.collection('reviews').add(reviewDoc);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: 'تم إرسال تقييمك بنجاح وهو الآن قيد مراجعة الإدارة'
    });
  } catch (error: any) {
    console.error('Submit review error:', error);
    return NextResponse.json(
      { error: error?.message || 'حدث خطأ أثناء إرسال التقييم' },
      { status: 500 }
    );
  }
}
