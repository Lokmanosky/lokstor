'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Order } from '@/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list: Order[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Order));
      setOrders(list);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-white">الطلبات 🛒</h1>
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                {['#','المنتج','العميل','البريد','المبلغ','الحالة','التاريخ'].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-slate-400 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <tr key={o.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-3 text-slate-500">{i+1}</td>
                  <td className="px-4 py-3 text-slate-300 max-w-[120px] truncate">{o.productName || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{o.customerName || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{o.customerEmail || '—'}</td>
                  <td className="px-4 py-3 text-white font-bold whitespace-nowrap">{Number(o.amount).toLocaleString()} دج</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full font-bold ${
                      o.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' :
                      o.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {o.status === 'paid' ? 'مدفوع' : o.status === 'failed' ? 'فشل' : 'معلق'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(Number(o.createdAt)).toLocaleDateString('ar-DZ')}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">لا توجد طلبات بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
