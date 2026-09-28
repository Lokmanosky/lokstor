'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Lock, Store, ArrowRight, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/account';
      }
    }
  }, [user, isAdmin, authLoading]);

  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        await checkRoleAndRedirect(result.user.uid, result.user.email);
      }
    }).catch(() => {});
  }, []);

  const checkRoleAndRedirect = async (uid: string, userEmail?: string | null) => {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      const role = snap.exists() ? snap.data()?.role : (userEmail?.toLowerCase() === 'loktech.dz@gmail.com' ? 'admin' : 'customer');
      if (role === 'admin') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/account';
      }
    } catch {
      window.location.href = '/admin';
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const res = await signInWithPopup(auth, provider);
      await checkRoleAndRedirect(res.user.uid, res.user.email);
    } catch (e: any) {
      console.error('Google login error:', e);
      if (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') {
        setGoogleLoading(false);
        return;
      }
      if (e?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch {
          setError('تم حظر النافذة المنبثقة من المتصفح، يرجى السماح بها');
        }
      } else {
        setError('تعذّر تسجيل الدخول عبر Google، حاول مجدداً');
      }
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      await checkRoleAndRedirect(res.user.uid, res.user.email);
    } catch (err: any) {
      console.error('Email login error:', err);
      setError(err?.message?.includes('invalid-credential') ? 'البريد أو كلمة المرور غير صحيحة' : 'حدث خطأ أثناء تسجيل الدخول');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] flex flex-col items-center justify-center p-4" dir="rtl">
      {/* Top back to store bar */}
      <div className="w-full max-w-sm mb-4 flex justify-between items-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all shadow-xs"
        >
          <Store className="w-4 h-4 text-emerald-500" />
          <span>العودة لصفحة المتجر</span>
        </Link>
        <span className="text-xs text-[var(--admin-text-muted)]">Lokstor Admin</span>
      </div>

      <div className="w-full max-w-sm bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-black text-[var(--admin-text)]">تسجيل دخول المسؤول</h1>
          <p className="text-xs text-[var(--admin-text-muted)]">لوحة تحكم Lokstor للمسؤولين</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">البريد الإلكتروني</label>
            <input
              type="email" required placeholder="admin@example.com"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full p-3 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl text-[var(--admin-text)] text-sm focus:border-emerald-500 outline-none transition-colors"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--admin-text-muted)] mb-1">كلمة المرور</label>
            <input
              type="password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full p-3 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl text-[var(--admin-text)] text-sm focus:border-emerald-500 outline-none transition-colors"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[var(--admin-danger)] text-xs text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || googleLoading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all shadow-md hover:shadow-emerald-500/25 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            {loading ? 'جاري التحقق...' : 'دخول إلى لوحة التحكم'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-[var(--admin-border)]"></div>
          <span className="text-xs text-[var(--admin-text-muted)] font-medium">أو</span>
          <div className="flex-1 h-px bg-[var(--admin-border)]"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          type="button"
          className="w-full py-3 bg-[var(--admin-bg)] border border-[var(--admin-border)] hover:border-emerald-500 text-[var(--admin-text)] font-bold text-sm rounded-xl hover:bg-[var(--admin-hover)] transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer active:scale-95 shadow-xs"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span>{googleLoading ? 'جاري الفتح...' : 'المتابعة باستخدام Google'}</span>
        </button>

        {/* Big direct button back to store */}
        <div className="pt-2 border-t border-[var(--admin-border)]">
          <Link
            href="/"
            className="w-full py-2.5 px-4 bg-[var(--admin-hover)] hover:bg-[var(--admin-border)] text-[var(--admin-text)] font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Store className="w-4 h-4 text-emerald-500" />
            <span>العودة إلى المتجر الرئيسي</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
