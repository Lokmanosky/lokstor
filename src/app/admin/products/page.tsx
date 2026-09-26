'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Search, 
  Filter, 
  ImageOff, 
  X, 
  Loader2, 
  Check, 
  Boxes,
  RotateCcw
} from 'lucide-react';
import Link from 'next/link';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, published, draft, archived
  const [selectedStock, setSelectedStock] = useState('ALL');   // ALL, in_stock, out_of_stock

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product));
      setProducts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Show transient feedback
  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Delete product
  const handleDelete = async (id: string, name?: string) => {
    if (!id) return;
    if (confirm(`هل أنت متأكد من حذف المنتج: "${name || 'هذا المنتج'}"؟`)) {
      try {
        await deleteDoc(doc(db, 'products', id));
        showNotification('تم حذف المنتج بنجاح');
      } catch (e: any) {
        console.error(e);
        showNotification('فشل الحذف، تحقق من الصلاحيات: ' + e?.message, 'error');
      }
    }
  };

  // Duplicate product (إنشاء نسخة من منتج)
  const handleDuplicate = async (p: Product) => {
    if (!p.id || duplicatingId) return;
    setDuplicatingId(p.id);

    try {
      const cleanImg = (p.imageUrl || p.image || '').replace(/^"+|"+$/g, '').trim();
      const stockLinksCopy = p.stockLinks && Array.isArray(p.stockLinks) ? [...p.stockLinks] : [];
      
      const copyPayload = {
        name: `${p.name || 'منتج'} (نسخة)`,
        description: p.description || '',
        price: Number(p.price) || 0,
        currency: p.currency || 'dzd',
        imageUrl: cleanImg,
        image: cleanImg,
        category: p.category || '',
        status: 'draft', // Save as draft so admin can tweak before publishing
        stock: stockLinksCopy.length,
        stockLinks: stockLinksCopy,
        fileUrl: p.fileUrl || '',
        fileType: p.fileType || '',
        features: p.features ? [...p.features] : [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await addDoc(collection(db, 'products'), copyPayload);
      showNotification(`تم إنشاء نسخة جديدة من "${p.name}" كمسودة بنجاح`);
    } catch (e: any) {
      console.error(e);
      showNotification('فشل إنشاء النسخة: ' + e?.message, 'error');
    } finally {
      setDuplicatingId(null);
    }
  };

  // Extract unique categories dynamically from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        set.add(p.category.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Clean image URL helper
  const getImageSrc = (p: Product) => {
    const raw = (p.imageUrl || p.image || '').replace(/^"+|"+$/g, '').trim();
    return raw || null;
  };

  // Filtered & searched products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = (p.name || '').toLowerCase().includes(query);
        const descMatch = (p.description || '').toLowerCase().includes(query);
        const catMatch = (p.category || '').toLowerCase().includes(query);
        if (!nameMatch && !descMatch && !catMatch) return false;
      }

      // 2. Category Filter
      if (selectedCategory !== 'ALL') {
        if ((p.category || '').trim() !== selectedCategory) return false;
      }

      // 3. Status Filter
      if (selectedStatus !== 'ALL') {
        const status = p.status || 'published';
        if (status !== selectedStatus) return false;
      }

      // 4. Stock Filter
      if (selectedStock !== 'ALL') {
        const count = p.stockLinks?.length ?? p.stock ?? 0;
        if (selectedStock === 'in_stock' && count <= 0) return false;
        if (selectedStock === 'out_of_stock' && count > 0) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus, selectedStock]);

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' || selectedStock !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSelectedStock('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">المنتجات</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">
            إدارة منتجات المتجر وتفاصيلها ({products.length} منتج مسجل)
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--admin-primary)] text-[var(--admin-bg)] rounded-md font-medium text-sm hover:opacity-90 transition-opacity w-full sm:w-auto shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج</span>
        </Link>
      </div>

      {/* Floating Notification */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-md text-sm font-medium border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ── Search & Filter Bar ────────────────────────────────────────────── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* 1. Search Bar */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[var(--admin-text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم، الوصف، أو التصنيف..."
              className="w-full pr-9 pl-8 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* 2. Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
            >
              <option value="ALL">جميع التصنيفات</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 3. Status Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>

          {/* 4. Stock Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedStock}
              onChange={e => setSelectedStock(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
            >
              <option value="ALL">كل المخزون</option>
              <option value="in_stock">متوفر</option>
              <option value="out_of_stock">نفذ من المخزون</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Button */}
        <div className="flex items-center justify-between text-xs text-[var(--admin-text-muted)] pt-2 border-t border-[var(--admin-border)]">
          <span>
            عرض <strong className="text-[var(--admin-text)]">{filteredProducts.length}</strong> من أصل {products.length} منتج
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-[var(--admin-primary)] hover:underline font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Products Table ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-md shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="px-4 py-3 font-medium">صورة</th>
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">التصنيف</th>
                <th className="px-4 py-3 font-medium">المخزون</th>
                <th className="px-4 py-3 font-medium">السعر</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">جاري التحميل...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--admin-text-muted)]">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-medium">لم يتم العثور على أي منتجات</p>
                    {hasActiveFilters && (
                      <button onClick={resetFilters} className="text-xs text-[var(--admin-primary)] hover:underline mt-2 inline-block">
                        مسح الفلاتر والبحث
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const imgSrc = getImageSrc(p);
                  const stockCount = p.stockLinks ? p.stockLinks.length : (p.stock || 0);
                  const isDuplicating = duplicatingId === p.id;
                  const status = p.status || 'published';

                  return (
                    <tr key={p.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                      {/* Image */}
                      <td className="px-4 py-3">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover border border-[var(--admin-border)] bg-[var(--admin-bg)]"
                            onError={(e) => { (e.target as HTMLImageElement).src = ''; (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] flex items-center justify-center">
                            <ImageOff className="w-5 h-5 text-[var(--admin-text-muted)]" />
                          </div>
                        )}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        <Link href={`/admin/products/${p.id}/edit`} className="text-[var(--admin-text)] font-medium hover:text-[var(--admin-primary)] transition-colors block">
                          {p.name || '—'}
                        </Link>
                        {p.fileType && (
                          <span className="text-[11px] text-[var(--admin-text-muted)]">{p.fileType}</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                        {p.category ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                            {p.category}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Stock Units Badge */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            stockCount > 0
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {stockCount > 0 ? `${stockCount} متوفر` : 'نفذ المخزون'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-[var(--admin-text)] font-semibold whitespace-nowrap">
                        {Number(p.price || 0).toLocaleString()} د.ج
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs ${
                            status === 'published'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : status === 'draft'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}
                        >
                          {status === 'published' ? 'منشور' : status === 'draft' ? 'مسودة' : 'مؤرشف'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {/* 1. Edit */}
                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-primary)] hover:bg-[var(--admin-bg)] transition-colors"
                            title="تعديل المنتج"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Link>

                          {/* 2. Duplicate (إنشاء نسخة من منتج) */}
                          <button
                            onClick={() => handleDuplicate(p)}
                            disabled={isDuplicating}
                            className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40"
                            title="إنشاء نسخة من هذا المنتج (Duplicate)"
                          >
                            {isDuplicating ? (
                              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* 3. Delete */}
                          <button
                            onClick={() => handleDelete(p.id!, p.name)}
                            title="حذف المنتج"
                            className="p-1.5 rounded text-[var(--admin-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
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
