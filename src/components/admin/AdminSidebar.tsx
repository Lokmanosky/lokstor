'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  LayoutDashboard, ShoppingCart, Package,
  Settings, ChevronLeft, AlertTriangle, Boxes
} from 'lucide-react';

interface Props { open: boolean; setOpen: (v: boolean) => void; isMobile?: boolean; }

export default function AdminSidebar({ open, setOpen, isMobile }: Props) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', 'in', ['pending', 'paid']));
    const unsub = onSnapshot(q, (snap) => setPendingCount(snap.size));
    return () => unsub();
  }, []);

  const navItems = [
    { href: '/admin', label: 'الرئيسية', icon: LayoutDashboard },
    { href: '/admin/orders', label: 'الطلبات', icon: ShoppingCart, badge: pendingCount },
    { href: '/admin/abandoned', label: 'المتروكة', icon: AlertTriangle },
    { href: '/admin/products', label: 'المنتجات', icon: Package },
    { href: '/admin/inventory', label: 'المخزون', icon: Boxes },
    { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
  ];

  // Logic for positioning based on mobile state
  let transformClass = '';
  if (isMobile) {
     transformClass = open ? 'translate-x-0' : 'translate-x-full';
  }

  return (
    <div className={`fixed top-0 right-0 h-full bg-[var(--admin-sidebar)] border-l border-[var(--admin-border)] z-50 flex flex-col transition-all duration-300 ${
      isMobile ? 'w-64' : (open ? 'w-64' : 'w-16')
    } ${transformClass}`}>
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

      <nav className="flex-1 py-4 space-y-1.5 px-2 overflow-y-auto">
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
    </div>
  );
}
