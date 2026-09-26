'use client';

import { LogOut, Bell, Menu, Sun, Moon, Eye, Globe, ArrowRight } from 'lucide-react';
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
    // Check initial theme safely on client
    const saved = localStorage.getItem('adminTheme') || 'light';
    setTheme(saved);
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

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('adminTheme', newTheme);
  };

  return (
    <div className="sticky top-0 z-30 h-16 bg-[var(--admin-card)] border-b border-[var(--admin-border)] px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Only show on mobile */}
        {!isLoginPage && (<button 
          onClick={() => setSidebarOpen(!sidebarOpen)} 
          className="md:hidden p-1.5 text-[var(--admin-text-muted)] border border-[var(--admin-border)] rounded-md transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>)}
        <h2 className="font-medium text-[var(--admin-text)] text-sm hidden md:block">لوحة التحكم</h2>
      </div>

      <div className="flex items-center gap-4">
        {isLoginPage ? (<Link href="/" className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-[var(--admin-hover)] text-[var(--admin-text)] rounded-md hover:opacity-80 transition-opacity"><ArrowRight className="w-4 h-4" /><span>العودة للمتجر</span></Link>) : (<Link href="/" target="_blank" className="p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] rounded-md transition-colors" title="عرض المتجر">
          <Eye className="w-4 h-4" />
        </Link>)}
        
        {/* Language Switcher */}
        <div className="relative">
          <button 
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] rounded-md transition-colors"
            title="تغيير اللغة"
          >
            <Globe className="w-4 h-4" />
          </button>
          
          {langDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setLangDropdownOpen(false)}></div>
              <div className="absolute top-10 left-0 w-32 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md shadow-lg overflow-hidden z-50">
                <div className="flex flex-col text-sm">
                  <button onClick={() => {setLang('ar'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--admin-hover)] transition-colors ${lang === 'ar' ? 'text-[var(--admin-primary)] font-bold' : 'text-[var(--admin-text)]'}`}>العربية</button>
                  <button onClick={() => {setLang('en'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--admin-hover)] transition-colors ${lang === 'en' ? 'text-[var(--admin-primary)] font-bold' : 'text-[var(--admin-text)]'}`}>English</button>
                  <button onClick={() => {setLang('fr'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--admin-hover)] transition-colors ${lang === 'fr' ? 'text-[var(--admin-primary)] font-bold' : 'text-[var(--admin-text)]'}`}>Français</button>
                </div>
              </div>
            </>
          )}
        </div>

        <button onClick={toggleTheme} className="p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] rounded-md transition-colors">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        
        {!isLoginPage && (<button className="relative p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] rounded-md transition-colors">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[var(--admin-danger)] rounded-full border border-[var(--admin-card)]" />
          )}
        </button>)}

        {!isLoginPage && <div className="h-4 w-px bg-[var(--admin-border)]" />}

        {!isLoginPage && (<button onClick={handleLogout} className="flex items-center gap-2 text-xs font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج</span>
        </button>)}
      </div>
    </div>
  );
}
