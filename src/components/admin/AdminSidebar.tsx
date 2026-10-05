'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n-context';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  LayoutDashboard, ShoppingCart, Package,
  Settings, ChevronLeft, AlertTriangle, Boxes,
  Sun, Moon, Store, FolderOpen, Star, Megaphone, Tag
} from 'lucide-react';

interface Props { open: boolean; setOpen: (v: boolean) => void; isMobile?: boolean; }

export default function AdminSidebar({ open, setOpen, isMobile }: Props) {
  const pathname = usePathname();
  const { t, lang } = useTranslation();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingReviewsCount, setPendingReviewsCount] = useState(0);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const saved = (localStorage.getItem('adminTheme') || localStorage.getItem('store-theme') || 'light') as 'light' | 'dark';
    setTheme(saved);

    const handleThemeChange = (e: any) => {
      if (e.detail) setTheme(e.detail);
    };
    window.addEventListener('lokstor-theme-change', handleThemeChange);
    return () => window.removeEventListener('lokstor-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => setPendingCount(snap.size));
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => setPendingReviewsCount(snap.size));
    return () => unsub();
  }, []);

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

  const navItems = [
    { href: '/admin', label: t('nav.adminDashboard'), icon: LayoutDashboard },
    { href: '/admin/orders', label: t('nav.adminOrders'), icon: ShoppingCart, badge: pendingCount },
    { href: '/admin/abandoned', label: t('nav.adminAbandoned'), icon: AlertTriangle },
    { href: '/admin/products', label: t('nav.adminProducts'), icon: Package },
    { href: '/admin/categories', label: 'أقسام المتجر', icon: FolderOpen },
    { href: '/admin/discounts', label: 'أكواد الخصم', icon: Tag },
    { href: '/admin/ticker', label: 'الشريط الإعلاني', icon: Megaphone },
    { href: '/admin/inventory', label: t('nav.adminInventory'), icon: Boxes },
    { href: '/admin/reviews', label: 'التقييمات', icon: Star, badge: pendingReviewsCount },
    { href: '/admin/settings', label: t('nav.adminSettings'), icon: Settings },
  ];

  return (
    <aside className={`fixed top-0 right-0 h-full z-40 bg-[var(--admin-sidebar)] border-l border-[var(--admin-border)] flex flex-col transition-all duration-300 ${
      isMobile ? (open ? 'w-64 translate-x-0' : 'w-64 translate-x-full') : (open ? 'w-64' : 'w-16')
    }`}>
      {/* Sidebar Header: Arrow on Right (Start in RTL), Lokstor on Left (End in RTL) */}
      <div className={`h-16 flex items-center border-b border-[var(--admin-border)] px-4 ${(!isMobile && !open) ? 'justify-center' : 'justify-between'}`}>
        {!isMobile ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded-md text-[var(--admin-sidebar-muted)] hover:text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
            title={open ? 'تصغير القائمة' : 'توسيع القائمة'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${open ? '' : 'rotate-180'}`} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-[var(--admin-sidebar-muted)] hover:text-[var(--admin-sidebar-text)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {(!isMobile && !open) ? null : (
          <span className="admin-sidebar-title font-bold text-base font-mono tracking-wider select-none">
            Lokstor
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1.5 px-2 overflow-y-auto">
        {/* Top return to store */}
        <div className="pb-2 mb-2 border-b border-[var(--admin-border)]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-bold rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all shadow-xs"
            title="العودة للمتجر"
            onClick={() => { if (isMobile) setOpen(false); }}
          >
            <Store className="w-[18px] h-[18px] flex-shrink-0 text-emerald-500" />
            {(open || isMobile) && <span className="flex-1">{t('nav.backToStore')}</span>}
          </Link>
        </div>
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          const showLabel = isMobile || open;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => { if(isMobile) setOpen(false); }}
              className={`admin-sidebar-link flex items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all duration-200 group relative rounded-md ${
                isActive ? 'active border-r-2 border-[var(--admin-sidebar-active)]' : 'border-r-2 border-transparent hover:bg-[var(--admin-hover)]'
              }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0 transition-colors" />
              {showLabel && (
                <span className="flex-1 text-sm font-semibold">
                  {label}
                </span>
              )}
              {badge !== undefined && badge > 0 && (
                <span className={`text-white bg-emerald-600 text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 ${showLabel ? 'px-2 py-0.5 min-w-[20px]' : 'absolute top-1 left-1 w-4 h-4'}`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {!showLabel && (
                <div className="absolute right-full mr-3 bg-[var(--admin-card)] text-[var(--admin-text)] text-xs border border-[var(--admin-border)] px-2 py-1 rounded shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Return to Store */}
      <div className="px-2 pb-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-md border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition-all group"
          title="العودة للمتجر"
          onClick={() => { if(isMobile) setOpen(false); }}
        >
          <Store className="w-[18px] h-[18px] flex-shrink-0 text-emerald-500" />
          {(open || isMobile) && <span className="flex-1">العودة للمتجر</span>}
        </Link>
      </div>

      {/* Dedicated Theme Toggle at the bottom of the sidebar */}
      <div className="p-2.5 border-t border-[var(--admin-border)] mt-auto">
        <button
          type="button"
          onClick={toggleTheme}
          className="admin-sidebar-theme-btn w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
          title={theme === 'dark' ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
        >
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-500 flex-shrink-0" />
            )}
            {(open || isMobile) && (
              <span className="text-current font-medium">
                {theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
              </span>
            )}
          </div>
          {(open || isMobile) && (
            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[var(--admin-hover)] text-current">
              {theme === 'dark' ? '☀️ فاتح' : '🌙 داكن'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}
