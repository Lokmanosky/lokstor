'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Order } from '@/types';
import { Trash2, CheckCircle, Clock } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
      const list: Order[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Order));
      list.sort((a,b) => Number(b.createdAt) - Number(a.createdAt));
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if(!id) return;
    try {
      await updateDoc(doc(db, 'orders', id), { status: newStatus });
    } catch(e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if(!id) return;
    if(confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
      await deleteDoc(doc(db, 'orders', id));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)]">الطلبات</h1>
        <p className="text-sm text-[var(--admin-text-muted)] mt-1">إدارة جميع الطلبات المدفوعة والمعلقة</p>
      </div>

      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">وسيلة الدفع</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium">الإجراءات</th>
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
                    لا توجد طلبات
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                    <td className="px-4 py-3 text-[var(--admin-text)]">{o.productName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[var(--admin-text)]">{o.customerName || '—'}</span>
                        <span className="text-[var(--admin-text-muted)] text-xs">{o.customerEmail || '—'}</span>
                        {o.customerPhone && <span className="text-[var(--admin-text-muted)] text-xs">{o.customerPhone}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {o.paymentMethod === 'redotpay' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          🔴 RedotPay
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          💳 شارجيلي
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text)] font-medium">{Number(o.amount || o.productPrice || 0).toLocaleString()} د.ج</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${o.status === 'paid' ? 'bg-[var(--admin-primary)]' : o.status === 'pending' ? 'bg-amber-400' : 'bg-[var(--admin-danger)]'}`} />
                        <span className="text-[var(--admin-text-muted)]">
                          {o.status === 'paid' ? 'مكتمل' : o.status === 'pending' ? 'انتظار' : 'ملغي'}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {o.status !== 'paid' && (
                          <button onClick={() => handleUpdateStatus(o.id!, 'paid')} title="تأكيد الدفع" className="text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(o.id!)} title="حذف" className="text-[var(--admin-text-muted)] hover:text-[var(--admin-danger)] transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
