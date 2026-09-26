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

interface Props { open: boolean; setOpen: (v: boolean) => void; }

export default function AdminSidebar({ open, setOpen }: Props) {
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

  return (
    <div className={`fixed top-0 right-0 h-full bg-[var(--admin-sidebar)] border-l border-[var(--admin-border)] z-40 flex flex-col transition-all duration-300 ${open ? 'w-64' : 'w-16'}`}>
      <div className={`h-16 flex items-center border-b border-[var(--admin-border)] px-4 ${open ? 'justify-between' : 'justify-center'}`}>
        {open && (
          <span className="font-semibold text-[var(--admin-text)] text-sm">لوقستور</span>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="p-1.5 rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${open ? '' : 'rotate-180'}`} />
        </button>
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const isActive = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'text-[var(--admin-primary)] bg-[var(--admin-hover)] border-r-2 border-[var(--admin-primary)]'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] border-r-2 border-transparent'
              }`}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {open && <span className="flex-1 text-sm">{label}</span>}
              {badge !== undefined && badge > 0 && (
                <span className={`text-[var(--admin-bg)] bg-[var(--admin-primary)] text-[10px] font-medium rounded-sm flex items-center justify-center flex-shrink-0 ${open ? 'px-1.5 py-0.5 min-w-[18px]' : 'absolute top-1 left-1 w-4 h-4'}`}>
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {!open && (
                <div className="absolute right-full mr-3 bg-[var(--admin-card)] text-[var(--admin-text)] text-xs border border-[var(--admin-border)] px-2 py-1 rounded-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
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
