'use client';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        router.replace('/admin');
      } else {
        router.replace('/account');
      }
    }
  }, [user, isAdmin, authLoading, router]);

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
        router.replace('/admin');
      } else {
        router.replace('/account');
      }
    } catch {
      router.replace('/admin');
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (e: any) {
      console.error('Google redirect error:', e);
      setError('تعذّر فتح صفحة Google، حاول مجدداً');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      await checkRoleAndRedirect(res.user.uid, res.user.email);
    } catch {
      setError('بريد إلكتروني أو كلمة مرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-sm bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-[var(--admin-hover)] border border-[var(--admin-border)] flex items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-[var(--admin-primary)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--admin-text)]">تسجيل الدخول</h1>
          <p className="text-xs text-[var(--admin-text-muted)]">لوحة تحكم Lokstor للمسؤولين</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email" required placeholder="البريد الإلكتروني"
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full p-3 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-[var(--admin-text)] text-sm focus:border-[var(--admin-primary)] outline-none transition-colors"
          />
          <input
            type="password" required placeholder="كلمة المرور"
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full p-3 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-[var(--admin-text)] text-sm focus:border-[var(--admin-primary)] outline-none transition-colors"
          />
          {error && <p className="text-[var(--admin-danger)] text-xs text-center">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full py-2.5 rounded-md bg-[var(--admin-primary)] text-[var(--admin-bg)] font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-[var(--admin-border)]"></div>
          <span className="text-xs text-[var(--admin-text-muted)]">أو</span>
          <div className="flex-1 h-px bg-[var(--admin-border)]"></div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          type="button"
          className="w-full py-2.5 bg-[var(--admin-hover)] border border-[var(--admin-border)] text-[var(--admin-text)] font-medium text-sm rounded-md hover:opacity-80 transition-opacity flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          <span>المتابعة باستخدام Google</span>
        </button>
      </div>
    </div>
  );
}
