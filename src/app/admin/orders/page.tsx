'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { Order } from '@/types';
import { 
  Trash2, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Search, 
  X, 
  SlidersHorizontal, 
  ArrowUpDown, 
  RotateCcw, 
  Wallet,
  Calendar,
  AlertCircle,
  Gamepad2,
  Eye,
  EyeOff,
  Copy,
  Check,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'pending' | 'pending_manual_review' | 'failed'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'chargily' | 'redotpay' | 'binance'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Bulk Selection States
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

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



  // ── Complete & Fulfill Order (Deduct stock & assign deliverable) ───────────
  const fulfillOrderAndDeductStock = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return { success: false, message: 'Order not found' };
      const orderData = orderSnap.data();

      let downloadUrl = '';
      let pulledFromStock = false;
      let stockRemaining = 0;

      if (orderData.productId) {
        const prodRef = doc(db, 'products', orderData.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const prodData = prodSnap.data();

          // 1. Units Mode (take top link, slice array, decrement stock counter)
          if (prodData.stockLinks && Array.isArray(prodData.stockLinks) && prodData.stockLinks.length > 0) {
            downloadUrl = prodData.stockLinks[0];
            const newStockLinks = prodData.stockLinks.slice(1);
            stockRemaining = newStockLinks.length;
            await updateDoc(prodRef, {
              stockLinks: newStockLinks,
              stock: newStockLinks.length,
              updatedAt: Date.now(),
            });
            pulledFromStock = true;
          }
          // 2. Numeric / File Mode
          else {
            if (prodData.fileUrl) {
              downloadUrl = prodData.fileUrl;
            }
            if (prodData.stockType === 'numeric' && !prodData.unlimitedStock) {
              const currentStock = Number(prodData.stock || 1);
              const newStock = Math.max(0, currentStock - 1);
              stockRemaining = newStock;
              await updateDoc(prodRef, {
                stock: newStock,
                updatedAt: Date.now(),
              });
              pulledFromStock = true;
            }
          }
        }
      }

      // If no new stock unit was available, but order already had a downloadUrl, retain it
      if (!downloadUrl && orderData.downloadUrl) {
        downloadUrl = orderData.downloadUrl;
      }

      await updateDoc(orderRef, {
        status: 'paid',
        downloadUrl: downloadUrl || null,
        paidAt: Date.now(),
      });

      return {
        success: true,
        downloadUrl,
        pulledFromStock,
        stockRemaining,
      };
    } catch (err: any) {
      console.error('Error fulfilling order and updating stock:', err);
      await updateDoc(doc(db, 'orders', orderId), { status: 'paid', paidAt: Date.now() });
      return { success: false, error: err };
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if(!id) return;
    try {
      if (newStatus === 'paid') {
        const res = await fulfillOrderAndDeductStock(id);
        if (res && res.pulledFromStock) {
          setBulkFeedback(`تم تفعيل الطلب بنجاح وسحب رابط/حساب من المخزون فوراً وتوصيله للعميل (المتبقي في المخزون: ${res.stockRemaining})`);
        } else if (res && res.downloadUrl) {
          setBulkFeedback('تم تفعيل الطلب بنجاح كمدفوع مع الاحتفاظ برابط التسليم.');
        } else {
          setBulkFeedback('تم تفعيل الطلب كمدفوع (تنبيه: مخزون هذا المنتج فارغ حالياً، لم يتم سحب أي رابط).');
        }
      } else if (newStatus === 'pending') {
        // Clear downloadUrl so it can be re-pulled from stock when marked as paid again
        await updateDoc(doc(db, 'orders', id), { 
          status: 'pending',
          downloadUrl: null,
        });
        setBulkFeedback('تمت إعادة الطلب إلى قيد الانتظار بنجاح وتجهيزه لإعادة سحب رابط جديد من المخزون عند إكماله');
      } else {
        await updateDoc(doc(db, 'orders', id), { status: newStatus });
        setBulkFeedback(`تم تغيير حالة الطلب إلى ${newStatus === 'failed' ? 'ملغي' : newStatus}`);
      }
      setTimeout(() => setBulkFeedback(null), 5000);
    } catch(e: any) {
      console.error(e);
      alert('حدث خطأ أثناء تعديل حالة الطلب: ' + e?.message);
    }
  };

  const handleDelete = async (id: string) => {
    if(!id) return;
    if(confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
      await deleteDoc(doc(db, 'orders', id));
      setSelectedOrderIds(prev => prev.filter(item => item !== id));
    }
  };

  // ── Bulk Selection & Batch Actions Handlers ────────────────────────────────
  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleBulkUpdateStatus = async (newStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      if (newStatus === 'paid') {
        for (const id of selectedOrderIds) {
          await fulfillOrderAndDeductStock(id);
        }
      } else {
        const chunkSize = 450;
        for (let i = 0; i < selectedOrderIds.length; i += chunkSize) {
          const chunk = selectedOrderIds.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach(id => {
            const updatePayload: any = { status: newStatus };
            if (newStatus === 'pending') {
              updatePayload.downloadUrl = null;
            }
            batch.update(doc(db, 'orders', id), updatePayload);
          });
          await batch.commit();
        }
      }
      const label = newStatus === 'paid' ? 'تفعيلها واقتطاعها من المخزون كمكتملة' : newStatus === 'pending' ? 'تحويلها لقيد الانتظار' : 'إلغاؤها';
      setBulkFeedback(`تم بنجاح ${label} لـ (${selectedOrderIds.length}) طلب.`);
      setSelectedOrderIds([]);
      setTimeout(() => setBulkFeedback(null), 4500);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء تنفيذ الإجراء الجماعي: ' + err.message);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedOrderIds.length === 0) return;
    const count = selectedOrderIds.length;
    if (!confirm(`هل أنت متأكد من حذف (${count}) طلب نهائياً من قاعدة البيانات؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const chunkSize = 450;
      for (let i = 0; i < selectedOrderIds.length; i += chunkSize) {
        const chunk = selectedOrderIds.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'orders', id));
        });
        await batch.commit();
      }
      setBulkFeedback(`تم حذف (${count}) طلب نهائياً بنجاح.`);
      setSelectedOrderIds([]);
      setTimeout(() => setBulkFeedback(null), 4500);
    } catch (err: any) {
      console.error(err);
      alert('حدث خطأ أثناء حذف الطلبات: ' + err.message);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Stats counts
  const stats = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter(o => o.status === 'paid').length;
    const pending = orders.filter(o => o.status === 'pending').length;
    const manualReview = orders.filter(o => o.status === 'pending_manual_review').length;
    const failed = orders.filter(o => o.status === 'failed').length;
    const chargily = orders.filter(o => !o.paymentMethod || o.paymentMethod === 'chargily').length;
    const redotpay = orders.filter(o => o.paymentMethod === 'redotpay').length;
    const binance = orders.filter(o => o.paymentMethod === 'binance').length;

    return { total, paid, pending, manualReview, failed, chargily, redotpay, binance };
  }, [orders]);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // 1. Status Filter
    if (statusFilter !== 'ALL') {
      result = result.filter(o => o.status === statusFilter);
    }

    // 2. Payment Method Filter
    if (paymentFilter !== 'ALL') {
      result = result.filter(o => {
        if (paymentFilter === 'chargily') {
          return !o.paymentMethod || o.paymentMethod === 'chargily';
        }
        return o.paymentMethod === paymentFilter;
      });
    }

    // 3. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(o => {
        const idMatch = o.id?.toLowerCase().includes(q);
        const nameMatch = o.customerName?.toLowerCase().includes(q);
        const emailMatch = o.customerEmail?.toLowerCase().includes(q);
        const phoneMatch = o.customerPhone?.toLowerCase().includes(q);
        const prodMatch = o.productName?.toLowerCase().includes(q);
        return idMatch || nameMatch || emailMatch || phoneMatch || prodMatch;
      });
    }

    // 4. Sort Order
    result.sort((a, b) => {
      const dateA = Number(a.createdAt || 0);
      const dateB = Number(b.createdAt || 0);
      const priceA = Number(a.amount || a.productPrice || 0);
      const priceB = Number(b.amount || b.productPrice || 0);

      switch (sortBy) {
        case 'oldest':
          return dateA - dateB;
        case 'highest':
          return priceB - priceA;
        case 'lowest':
          return priceA - priceB;
        case 'newest':
        default:
          return dateB - dateA;
      }
    });

    return result;
  }, [orders, statusFilter, paymentFilter, searchQuery, sortBy]);

  const hasActiveFilters = statusFilter !== 'ALL' || paymentFilter !== 'ALL' || searchQuery.trim() !== '' || sortBy !== 'newest';

  const resetFilters = () => {
    setStatusFilter('ALL');
    setPaymentFilter('ALL');
    setSearchQuery('');
    setSortBy('newest');
  };

  // Filtered total paid amount
  const filteredPaidSum = useMemo(() => {
    return filteredOrders
      .filter(o => o.status === 'paid')
      .reduce((acc, curr) => acc + Number(curr.amount || curr.productPrice || 0), 0);
  }, [filteredOrders]);

  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return '—';
    try {
      const d = new Date(Number(timestamp));
      return d.toLocaleDateString('ar-DZ', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--admin-text)]">الطلبات</h1>
          <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">إدارة جميع الطلبات والمدفوعات ومتابعة حالات الشراء</p>
        </div>

        {/* Total revenue badge */}
        <div className="flex items-center gap-2 bg-[var(--admin-card)] border border-[var(--admin-border)] px-3 py-1.5 rounded-lg shadow-xs self-start sm:self-auto">
          <span className="text-[11px] text-[var(--admin-text-muted)]">إجمالي المبيعات المدفوعة:</span>
          <span className="text-xs font-bold text-[var(--admin-primary)]">
            {filteredPaidSum.toLocaleString('en-US')} د.ج
          </span>
        </div>
      </div>

      {/* ── 1. STATUS FILTER TABS (COMPACT) ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* All Orders */}
        <button
          type="button"
          onClick={() => setStatusFilter('ALL')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'ALL'
              ? 'bg-[var(--admin-primary)] text-white border-[var(--admin-primary)] shadow-xs'
              : 'bg-[var(--admin-card)] text-[var(--admin-text)] border-[var(--admin-border)] hover:border-[var(--admin-primary)]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>كل الطلبات</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
          }`}>
            {stats.total}
          </span>
        </button>

        {/* Paid / Completed */}
        <button
          type="button"
          onClick={() => setStatusFilter('paid')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'paid'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-[var(--admin-card)] text-emerald-600 dark:text-emerald-400 border-[var(--admin-border)] hover:border-emerald-500'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>مكتملة (مدفوعة)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            statusFilter === 'paid' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            {stats.paid}
          </span>
        </button>

        {/* Pending */}
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-[var(--admin-card)] text-amber-600 dark:text-amber-400 border-[var(--admin-border)] hover:border-amber-500'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>في الانتظار</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            {stats.pending}
          </span>
        </button>

        {/* Manual Review (RedotPay / Binance) */}
        {stats.manualReview > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('pending_manual_review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              statusFilter === 'pending_manual_review'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-[var(--admin-card)] text-blue-600 dark:text-blue-400 border-[var(--admin-border)] hover:border-blue-500'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>بانتظار المراجعة</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              statusFilter === 'pending_manual_review' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}>
              {stats.manualReview}
            </span>
          </button>
        )}

        {/* Failed / Cancelled */}
        <button
          type="button"
          onClick={() => setStatusFilter('failed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'failed'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-[var(--admin-card)] text-rose-600 dark:text-rose-400 border-[var(--admin-border)] hover:border-rose-500'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>ملغية / فاشلة</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            statusFilter === 'failed' ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          }`}>
            {stats.failed}
          </span>
        </button>
      </div>

      {/* ── 2. SEARCH & ADVANCED FILTERS BAR (COMPACT) ───────────────────────── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-3 space-y-2 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث باسم العميل، الإيميل، الهاتف، المنتج، أو المعرّف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-9 py-1.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] p-0.5 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-3 relative">
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none flex items-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value as any)}
              className="w-full pl-2.5 pr-8 py-1.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors cursor-pointer"
            >
              <option value="ALL">جميع وسائل الدفع</option>
              <option value="chargily">شارجيلي (Chargily)</option>
              <option value="redotpay">ريدوت باي (RedotPay)</option>
              <option value="binance">بايننس (Binance)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-3 relative">
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none flex items-center">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full pl-2.5 pr-8 py-1.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors cursor-pointer"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="highest">الأعلى سعراً</option>
              <option value="lowest">الأقل سعراً</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between text-[11px] text-[var(--admin-text-muted)] pt-1.5 border-t border-[var(--admin-border)]">
          <div className="flex items-center gap-2">
            <span>
              عرض <strong className="text-[var(--admin-text)] font-bold">{filteredOrders.length}</strong> من أصل {orders.length} طلب
            </span>
            {hasActiveFilters && (
              <span className="text-[var(--admin-primary)] font-bold">
                (تصفية نشطة)
              </span>
            )}
            <span className="text-[var(--admin-border)] opacity-60">|</span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer flex items-center gap-1"
            >
              {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                <span>إلغاء تحديد كل الطلبات</span>
              ) : (
                <span>تحديد كل الطلبات ({filteredOrders.length})</span>
              )}
            </button>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 text-[var(--admin-primary)] hover:underline font-bold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة تعيين</span>
            </button>
          )}
        </div>
      </div>

      {/* ── FEEDBACK NOTIFICATION ────────────────────────────────────────── */}
      {bulkFeedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{bulkFeedback}</span>
          </div>
          <button onClick={() => setBulkFeedback(null)} className="p-1 hover:bg-emerald-500/20 rounded cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── BULK ACTIONS TOOLBAR (شريط الإجراءات المجمعة) ──────────────────── */}
      {selectedOrderIds.length > 0 && (
        <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {selectedOrderIds.length}
            </span>
            <div className="text-xs font-bold text-[var(--admin-text)]">
              <span>تم تحديد </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{selectedOrderIds.length}</span>
              <span> من أصل {filteredOrders.length} طلب</span>
            </div>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-[11px] text-[var(--admin-text-muted)] hover:text-rose-500 underline mr-2 cursor-pointer font-medium"
            >
              إلغاء التحديد
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Mark as Paid / تفعيل */}
            <button
              type="button"
              disabled={isBulkProcessing}
              onClick={() => handleBulkUpdateStatus('paid')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
              title="تفعيل الطلبات المحددة وتحويل حالتها لمكتملة"
            >
              {isBulkProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>تفعيل كمكتمل ({selectedOrderIds.length})</span>
            </button>

            {/* Mark as Pending / تحويل لانتظار */}
            <button
              type="button"
              disabled={isBulkProcessing}
              onClick={() => handleBulkUpdateStatus('pending')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
              title="تحويل الطلبات المحددة لقيد الانتظار"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>تحويل للانتظار ({selectedOrderIds.length})</span>
            </button>

            {/* Mark as Failed / إلغاء */}
            <button
              type="button"
              disabled={isBulkProcessing}
              onClick={() => handleBulkUpdateStatus('failed')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
              title="إلغاء الطلبات المحددة"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>إلغاء ({selectedOrderIds.length})</span>
            </button>

            {/* Delete / حذف نهائي */}
            <button
              type="button"
              disabled={isBulkProcessing}
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
              title="حذف الطلبات المحددة نهائياً من قاعدة البيانات"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف نهائي ({selectedOrderIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. ORDERS TABLE (WITH SELECTION & NUMBERING) ─────────────────── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)] border-b border-[var(--admin-border)] select-none">
              <tr>
                {/* Select All Checkbox */}
                <th className="px-2.5 py-2.5 text-center w-[40px]">
                  <input
                    type="checkbox"
                    checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded border-[var(--admin-border)] text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    title={selectedOrderIds.length === filteredOrders.length ? "إلغاء تحديد الكل" : "تحديد كل الطلبات المعروضة"}
                  />
                </th>

                {/* Numbering (ترقيم) */}
                <th className="px-2 py-2.5 font-bold text-center w-[45px] text-[11px]">#</th>

                <th className="px-3 py-2.5 font-bold min-w-[220px]">المنتج</th>
                <th className="px-3 py-2.5 font-bold min-w-[140px]">العميل</th>
                <th className="px-3 py-2.5 font-bold min-w-[90px] text-center">وسيلة الدفع</th>
                <th className="px-3 py-2.5 font-bold min-w-[80px]">المبلغ</th>
                <th className="px-3 py-2.5 font-bold min-w-[80px]">الحالة</th>
                <th className="px-3 py-2.5 font-bold min-w-[110px]">التاريخ</th>
                <th className="px-2 py-2.5 font-bold text-center w-[90px]">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-[var(--admin-primary)] border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs">جاري تحميل بيانات الطلبات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-[var(--admin-text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal className="w-6 h-6 opacity-40 text-[var(--admin-text-muted)]" />
                      <span className="font-bold text-xs text-[var(--admin-text)]">لا توجد طلبات تطابق الفلترة الحالية</span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-1 text-xs font-bold text-[var(--admin-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>إلغاء جميع الفلاتر</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o, idx) => {
                  const isSelected = selectedOrderIds.includes(o.id);
                  return (
                  <tr 
                    key={o.id} 
                    className={`transition-colors ${
                      isSelected 
                        ? 'bg-indigo-500/10 hover:bg-indigo-500/15' 
                        : 'hover:bg-[var(--admin-hover)]'
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="px-2.5 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOrder(o.id)}
                        className="w-4 h-4 rounded border-[var(--admin-border)] text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        title="تحديد هذا الطلب"
                      />
                    </td>

                    {/* Numbering Index */}
                    <td className="px-2 py-2 text-center text-xs font-mono font-bold text-[var(--admin-text-muted)] select-none">
                      {idx + 1}
                    </td>

                    {/* Product Name - FULL VISIBILITY, NO TRUNCATION */}
                    <td className="px-3 py-2 text-[var(--admin-text)]">
                      <div className="font-bold text-xs sm:text-sm leading-snug break-words" title={o.productName}>
                        {o.productName || '—'}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--admin-text-muted)] mt-0.5 opacity-70">
                        {o.id}
                      </div>
                      {o.customFieldsData && Object.keys(o.customFieldsData).length > 0 && (
                        <button
                          type="button"
                          onClick={() => { setSelectedOrder(o); setShowPassword(false); }}
                          className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <Gamepad2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>بيانات الحساب للشحن 🎮</span>
                        </button>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="px-3 py-2">
                      <div className="flex flex-col max-w-[150px]">
                        <span className="text-[var(--admin-text)] font-semibold text-xs truncate" title={o.customerName}>{o.customerName || '—'}</span>
                        <span className="text-[var(--admin-text-muted)] text-[11px] font-mono truncate" title={o.customerEmail}>{o.customerEmail || '—'}</span>
                        {o.customerPhone && (
                          <span className="text-[var(--admin-text-muted)] text-[10px] font-mono">{o.customerPhone}</span>
                        )}
                      </div>
                    </td>

                    {/* Payment Method - CLEAN, NO BACKGROUND BOX AT ALL */}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {o.paymentMethod === 'binance' ? (
                        <span className="font-bold text-xs text-amber-500">
                          🟡 Binance
                        </span>
                      ) : o.paymentMethod === 'redotpay' ? (
                        <span className="font-bold text-xs text-rose-500">
                          🔴 RedotPay
                        </span>
                      ) : (
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          💳 شارجيلي
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-3 py-2 text-[var(--admin-text)] font-bold text-xs sm:text-sm whitespace-nowrap">
                      {Number(o.amount || o.productPrice || 0).toLocaleString('en-US')} <span className="text-[10px] font-normal">د.ج</span>
                    </td>

                    {/* Status Badge */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          o.status === 'paid' 
                            ? 'bg-[var(--admin-primary)]' 
                            : o.status === 'pending_manual_review'
                            ? 'bg-blue-500'
                            : o.status === 'pending' 
                            ? 'bg-amber-400' 
                            : 'bg-[var(--admin-danger)]'
                        }`} />
                        <span className="text-[var(--admin-text)] font-medium text-xs">
                          {o.status === 'paid' 
                            ? 'مكتمل' 
                            : o.status === 'pending_manual_review'
                            ? 'مراجعة'
                            : o.status === 'pending' 
                            ? 'انتظار' 
                            : 'ملغي'}
                        </span>
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-2 text-[11px] text-[var(--admin-text-muted)] whitespace-nowrap font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 opacity-60" />
                        <span>{formatDate(o.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => { setSelectedOrder(o); setShowPassword(false); }}
                          title="عرض التفاصيل وبيانات الحساب"
                          className="p-1 rounded text-[var(--admin-text-muted)] hover:text-indigo-500 hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Confirm Paid */}
                        {o.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(o.id!, 'paid')}
                            title="تأكيد الدفع (مكتمل)"
                            className="p-1 rounded text-[var(--admin-text-muted)] hover:text-emerald-500 hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Set to Pending */}
                        {o.status !== 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(o.id!, 'pending')}
                            title="تعيين كمعلق"
                            className="p-1 rounded text-[var(--admin-text-muted)] hover:text-amber-500 hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Cancel */}
                        {o.status !== 'failed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(o.id!, 'failed')}
                            title="إلغاء الطلب"
                            className="p-1 rounded text-[var(--admin-text-muted)] hover:text-rose-500 hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Permanently */}
                        <button
                          type="button"
                          onClick={() => handleDelete(o.id!)}
                          title="حذف الطلب نهائياً"
                          className="p-1 rounded text-[var(--admin-text-muted)] hover:text-[var(--admin-danger)] hover:bg-[var(--admin-hover)] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* ORDER DETAILS & GAME ACCOUNT MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-right animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] pb-3">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-[var(--admin-text)]">طلب #{selectedOrder.id?.slice(0, 8)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  selectedOrder.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {selectedOrder.status === 'paid' ? 'مدفوع' : 'معلق'}
                </span>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-1 rounded-md text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Product & Customer info */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--admin-bg)] p-3 rounded-xl border border-[var(--admin-border)]">
              <div>
                <span className="text-[var(--admin-text-muted)] block text-[11px]">المنتج:</span>
                <span className="font-bold text-[var(--admin-text)] line-clamp-1">{selectedOrder.productName}</span>
              </div>
              <div>
                <span className="text-[var(--admin-text-muted)] block text-[11px]">المبلغ:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">{Number(selectedOrder.productPrice || selectedOrder.amount || 0).toLocaleString()} د.ج</span>
              </div>
              <div>
                <span className="text-[var(--admin-text-muted)] block text-[11px]">العميل:</span>
                <span className="font-bold text-[var(--admin-text)]">{selectedOrder.customerName}</span>
              </div>
              <div>
                <span className="text-[var(--admin-text-muted)] block text-[11px]">الإيميل:</span>
                <span className="font-mono text-[var(--admin-text)] text-[11px] truncate block">{selectedOrder.customerEmail}</span>
              </div>
            </div>

            {/* GAME ACCOUNT DETAILS */}
            {selectedOrder.customFieldsData && Object.keys(selectedOrder.customFieldsData).length > 0 ? (
              <div className="p-4 rounded-xl bg-indigo-500/10 border-2 border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Gamepad2 className="w-4 h-4" />
                    <span>بيانات حساب اللعبة لشحن الطلب:</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {Object.entries(selectedOrder.customFieldsData).map(([key, val]) => {
                    const isSecret = key.toLowerCase().includes('pass') || key.includes('كلمة');
                    const displayVal = (isSecret && !showPassword) ? '••••••••••••' : val;
                    const friendlyLabel = 
                      key === 'game_email' ? 'البريد الإلكتروني للعبة (Call Of Duty / Activision)' :
                      key === 'game_password' ? 'كلمة المرور (Password)' :
                      key === 'player_id' ? 'معرف اللاعب (Player ID)' : key;

                    return (
                      <div key={key} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--admin-card)] border border-indigo-500/20 text-xs">
                        <span className="font-bold text-[var(--admin-text-muted)]">{friendlyLabel}:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--admin-text)] select-all">{displayVal}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(val);
                              setCopiedKey(key);
                              setTimeout(() => setCopiedKey(null), 2000);
                            }}
                            className="px-2 py-1 rounded bg-[var(--admin-hover)] text-[11px] font-bold text-[var(--admin-text)] hover:text-indigo-500 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            {copiedKey === key ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedKey === key ? 'تم' : 'نسخ'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Copy All Button */}
                <button
                  type="button"
                  onClick={() => {
                    const allText = Object.entries(selectedOrder.customFieldsData || {})
                      .map(([k, v]) => {
                        const l = k === 'game_email' ? 'الإيميل' : k === 'game_password' ? 'كلمة المرور' : k;
                        return `${l}: ${v}`;
                      }).join('\n');
                    navigator.clipboard.writeText(allText);
                    setCopiedKey('all');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'all' ? 'تم نسخ جميع بيانات الحساب!' : 'نسخ جميع بيانات الحساب دفعة واحدة 📋'}</span>
                </button>
              </div>
            ) : Boolean(
              selectedOrder.productName && (
                selectedOrder.productName.toLowerCase().includes('cod') ||
                selectedOrder.productName.toLowerCase().includes('call of duty') ||
                selectedOrder.productName.includes('شحن') ||
                selectedOrder.productName.includes('نقاط') ||
                selectedOrder.productName.includes('شدات')
              )
            ) ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 space-y-1.5 text-xs text-right">
                <div className="font-black flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>طلب قديم (تم قبل تفعيل الحفظ التلقائي):</span>
                </div>
                <p className="text-[11px] text-[var(--admin-text-muted)] leading-relaxed">
                  هذا الطلب تم إنشاؤه مسبقاً قبل التحديث الأخير، لذلك لم تكن بيانات حسابه محفوظة بقاعدة البيانات. في كافة الطلبات الجديدة، تظهر هنا بيانات الإيميل وكلمة المرور مباشرة مع زر النسخ الفوري.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedOrder.downloadUrl ? (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 space-y-2 text-xs text-right">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>رابط / حساب التسليم المسلم للعميل (من المخزون):</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrder.downloadUrl || '');
                          setCopiedKey('downloadUrl');
                          setTimeout(() => setCopiedKey(null), 2000);
                        }}
                        className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer hover:bg-emerald-500 transition-colors"
                      >
                        {copiedKey === 'downloadUrl' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'downloadUrl' ? 'تم النسخ' : 'نسخ الرابط'}</span>
                      </button>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--admin-bg)] border border-emerald-500/20 font-mono text-[11px] text-[var(--admin-text)] break-all select-all max-h-24 overflow-y-auto">
                      {selectedOrder.downloadUrl}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)] text-xs text-center text-[var(--admin-text-muted)]">
                    لا توجد بيانات حساب أو روابط إضافية مسلمة لهذا الطلب بعد.
                  </div>
                )}
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-[var(--admin-border)]">
              {selectedOrder.status !== 'paid' && (
                <button
                  type="button"
                  onClick={() => { handleUpdateStatus(selectedOrder.id!, 'paid'); setSelectedOrder(null); }}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>تأكيد كمدفوع (تم شحن الحساب)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg border border-[var(--admin-border)] text-xs font-bold text-[var(--admin-text)] hover:bg-[var(--admin-hover)] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
