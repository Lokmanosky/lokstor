'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Order } from '@/types';
import { Wallet, ShoppingBag, ArrowUpRight, TrendingUp, Clock, AlertCircle } from 'lucide-react';

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalOrders: 0,
    pendingOrders: 0,
  });

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
      let totSales = 0;
      let todSales = 0;
      let totOrders = 0;
      let pendOrders = 0;
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayTime = today.getTime();

      const ordersList: Order[] = [];

      snap.forEach(d => {
        const o = { id: d.id, ...d.data() } as Order;
        ordersList.push(o);
        
        if (o.status === 'paid') {
          totSales += Number(o.amount || o.productPrice || 0);
          totOrders++;
          if (Number(o.createdAt) >= todayTime) {
            todSales += Number(o.amount || o.productPrice || 0);
          }
        }
        if (o.status === 'pending') pendOrders++;
      });

      setStats({
        totalSales: totSales,
        todaySales: todSales,
        totalOrders: totOrders,
        pendingOrders: pendOrders,
      });

      // Sort and get 5 recent
      ordersList.sort((a,b) => Number(b.createdAt) - Number(a.createdAt));
      setRecentOrders(ordersList.slice(0, 5));
    });

    return () => unsub();
  }, []);

  const cards = [
    { title: 'إجمالي المبيعات', value: `${stats.totalSales.toLocaleString()} د.ج`, icon: Wallet },
    { title: 'مبيعات اليوم', value: `${stats.todaySales.toLocaleString()} د.ج`, icon: TrendingUp },
    { title: 'إجمالي الطلبات (مدفوعة)', value: stats.totalOrders.toString(), icon: ShoppingBag },
    { title: 'طلبات قيد الانتظار', value: stats.pendingOrders.toString(), icon: Clock, alert: stats.pendingOrders > 0 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)]">نظرة عامة</h1>
        <p className="text-sm text-[var(--admin-text-muted)] mt-1">ملخص أداء المتجر والإحصائيات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <div key={i} className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-4 flex flex-col justify-between shadow-sm">
            <div className="flex justify-between items-start">
              <span className="text-sm font-medium text-[var(--admin-text-muted)]">{c.title}</span>
              <div className="p-1.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-sm">
                <c.icon className="w-4 h-4 text-[var(--admin-text)]" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-2xl font-semibold text-[var(--admin-text)]">{c.value}</span>
              {c.alert && (
                <div className="w-1.5 h-1.5 bg-[var(--admin-danger)] rounded-full animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm">
        <div className="p-4 border-b border-[var(--admin-border)] flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--admin-text)]">أحدث الطلبات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {recentOrders.map(o => (
                <tr key={o.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                  <td className="px-4 py-3 text-[var(--admin-text)]">{o.productName || '\u2014'}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{o.customerEmail || '\u2014'}</td>
                  <td className="px-4 py-3 text-[var(--admin-text)]">{Number(o.amount || o.productPrice || 0).toLocaleString()} د.ج</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${o.status === 'paid' ? 'bg-[var(--admin-primary)]' : o.status === 'pending' ? 'bg-amber-400' : 'bg-[var(--admin-danger)]'}`} />
                      <span className="text-[var(--admin-text-muted)]">
                        {o.status === 'paid' ? 'مكتمل' : o.status === 'pending' ? 'انتظار' : 'ملغي'}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--admin-text-muted)] text-sm">
                    لا توجد طلبات حديثة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
