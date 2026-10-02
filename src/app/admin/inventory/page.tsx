'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { 
  Boxes, 
  Search, 
  Plus, 
  Edit2, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  ImageOff,
  X,
  Loader2,
  Check
} from 'lucide-react';
import Link from 'next/link';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'in_stock' | 'low' | 'out_of_stock'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Quick Stock Add Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newStockUnitsText, setNewStockUnitsText] = useState('');
  const [savingStock, setSavingStock] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const list: Product[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Product));
      setProducts(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Helper to determine exact stock info across ALL categories
  const getProductStockInfo = (p: Product) => {
    const stockCount = typeof p.stock === 'number' ? p.stock : 0;
    const isPermanentLink = (p.stockType === 'numeric' || (!p.stockType && stockCount === 0 && Boolean(p.fileUrl))) && Boolean(p.unlimitedStock);

    if (isPermanentLink) {
      return {
        type: 'unlimited',
        count: Infinity,
        label: 'رابط دائم موحد',
        status: 'unlimited',
        statusLabel: 'غير محدود',
        badgeClass: 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      };
    }

    if (stockCount === 0) {
      return {
        type: 'stock',
        count: 0,
        label: '0 وحدة (فارغ)',
        status: 'out_of_stock',
        statusLabel: 'نفذ المخزون',
        badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20'
      };
    }

    if (stockCount < 5) {
      return {
        type: 'stock',
        count: stockCount,
        label: `${stockCount} ${stockCount === 1 ? 'وحدة' : stockCount === 2 ? 'وحدتان' : 'وحدات'}`,
        status: 'low',
        statusLabel: 'مخزون منخفض',
        badgeClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
      };
    }

    return {
      type: 'stock',
      count: stockCount,
      label: `${stockCount} وحدة متوفرة`,
      status: 'in_stock',
      statusLabel: 'متوفر',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    };
  };

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set);
  }, [products]);

  // Overall KPI Counters
  const kpis = useMemo(() => {
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    products.forEach(p => {
      const info = getProductStockInfo(p);
      if (info.status === 'out_of_stock') outOfStock++;
      else if (info.status === 'low') lowStock++;
      else inStock++;
    });

    return {
      total: products.length,
      inStock,
      lowStock,
      outOfStock
    };
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const info = getProductStockInfo(p);

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (info.status !== statusFilter) return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL') {
        if ((p.category || '').trim() !== categoryFilter) return false;
      }

      return true;
    });
  }, [products, searchQuery, statusFilter, categoryFilter]);

  // Quick Add Stock Units
  const handleQuickAddStock = async () => {
    if (!selectedProduct) return;
    const lines = newStockUnitsText.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 0) {
      showNotification('يرجى كتابة وحدة واحدة على الأقل لإضافتها', 'error');
      return;
    }

    setSavingStock(true);
    try {
      const prodRef = doc(db, 'products', selectedProduct.id);
      const unitsRef = doc(db, 'productUnits', selectedProduct.id);
      
      const unitsSnap = await getDoc(unitsRef);
      const existing = unitsSnap.exists() && Array.isArray(unitsSnap.data().stockLinks)
        ? unitsSnap.data().stockLinks
        : [];
      
      const updated = [...existing, ...lines];

      await setDoc(unitsRef, { stockLinks: updated, updatedAt: Date.now() }, { merge: true });
      await updateDoc(prodRef, {
        stock: updated.length,
        updatedAt: Date.now()
      });

      showNotification(`تمت إضافة ${lines.length} وحدة مخزون بنجاح إلى "${selectedProduct.name}"`);
      setSelectedProduct(null);
      setNewStockUnitsText('');
    } catch (e: any) {
      console.error(e);
      showNotification('فشل حفظ المخزون: ' + e?.message, 'error');
    } finally {
      setSavingStock(false);
    }
  };

  const getImageSrc = (p: Product) => {
    const raw = (p.imageUrl || p.image || '').replace(/^"+|"+$/g, '').trim();
    return raw || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--admin-text)]">المخزون والروابط</h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-1">
            إدارة مخزون الحسابات، الأكواد، والروابط الرقمية لجميع المنتجات
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-[var(--admin-primary)] text-[var(--admin-bg)] rounded-md font-medium text-xs hover:opacity-90 transition-opacity shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج جديد</span>
        </Link>
      </div>

      {/* Floating Notification */}
      {feedback && (
        <div
          className={`flex items-center gap-2 p-3 rounded-md text-xs font-semibold border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
        >
          {feedback.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" /> : <X className="w-4 h-4 flex-shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[var(--admin-text-muted)] block">إجمالي المنتجات</span>
            <span className="text-lg font-bold text-[var(--admin-text)]">{kpis.total}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] flex items-center justify-center text-[var(--admin-text)]">
            <Boxes className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[var(--admin-text-muted)] block">متوفر بالمخزون</span>
            <span className="text-lg font-bold text-emerald-500">{kpis.inStock}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-[var(--admin-text-muted)] block">مخزون منخفض (أقل من 5)</span>
            <span className="text-lg font-bold text-amber-500">{kpis.lowStock}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-[var(--admin-card)] border border-red-500/30 bg-red-500/5 rounded-lg p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-red-400 block font-medium">نفذ المخزون (فارغ)</span>
            <span className="text-lg font-bold text-red-500">{kpis.outOfStock}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
            <XCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="البحث باسم المنتج أو التصنيف..."
              className="w-full pl-8 pr-9 py-1.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="md:col-span-4 flex items-center gap-1 bg-[var(--admin-bg)] p-1 rounded-md border border-[var(--admin-border)] text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`flex-1 py-1 rounded text-center transition-colors font-medium cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-[var(--admin-card)] text-[var(--admin-text)] shadow-xs font-bold'
                  : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('out_of_stock')}
              className={`flex-1 py-1 rounded text-center transition-colors font-medium cursor-pointer ${
                statusFilter === 'out_of_stock'
                  ? 'bg-red-500/20 text-red-400 font-bold shadow-xs'
                  : 'text-[var(--admin-text-muted)] hover:text-red-400'
              }`}
            >
              نفذ
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('low')}
              className={`flex-1 py-1 rounded text-center transition-colors font-medium cursor-pointer ${
                statusFilter === 'low'
                  ? 'bg-amber-500/20 text-amber-400 font-bold shadow-xs'
                  : 'text-[var(--admin-text-muted)] hover:text-amber-400'
              }`}
            >
              منخفض
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in_stock')}
              className={`flex-1 py-1 rounded text-center transition-colors font-medium cursor-pointer ${
                statusFilter === 'in_stock'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold shadow-xs'
                  : 'text-[var(--admin-text-muted)] hover:text-emerald-400'
              }`}
            >
              متوفر
            </button>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-md text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors cursor-pointer"
            >
              <option value="ALL">جميع التصنيفات</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)] border-b border-[var(--admin-border)]">
              <tr>
                <th className="px-4 py-3 font-medium">المنتج</th>
                <th className="px-4 py-3 font-medium">التصنيف</th>
                <th className="px-4 py-3 font-medium">الرصيد المتبقي</th>
                <th className="px-4 py-3 font-medium">الحالة</th>
                <th className="px-4 py-3 font-medium text-left">إجراءات المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                    جاري تحميل بيانات المخزون...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[var(--admin-text-muted)]">
                    <Boxes className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-semibold text-xs text-[var(--admin-text)]">لم يتم العثور على منتجات مطابقة</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => {
                  const info = getProductStockInfo(p);
                  const imgSrc = getImageSrc(p);

                  return (
                    <tr key={p.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                      {/* Product Name & Image */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={p.name}
                              className="w-9 h-9 rounded object-cover border border-[var(--admin-border)] bg-[var(--admin-bg)] flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] flex items-center justify-center flex-shrink-0">
                              <ImageOff className="w-3.5 h-3.5 text-[var(--admin-text-muted)]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/admin/products/${p.id}/edit`}
                              className="font-semibold text-[var(--admin-text)] hover:text-[var(--admin-primary)] transition-colors block truncate max-w-xs"
                              title={p.name}
                            >
                              {p.name}
                            </Link>
                            <span className="text-[10px] text-[var(--admin-text-muted)] font-mono">
                              {Number(p.price || 0).toLocaleString()} د.ج
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-2.5 text-[var(--admin-text-muted)]">
                        {p.category ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                            {p.category}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Remaining Stock Units / Links */}
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold font-mono text-xs ${
                            info.status === 'out_of_stock'
                              ? 'text-red-400'
                              : info.status === 'low'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}>
                            {info.label}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${info.badgeClass}`}>
                          {info.status === 'out_of_stock' && <XCircle className="w-3 h-3" />}
                          {info.status === 'low' && <AlertTriangle className="w-3 h-3" />}
                          {info.status === 'in_stock' && <CheckCircle2 className="w-3 h-3" />}
                          {info.statusLabel}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-2.5 text-left">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(p);
                              setNewStockUnitsText('');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[var(--admin-primary)] text-[var(--admin-bg)] hover:opacity-90 transition-opacity font-medium text-[11px] shadow-xs cursor-pointer"
                            title="إضافة وحدات/أكواد/روابط إلى المخزون"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>تعبئة المخزون</span>
                          </button>

                          <Link
                            href={`/admin/products/${p.id}/edit`}
                            className="p-1 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] border border-[var(--admin-border)] transition-colors"
                            title="تعديل المنتج بالكامل"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Link>
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

      {/* Quick Add Stock Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in duration-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--admin-text)]">
                  تعبئة مخزون: {selectedProduct.name}
                </h3>
                <p className="text-[11px] text-[var(--admin-text-muted)] mt-0.5">
                  الرصيد الحالي: {selectedProduct.stock || 0} وحدة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[var(--admin-text)] block">
                أدخل الوحدات الجديدة (كل سطر = وحدة مستقلة تُسلَّم لعميل واحد):
              </label>
              <textarea
                rows={6}
                value={newStockUnitsText}
                onChange={e => setNewStockUnitsText(e.target.value)}
                placeholder={"Email: user1@gmail.com | Pass: 123456\nEmail: user2@gmail.com | Pass: abcdef\nكود تفعيل: XXXX-YYYY-ZZZZ"}
                className="w-full p-3 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-xs font-mono text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] resize-none"
              />
              <p className="text-[10px] text-[var(--admin-text-muted)]">
                سيتم إضافة كل سطر كعنصر مستقل في مصفوفة المخزون، وتسليمه تلقائياً للعميل عند الدفع.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--admin-border)]">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 rounded-md border border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleQuickAddStock}
                disabled={savingStock || !newStockUnitsText.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[var(--admin-primary)] text-[var(--admin-bg)] text-xs font-bold hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {savingStock ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{savingStock ? 'جاري الحفظ...' : 'إضافة إلى المخزون'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
