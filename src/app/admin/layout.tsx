'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';
import { Loader2, ShieldAlert, ArrowRight, LogOut, User } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, isAdmin, loading, profileLoading, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [loading, user, isLoginPage, router]);

  useEffect(() => {
    const saved = localStorage.getItem('adminTheme') || localStorage.getItem('store-theme') || 'light';
    document.documentElement.setAttribute('data-theme', saved);
    document.body.setAttribute('data-theme', saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');
  }, []);

  useEffect(() => {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    return () => {
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    }
  }, []);

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] flex items-center justify-center text-[var(--admin-primary)] overflow-x-hidden">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) return null;

  // ACCESS DENIED for Customer accounts
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl p-8 text-center space-y-6 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold text-[var(--admin-text)]">غير مصرح بالدخول للوحة التحكم</h1>
            <p className="text-sm text-[var(--admin-text-muted)] leading-relaxed">
              حسابك (<span className="text-[var(--admin-text)] font-semibold" dir="ltr">{user.email}</span>) مسجل كـ <strong>عميل عادي (Customer)</strong> وليس لديه صلاحية الإدارة (Admin).
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] text-xs text-right text-[var(--admin-text-muted)] space-y-1.5 leading-relaxed">
            <p className="font-semibold text-[var(--admin-text)]">🔑 كيف تمنح نفسك صلاحية المسؤول؟</p>
            <p>1. افتح مشروعك في <strong className="text-[var(--admin-text)]">Firebase Console</strong>.</p>
            <p>2. اذهب إلى <strong className="text-[var(--admin-text)]">Cloud Firestore</strong> ثم مجموعة <strong className="text-[var(--admin-text)]">users</strong>.</p>
            <p>3. اختر وثيقة حسابك، وغيّر قيمة <code className="text-amber-400 font-mono font-bold">role</code> من <code className="text-red-400 font-mono font-bold">&quot;customer&quot;</code> إلى <code className="text-emerald-400 font-mono font-bold">&quot;admin&quot;</code>.</p>
          </div>

          <div className="space-y-3 pt-2">
            <Link
              href="/account"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-[var(--admin-primary)] text-[var(--admin-bg)] font-bold text-sm hover:opacity-90 transition-opacity"
            >
              <User className="w-4 h-4" />
              <span>الذهاب إلى حسابي وسجل طلباتي</span>
            </Link>

            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border border-[var(--admin-border)] text-sm font-medium hover:bg-[var(--admin-hover)] transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لصفحة المتجر الرئيسية</span>
            </Link>

            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin verified
  return (
    <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] flex overflow-x-hidden" dir="rtl">
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full md:w-auto ${isMobile ? 'mr-0' : (sidebarOpen ? 'mr-64' : 'mr-16')}`}>
        <AdminTopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} isLoginPage={false} />
        <main className="flex-1 p-6 overflow-y-auto bg-[var(--admin-bg)]">
          {children}
        </main>
      </div>
    </div>
  );
}
