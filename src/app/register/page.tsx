'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UserPlus, LogIn, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';

const GoogleIcon = () => (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function RegisterPage() {
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        setSuccess('تم تسجيل الدخول بنجاح! جاري التوجيه...');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        setSuccess('تم إنشاء الحساب بنجاح! جاري التوجيه...');
      }
      
      const redirectUrl = sessionStorage.getItem('post_login_redirect') || '/account';
      sessionStorage.removeItem('post_login_redirect');
      setTimeout(() => router.push(redirectUrl), 1000);
    } catch (err: any) {
      if (err.message.includes('auth/email-already-in-use')) {
        setError('هذا البريد مستخدم بالفعل');
      } else if (err.message.includes('auth/weak-password')) {
        setError('كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)');
      } else if (err.message.includes('auth/invalid-credential') || err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else {
        setError(isLogin ? 'حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة لاحقاً' : 'حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة لاحقاً');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      const redirectUrl = sessionStorage.getItem('post_login_redirect') || '/account';
      sessionStorage.removeItem('post_login_redirect');
      router.push(redirectUrl);
    } catch (err: any) {
      console.error('Google register error:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch {
          setError('تم حظر النافذة المنبثقة من المتصفح، يرجى السماح بها');
        }
      } else {
        setError('تعذّر التسجيل عبر Google، حاول مجدداً');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Redirect if already logged in
  if (user) {
    if (typeof window !== 'undefined') {
      const redirectUrl = sessionStorage.getItem('post_login_redirect') || '/account';
      sessionStorage.removeItem('post_login_redirect');
      router.push(redirectUrl);
    }
    return null;
  }

  return (
    <div className="min-h-[85vh] bg-[var(--store-bg)] flex items-center justify-center p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-md bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-md transition-colors">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[var(--store-hover)] border border-[var(--store-border)] flex items-center justify-center mx-auto mb-3 shadow-sm">
            {isLogin ? (
              <LogIn className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <UserPlus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <h1 className="text-2xl font-black text-[var(--store-text)] tracking-tight">
            {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--store-text-muted)] font-medium">
            {isLogin 
              ? 'مرحباً بعودتك! سجل الدخول للوصول لطلباتك' 
              : 'انضم إلينا للاستفادة من العروض والوصول لطلباتك الرقمية فوراً'}
          </p>
        </div>
        
        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[var(--store-text)]">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required={!isLogin}
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--store-bg)] border-2 border-[var(--store-border)] text-[var(--store-text)] text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors placeholder:text-slate-400 font-medium"
                placeholder="مثال: محمد الأمين"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--store-text)]">
              البريد الإلكتروني <span className="text-red-500">*</span>
            </label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[var(--store-bg)] border-2 border-[var(--store-border)] text-[var(--store-text)] text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors placeholder:text-slate-400 font-medium"
              placeholder="name@example.com"
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[var(--store-text)]">
              كلمة المرور <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                minLength={6}
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[var(--store-bg)] border-2 border-[var(--store-border)] text-[var(--store-text)] text-sm rounded-xl pr-4 pl-11 py-3 focus:outline-none focus:border-emerald-600 dark:focus:border-emerald-400 transition-colors placeholder:text-slate-400 font-medium"
                placeholder="••••••••"
                dir="ltr"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--store-text-muted)] hover:text-[var(--store-text)] transition-colors cursor-pointer"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-[var(--store-text-muted)]">يجب أن تتكون من 6 خانات على الأقل.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs text-center rounded-xl font-bold">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs text-center rounded-xl font-bold flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="chargily-btn w-full py-3.5 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all mt-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'جاري المعالجة...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب')}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--store-border)]"></div>
          <span className="text-xs text-[var(--store-text-muted)] font-bold">أو</span>
          <div className="flex-1 h-px bg-[var(--store-border)]"></div>
        </div>

        {/* Google sign up */}
        <button 
          onClick={handleGoogleRegister}
          disabled={googleLoading || loading}
          type="button"
          className="w-full py-3 px-4 bg-[var(--store-bg)] border-2 border-[var(--store-border)] hover:border-emerald-500 text-[var(--store-text)] font-bold text-xs sm:text-sm rounded-xl hover:bg-[var(--store-hover)] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          <span>{googleLoading ? 'جاري الفتح...' : 'المتابعة باستخدام Google'}</span>
        </button>
        
        {/* Footer links */}
        <div className="text-center text-xs text-[var(--store-text-muted)] pt-4 border-t border-[var(--store-border)] space-y-2">
          <div>
            {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)} 
              className="text-emerald-600 dark:text-emerald-400 font-black hover:underline cursor-pointer"
            >
              {isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </button>
          </div>
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-[var(--store-text-muted)] hover:text-[var(--store-text)] transition-colors">
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة لصفحة المتجر الرئيسية</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
