'use client';

import { LogOut, Bell, Menu, Sun, Moon, ExternalLink, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { useTranslation } from '@/lib/i18n-context';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

interface Props { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void; isLoginPage?: boolean; }

export default function AdminTopBar({ sidebarOpen, setSidebarOpen, isLoginPage }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [theme, setTheme] = useState('light');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const { lang, setLang } = useTranslation();

  useEffect(() => {
    const saved = (localStorage.getItem('adminTheme') || localStorage.getItem('store-theme') || 'light') as 'light' | 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
    document.body.setAttribute('data-theme', saved);
    document.documentElement.classList.toggle('dark', saved === 'dark');

    const handleThemeChange = (e: any) => {
      if (e.detail) setTheme(e.detail);
    };
    window.addEventListener('lokstor-theme-change', handleThemeChange);
    return () => window.removeEventListener('lokstor-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    if (isLoginPage) return;
    const q = query(collection(db, 'notifications'), where('read', '==', false));
    const unsub = onSnapshot(q, (snap) => setUnreadCount(snap.size));
    return () => unsub();
  }, [isLoginPage]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const toggleTheme = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const current = document.documentElement.getAttribute('data-theme') || theme || 'light';
    const newTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    try {
      localStorage.setItem('adminTheme', newTheme);
      localStorage.setItem('store-theme', newTheme);
    } catch {}
    window.dispatchEvent(new CustomEvent('lokstor-theme-change', { detail: newTheme }));
  };

  return (
    <div className="sticky top-0 z-30 h-16 bg-[var(--admin-card)] border-b border-[var(--admin-border)] px-4 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Only show on mobile */}
        {!isLoginPage && (
          <button 
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="md:hidden p-1.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] border border-[var(--admin-border)] rounded-md transition-colors cursor-pointer"
            title="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-semibold text-[var(--admin-text)] text-sm hidden md:block select-none">
          لوحة التحكم
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Visit store link: clearly labeled button with ExternalLink icon */}
        {isLoginPage ? (
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-[var(--admin-hover)] text-[var(--admin-text)] rounded-md hover:opacity-80 transition-opacity"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة للمتجر</span>
          </Link>
        ) : (
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-[var(--admin-border)] rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors"
            title="فتح المتجر في نافذة جديدة"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-500" />
            <span>زيارة المتجر</span>
          </a>
        )}
        
        {/* Language Switcher */}
        <div className="relative">
          <button 
            type="button"
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="p-2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] rounded-md transition-colors cursor-pointer"
            title="تغيير اللغة"
          >
            <Globe className="w-4 h-4" />
          </button>
          
          {langDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)}></div>
              <div className="absolute top-10 left-0 w-32 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md shadow-lg overflow-hidden z-50">
                <div className="flex flex-col text-xs font-medium">
                  <button onClick={() => {setLang('ar'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--admin-hover)] transition-colors ${lang === 'ar' ? 'text-emerald-500 font-bold' : 'text-[var(--admin-text)]'}`}>العربية</button>
                  <button onClick={() => {setLang('en'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--admin-hover)] transition-colors ${lang === 'en' ? 'text-emerald-500 font-bold' : 'text-[var(--admin-text)]'}`}>English</button>
                  <button onClick={() => {setLang('fr'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--admin-hover)] transition-colors ${lang === 'fr' ? 'text-emerald-500 font-bold' : 'text-[var(--admin-text)]'}`}>Français</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Clear, distinct Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-card)] text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer shadow-2xs"
          title={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold hidden md:inline">نهاري</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold hidden md:inline">ليلي</span>
            </>
          )}
        </button>
        
        {!isLoginPage && (
          <button
            type="button"
            className="relative p-2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] rounded-md transition-colors cursor-pointer"
            title="الإشعارات"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--admin-danger)] rounded-full border border-[var(--admin-card)]" />
            )}
          </button>
        )}

        {!isLoginPage && <div className="h-4 w-px bg-[var(--admin-border)]" />}

        {!isLoginPage && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--admin-text-muted)] hover:text-red-500 transition-colors cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        )}
      </div>
    </div>
  );
}
