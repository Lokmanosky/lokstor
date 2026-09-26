'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function RegisterPage() {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      setSuccess('تم إنشاء الحساب بنجاح! جاري التوجيه...');
      setTimeout(() => router.push('/account'), 1200);
    } catch (err: any) {
      if (err.message.includes('auth/email-already-in-use')) {
        setError('هذا البريد مستخدم بالفعل');
      } else if (err.message.includes('auth/weak-password')) {
        setError('كلمة المرور ضعيفة جداً');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setSuccess('تم التسجيل بنجاح! جاري التوجيه...');
      setTimeout(() => router.push('/account'), 1200);
    } catch (err: any) {
      setError('فشل التسجيل عبر جوجل');
    }
  };

  // Redirect if already logged in
  if (user) {
    if (typeof window !== 'undefined') {
      router.push('/account');
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-neutral-800 rounded-xl p-8 space-y-6">
        <div className="text-center space-y-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">إنشاء حساب جديد</h1>
          <p className="text-xs text-neutral-400">انضم إلينا للوصول إلى أفضل المنتجات الرقمية</p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">الاسم الكامل</label>
            <input 
              type="text" required
              value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-md px-4 py-2.5 focus:outline-none focus:border-neutral-600 transition-colors"
              placeholder="محمد أحمد"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">البريد الإلكتروني</label>
            <input 
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-md px-4 py-2.5 focus:outline-none focus:border-neutral-600 transition-colors"
              placeholder="name@example.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} required minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 text-white text-sm rounded-md pr-4 pl-10 py-2.5 focus:outline-none focus:border-neutral-600 transition-colors"
                placeholder="••••••••"
                dir="ltr"
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center py-2.5 rounded-md font-medium">
              {success}
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full py-2.5 bg-white text-black font-bold text-sm rounded-md hover:bg-neutral-200 transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2">
          <div className="flex-1 h-px bg-neutral-800"></div>
          <span className="text-xs text-neutral-500">أو</span>
          <div className="flex-1 h-px bg-neutral-800"></div>
        </div>

        <button 
          onClick={handleGoogleRegister}
          className="w-full py-2.5 bg-neutral-900 border border-neutral-800 text-white font-medium text-sm rounded-md hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
        >
          <GoogleIcon />
          <span>التسجيل باستخدام Google</span>
        </button>
        
        <div className="text-center text-xs text-neutral-500 pt-4 border-t border-neutral-800 mt-6">
          لديك حساب بالفعل؟ <Link href="/" className="text-white font-medium hover:underline">تسجيل الدخول من الشريط العلوي</Link>
        </div>
      </div>
    </div>
  );
}
