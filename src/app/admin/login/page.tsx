'use client';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('/admin');
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
          <p className="text-xs text-[var(--admin-text-muted)]">لوحة تحكم Lokstor</p>
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
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
