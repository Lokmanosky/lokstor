'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Order } from '@/types';

export default function AbandonedPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const oneHourAgo = Date.now() - 3600 * 1000;
      const list: Order[] = [];
      snap.forEach(d => {
        const o = { id: d.id, ...d.data() } as Order;
        if (o.status === 'pending' && Number(o.createdAt) < oneHourAgo) {
          list.push(o);
        }
      });
      setOrders(list);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">الطلبات المتروكة</h1>
        <p className="text-slate-400 text-sm mt-1">طلبات معلقة اكثر من ساعة بدون تاكيد دفع</p>
      </div>
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['المنتج','العميل','البريد','المبلغ','منذ'].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-slate-400 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const mins = Math.floor((Date.now() - Number(o.createdAt)) / 60000);
                return (
                  <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-300">{o.productName || '\u2014'}</td>
                    <td className="px-4 py-3 text-slate-300">{o.customerName || '\u2014'}</td>
                    <td className="px-4 py-3 text-slate-400">{o.customerEmail || '\u2014'}</td>
                    <td className="px-4 py-3 text-white font-bold">{Number(o.amount || 0).toLocaleString()} \u062f\u062c</td>
                    <td className="px-4 py-3 text-yellow-400">
                      {mins >= 60 ? `${Math.floor(mins/60)}\u0633 ${mins%60}\u062f` : `${mins}\u062f`}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">\u0644\u0627 \u062a\u0648\u062c\u062f \u0637\u0644\u0628\u0627\u062a \u0645\u062a\u0631\u0648\u0643\u0629</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
