'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Product } from '@/types';
import { Plus, Edit2, Trash2, ImageOff } from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
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

  const handleDelete = async (id: string) => {
    if (!id) return;
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (e) {
        console.error(e);
        alert('فشل الحذف، تحقق من صلاحيات Firestore');
      }
    }
  };

  const getImageSrc = (p: Product) => {
    const raw = (p.imageUrl || p.image || '').replace(/^"+|"+$/g, '').trim();
    return raw || null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">المنتجات</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">إدارة منتجات المتجر وتفاصيلها</p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--admin-primary)] text-[var(--admin-bg)] rounded-md font-medium text-sm hover:opacity-90 transition-opacity w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج</span>
        </Link>
      </div>

      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="px-4 py-3 font-medium">صورة</th>
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">التصنيف</th>
                <th className="px-4 py-3 font-medium">السعر</th>
                <th className="px-4 py-3 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">جاري التحميل...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">لا توجد منتجات حالياً</td></tr>
              ) : (
                products.map(p => {
                  const imgSrc = getImageSrc(p);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                      <td className="px-4 py-3">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover border border-[var(--admin-border)]"
                            onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] flex items-center justify-center">
                            <ImageOff className="w-5 h-5 text-[var(--admin-text-muted)]" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-text)] font-medium">{p.name || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">{p.category || '—'}</td>
                      <td className="px-4 py-3 text-[var(--admin-text)] font-medium">{Number(p.price || 0).toLocaleString()} د.ج</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] transition-colors"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id!)}
                            title="حذف"
                            className="text-[var(--admin-text-muted)] hover:text-[var(--admin-danger)] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
