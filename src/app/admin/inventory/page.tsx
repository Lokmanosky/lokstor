'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Product } from '@/types';
import { Boxes } from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product));
      setProducts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)]">المخزون والروابط</h1>
        <p className="text-sm text-[var(--admin-text-muted)] mt-1">إدارة مخزون المنتجات الرقمية وروابط التحميل</p>
      </div>

      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">التصنيف</th>
                <th className="px-4 py-3 font-medium">الروابط المتاحة (المخزون)</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                    جاري التحميل...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                    لا توجد منتجات في المخزون
                  </td>
                </tr>
              ) : (
                products.map(p => {
                  const isDigitalStock = p.category === 'منتجات رقمية';
                  const stockCount = p.stockLinks?.length || 0;
                  const isLow = isDigitalStock && stockCount < 5;
                  const isEmpty = isDigitalStock && stockCount === 0;

                  return (
                    <tr key={p.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                      <td className="px-4 py-3 text-[var(--admin-text)] font-medium">
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4 text-[var(--admin-text-muted)]" />
                          {p.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">{p.category || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-text)]">
                        {isDigitalStock ? (
                          <span className={`font-semibold ${isEmpty ? 'text-[var(--admin-danger)]' : isLow ? 'text-amber-500' : 'text-[var(--admin-primary)]'}`}>
                            {stockCount} رابط
                          </span>
                        ) : (
                          <span className="text-[var(--admin-text-muted)]">رابط موحد</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isDigitalStock ? (
                          isEmpty ? (
                            <span className="text-xs px-2 py-1 bg-[var(--admin-danger)]/10 text-[var(--admin-danger)] border border-[var(--admin-danger)]/20 rounded-md">نفد المخزون</span>
                          ) : isLow ? (
                            <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md">مخزون منخفض</span>
                          ) : (
                            <span className="text-xs px-2 py-1 bg-[var(--admin-primary)]/10 text-[var(--admin-primary)] border border-[var(--admin-primary)]/20 rounded-md">متوفر</span>
                          )
                        ) : (
                          <span className="text-[var(--admin-text-muted)] text-xs">غير محدود</span>
                        )}
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
