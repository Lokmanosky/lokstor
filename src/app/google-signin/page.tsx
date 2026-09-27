'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth } from '@/lib/auth-context';

const GoogleIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function GoogleSignInPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // If already signed in, redirect
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/account');
    }
  }, [user, authLoading, router]);

  const handleSignIn = () => {
    // Called DIRECTLY from user click - no async wrapper breaking gesture context
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithPopup(auth, provider)
      .then(() => {
        setDone(true);
        router.replace('/account');
      })
      .catch((err) => {
        console.error('Google sign-in error:', err?.code, err?.message);
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          setError('تم إلغاء تسجيل الدخول. اضغط الزر مجدداً.');
        } else if (err?.code === 'auth/popup-blocked') {
          setError('تم حظر النافذة من المتصفح. يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مجدداً.');
        } else {
          setError('حدث خطأ: ' + (err?.code || 'unknown'));
        }
        setLoading(false);
      });
  };

  if (authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-[var(--store-bg)]">
        <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-[var(--store-bg)] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-8 shadow-xl text-center space-y-6">
        
        {/* Icon */}
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
          <GoogleIcon />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[var(--store-text)]">تسجيل الدخول</h1>
          <p className="text-sm text-[var(--store-text-muted)]">اضغط الزر أدناه للمتابعة عبر حسابك في Google</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        {done && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl font-medium">
            تم بنجاح! جاري التوجيه...
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading || done}
          className="w-full py-4 px-6 bg-white text-gray-800 font-bold text-base rounded-2xl shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-95"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span>{loading ? 'جاري التحقق...' : 'المتابعة باستخدام Google'}</span>
        </button>

        <button
          onClick={() => router.back()}
          className="text-sm text-[var(--store-text-muted)] hover:text-[var(--store-text)] transition-colors"
        >
          → العودة
        </button>
      </div>
    </div>
  );
}
