'use client';

import { useEffect, useRef, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { BellRing, X } from 'lucide-react';
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

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9999] flex flex-col gap-3" dir="rtl">
      {notifications.map((notif) => (
        <div key={notif.id} className="bg-[var(--admin-card)] border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 rounded-xl p-4 w-[320px] flex items-start gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="text-emerald-500 font-bold text-sm mb-1">طلب جديد قيد الانتظار!</h4>
            <p className="text-[var(--admin-text)] text-xs font-medium mb-0.5 truncate max-w-[200px]">{notif.productName}</p>
            <p className="text-[var(--admin-text-muted)] text-[11px] mb-2">بواسطة: {notif.customerName} • {notif.price} د.ج</p>
            <Link 
              href={`/admin/orders`}
              onClick={() => removeNotification(notif.id)}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              الذهاب إلى الطلبات
            </Link>
          </div>
          <button 
            onClick={() => removeNotification(notif.id)}
            className="text-[var(--admin-text-muted)] hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
