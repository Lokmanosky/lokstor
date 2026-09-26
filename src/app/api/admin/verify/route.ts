import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';
import '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ isAdmin: false, error: 'غير مصرح بالوصول (Missing Token)' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    if (getApps().length === 0) {
      // Development mode fallback if Admin SDK service account key is not attached yet
      return NextResponse.json({ isAdmin: true, mode: 'development_fallback' });
    }

    const adminAuth = getAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Verify custom claim "admin" === true
    const isAdmin = Boolean(decodedToken.admin === true);

    return NextResponse.json({
      isAdmin,
      uid: decodedToken.uid,
      email: decodedToken.email,
    });
  } catch (error: any) {
    console.error('Verify admin error:', error);
    return NextResponse.json(
      { isAdmin: false, error: error?.message || 'فشل التحقق من صلاحيات المشرف' },
      { status: 401 }
    );
  }
}
