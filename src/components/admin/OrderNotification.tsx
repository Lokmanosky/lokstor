'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { BellRing, X, CheckCheck } from 'lucide-react';
import Link from 'next/link';

const playBeep = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    // Frequency for a nice "ding"
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {
    console.error('Audio play failed', e);
  }
};

export default function OrderNotification() {
  const { isAdmin } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'orders'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        return; // Skip initial load
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const order = change.doc.data();
          const newNotif = {
            id: change.doc.id,
            productName: order.productName || 'منتج غير معروف',
            customerName: order.customerName || 'عميل',
            price: order.productPrice || 0,
            time: Date.now()
          };
          
          setNotifications(prev => [newNotif, ...prev]);
          
          playBeep();
          
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('طلب جديد 🛍️', {
              body: `طلب جديد من ${newNotif.customerName} بقيمة ${newNotif.price} د.ج`,
            });
          }
        }
      });
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-2.5 max-w-[340px]" dir="rtl">
      {/* Notifications list (show max 4 cards to prevent screen crowding) */}
      {notifications.slice(0, 4).map((notif) => (
        <div 
          key={notif.id} 
          className="bg-[var(--admin-card)] border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-xl p-3.5 w-[320px] sm:w-[330px] flex items-start gap-3.5 animate-in slide-in-from-bottom-5 fade-in duration-300"
        >
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-emerald-500 font-bold text-xs sm:text-sm mb-1 flex items-center justify-between">
              <span>طلب جديد قيد الانتظار!</span>
            </h4>
            <p className="text-[var(--admin-text)] text-xs font-semibold mb-0.5 truncate">{notif.productName}</p>
            <p className="text-[var(--admin-text-muted)] text-[11px] mb-2 truncate">بواسطة: {notif.customerName} • {notif.price} د.ج</p>
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--admin-border)]/50">
              <Link 
                href={`/admin/orders`}
                onClick={() => removeNotification(notif.id)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                الذهاب إلى الطلبات ←
              </Link>
              <button
                type="button"
                onClick={() => removeNotification(notif.id)}
                className="text-[11px] text-[var(--admin-text-muted)] hover:text-emerald-500 flex items-center gap-1 transition-colors cursor-pointer"
                title="إخفاء هذا الإشعار فقط"
              >
                <CheckCheck className="w-3 h-3" />
                <span>تم</span>
              </button>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => removeNotification(notif.id)}
            className="text-[var(--admin-text-muted)] hover:text-red-500 transition-colors p-1 shrink-0 -mr-1 -mt-1 cursor-pointer"
            title="إغلاق هذا الإشعار"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      {notifications.length > 4 && (
        <div className="text-center text-[11px] font-medium text-[var(--admin-text-muted)] bg-[var(--admin-card)]/90 border border-[var(--admin-border)] py-1.5 px-3 rounded-lg shadow-sm">
          +{notifications.length - 4} طلبات أخرى في قائمة الانتظار
        </div>
      )}

      {/* Quick Action Bar placed at the BOTTOM for fast 1-click access */}
      <div className="bg-[var(--admin-card)]/95 backdrop-blur-md border border-emerald-500/40 shadow-xl rounded-xl p-2.5 px-3 flex items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2 text-[var(--admin-text)] font-bold text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{notifications.length} {notifications.length === 1 ? 'إشعار جديد' : 'إشعارات جديدة'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href="/admin/orders"
            onClick={clearAllNotifications}
            className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-1 py-0.5"
          >
            كل الطلبات
          </Link>
          <button
            type="button"
            onClick={clearAllNotifications}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 hover:text-white border border-emerald-500/30 transition-all font-bold text-[11px] cursor-pointer shadow-xs"
            title="إخفاء ومسح جميع الإشعارات الحالية"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>قراءة وإخفاء الكل</span>
          </button>
        </div>
      </div>
    </div>
  );
}
