'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Order } from '@/types';

export default function AbandonedOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('status', '==', 'pending'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Order[] = [];
      const now = Date.now();
      snap.forEach(d => {
        const o = { id: d.id, ...d.data() } as Order;
        // Check if older than 1 hour (3600000 ms)
        if (now - Number(o.createdAt) > 3600000) {
          list.push(o);
        }
      });
      // Sort newest first
      list.sort((a,b) => Number(b.createdAt) - Number(a.createdAt));
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)]">الطلبات المتروكة</h1>
        <p className="text-sm text-[var(--admin-text-muted)] mt-1">طلبات معلقة أكثر من ساعة بدون تأكيد دفع</p>
      </div>

      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">البريد</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">منذ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                    جاري التحميل...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                    لا توجد طلبات متروكة
                  </td>
                </tr>
              ) : (
                orders.map(o => {
                  const hours = Math.floor((Date.now() - Number(o.createdAt)) / 3600000);
                  return (
                    <tr key={o.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                      <td className="px-4 py-3 text-[var(--admin-text)]">{o.productName || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-text)]">{o.customerName || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">{o.customerEmail || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-text)]">{Number(o.amount || o.productPrice || 0).toLocaleString()} د.ج</td>
                      <td className="px-4 py-3">
                        <span className="text-[var(--admin-danger)] font-medium text-xs">
                          {hours} ساعة
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
