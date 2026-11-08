'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ShoppingCart, Package, Plus, Tag, Settings } from 'lucide-react';

export default function AdminBottomNav() {
  const pathname = usePathname();
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => setPendingOrders(snap.size), () => {});
    return () => unsub();
  }, []);

  const isOrdersActive = pathname.startsWith('/admin/orders');
  const isProductsActive = pathname === '/admin/products' || (pathname.startsWith('/admin/products/') && pathname !== '/admin/products/new');
  const isAddProductActive = pathname === '/admin/products/new';
  const isDiscountsActive = pathname.startsWith('/admin/discounts');
  const isSettingsActive = pathname.startsWith('/admin/settings');

  return (
    <nav 
      aria-label="شريط التنقل السريع للوحة التحكم"
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-[var(--admin-card)]/95 backdrop-blur-md border-t border-[var(--admin-border)] shadow-[0_-4px_25px_rgba(0,0,0,0.12)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      dir="rtl"
    >
      <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
        
        {/* 1. اليمين الأول: طلبات */}
        <Link
          href="/admin/orders"
          className={`flex flex-col items-center justify-center w-full py-1 text-center transition-all ${
            isOrdersActive 
              ? 'text-[var(--admin-primary)] font-bold' 
              : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
          }`}
        >
          <div className="relative">
            <ShoppingCart className={`w-5 h-5 transition-transform ${isOrdersActive ? 'scale-110' : ''}`} />
            {pendingOrders > 0 && (
              <span className="absolute -top-1.5 -left-2 min-w-[16px] h-4 px-1 rounded-full bg-emerald-500 text-[var(--admin-bg)] text-[10px] font-black flex items-center justify-center shadow-xs">
                {pendingOrders > 99 ? '99+' : pendingOrders}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">الطلبات</span>
          {isOrdersActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-primary)] mt-0.5"></span>
          )}
        </Link>

        {/* 2. اليمين الثاني: منتجات */}
        <Link
          href="/admin/products"
          className={`flex flex-col items-center justify-center w-full py-1 text-center transition-all ${
            isProductsActive 
              ? 'text-[var(--admin-primary)] font-bold' 
              : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
          }`}
        >
          <Package className={`w-5 h-5 transition-transform ${isProductsActive ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">المنتجات</span>
          {isProductsActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-primary)] mt-0.5"></span>
          )}
        </Link>

        {/* 3. الوسط: إضافة منتج (زر مميز بارز) */}
        <Link
          href="/admin/products/new"
          className="flex flex-col items-center justify-center w-full group -mt-4 relative"
          title="إضافة منتج جديد"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all border-4 border-[var(--admin-card)] ${
            isAddProductActive
              ? 'bg-[var(--admin-primary)] text-[var(--admin-bg)] scale-105 shadow-emerald-500/40'
              : 'bg-[var(--admin-primary)] text-[var(--admin-bg)] group-hover:scale-105 shadow-emerald-500/30'
          }`}>
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className={`text-[10px] mt-0.5 font-bold tracking-tight ${
            isAddProductActive ? 'text-[var(--admin-primary)]' : 'text-[var(--admin-text)]'
          }`}>
            إضافة منتج
          </span>
        </Link>

        {/* 4. اليسار الثاني: أكواد خصم */}
        <Link
          href="/admin/discounts"
          className={`flex flex-col items-center justify-center w-full py-1 text-center transition-all ${
            isDiscountsActive 
              ? 'text-[var(--admin-primary)] font-bold' 
              : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
          }`}
        >
          <Tag className={`w-5 h-5 transition-transform ${isDiscountsActive ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">أكواد خصم</span>
          {isDiscountsActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-primary)] mt-0.5"></span>
          )}
        </Link>

        {/* 5. اليسار الأول: إعدادات */}
        <Link
          href="/admin/settings"
          className={`flex flex-col items-center justify-center w-full py-1 text-center transition-all ${
            isSettingsActive 
              ? 'text-[var(--admin-primary)] font-bold' 
              : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
          }`}
        >
          <Settings className={`w-5 h-5 transition-transform ${isSettingsActive ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-1 tracking-tight">الإعدادات</span>
          {isSettingsActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--admin-primary)] mt-0.5"></span>
          )}
        </Link>

      </div>
    </nav>
  );
}
