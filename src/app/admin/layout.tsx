'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminTopBar from '@/components/admin/AdminTopBar';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default false for mobile
  const [isMobile, setIsMobile] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    // Check if mobile
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
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setAuthed(true); }
      else if (!isLoginPage) { router.replace('/admin/login'); }
      setAuthReady(true);
    });
    return () => unsub();
  }, [router, isLoginPage]);

  // Set default theme attribute safely on client
  useEffect(() => {
    const saved = localStorage.getItem('adminTheme');
    if (saved) {
      document.body.setAttribute('data-theme', saved);
    } else {
      document.body.setAttribute('data-theme', 'light');
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    return () => {
      document.documentElement.style.overflowX = '';
      document.body.style.overflowX = '';
    }
  }, []);

  if (isLoginPage) return <>{children}</>;

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] flex items-center justify-center text-[var(--admin-primary)] overflow-x-hidden">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] flex overflow-x-hidden" dir="rtl">
      
      {/* Mobile Backdrop */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar open={sidebarOpen} setOpen={setSidebarOpen} isMobile={isMobile} />
      
      <div className={`flex-1 flex flex-col transition-all duration-300 w-full md:w-auto ${isMobile ? 'mr-0' : (sidebarOpen ? 'mr-64' : 'mr-16')}`}>
        <AdminTopBar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 p-6 overflow-y-auto bg-[var(--admin-bg)]">
          {children}
        </main>
      </div>
    </div>
  );
}
