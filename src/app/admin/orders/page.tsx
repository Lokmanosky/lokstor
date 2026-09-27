'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
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
  CreditCard, 
  Wallet,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'paid' | 'pending' | 'pending_manual_review' | 'failed'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'chargily' | 'redotpay' | 'binance'>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

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
    if(confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
      await deleteDoc(doc(db, 'orders', id));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--admin-text)]">الطلبات</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-0.5">إدارة جميع الطلبات والمدفوعات ومتابعة حالات الشراء</p>
        </div>

        {/* Total revenue badge */}
        <div className="flex items-center gap-2 bg-[var(--admin-card)] border border-[var(--admin-border)] px-4 py-2 rounded-xl shadow-sm">
          <span className="text-xs text-[var(--admin-text-muted)]">إجمالي المبيعات المدفوعة:</span>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            {filteredPaidSum.toLocaleString('en-US')} د.ج
          </span>
        </div>
      </div>

      {/* ── 1. QUICK STATUS FILTER ICONS / TABS ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All Orders */}
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'ALL'
              ? 'bg-[var(--admin-primary)] text-white border-[var(--admin-primary)] shadow-sm'
              : 'bg-[var(--admin-card)] text-[var(--admin-text)] border-[var(--admin-border)] hover:border-[var(--admin-primary)]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>كل الطلبات</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
            statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
          }`}>
            {stats.total}
          </span>
        </button>

        {/* Paid / Completed */}
        <button
          onClick={() => setStatusFilter('paid')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'paid'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
              : 'bg-[var(--admin-card)] text-emerald-600 dark:text-emerald-400 border-[var(--admin-border)] hover:border-emerald-500'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>مكتملة (مدفوعة)</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
            statusFilter === 'paid' ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
          }`}>
            {stats.paid}
          </span>
        </button>

        {/* Pending */}
        <button
          onClick={() => setStatusFilter('pending')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
              : 'bg-[var(--admin-card)] text-amber-600 dark:text-amber-400 border-[var(--admin-border)] hover:border-amber-500'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>في الانتظار</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
            statusFilter === 'pending' ? 'bg-white/20 text-white' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
          }`}>
            {stats.pending}
          </span>
        </button>

        {/* Manual Review (RedotPay / Binance) */}
        {stats.manualReview > 0 && (
          <button
            onClick={() => setStatusFilter('pending_manual_review')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              statusFilter === 'pending_manual_review'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-[var(--admin-card)] text-blue-600 dark:text-blue-400 border-[var(--admin-border)] hover:border-blue-500'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>بانتظار المراجعة</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
              statusFilter === 'pending_manual_review' ? 'bg-white/20 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
            }`}>
              {stats.manualReview}
            </span>
          </button>
        )}

        {/* Failed / Cancelled */}
        <button
          onClick={() => setStatusFilter('failed')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            statusFilter === 'failed'
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-[var(--admin-card)] text-rose-600 dark:text-rose-400 border-[var(--admin-border)] hover:border-rose-500'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>ملغية / فاشلة</span>
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-black ${
            statusFilter === 'failed' ? 'bg-white/20 text-white' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
          }`}>
            {stats.failed}
          </span>
        </button>
      </div>

      {/* ── 2. SEARCH & ADVANCED FILTERS BAR ─────────────────────────────────── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث باسم العميل، الإيميل، الهاتف، المنتج، أو المعرّف..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] p-1 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-3 relative">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none flex items-center">
              <Wallet className="w-4 h-4" />
            </div>
            <select
              value={paymentFilter}
              onChange={e => setPaymentFilter(e.target.value as any)}
              className="w-full pl-3 pr-9 py-2.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors cursor-pointer"
            >
              <option value="ALL">💳 جميع وسائل الدفع</option>
              <option value="chargily">🟢 شارجيلي (Chargily)</option>
              <option value="redotpay">🔴 ريدوت باي (RedotPay)</option>
              <option value="binance">🟡 بايننس (Binance)</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-3 relative">
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] pointer-events-none flex items-center">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full pl-3 pr-9 py-2.5 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-xl text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors cursor-pointer"
            >
              <option value="newest">الأحدث أولاً (التاريخ)</option>
              <option value="oldest">الأقدم أولاً (التاريخ)</option>
              <option value="highest">الأعلى سعراً ومبلغاً</option>
              <option value="lowest">الأقل سعراً ومبلغاً</option>
            </select>
          </div>
        </div>

        {/* Filter Summary & Reset Action */}
        <div className="flex items-center justify-between text-xs text-[var(--admin-text-muted)] pt-2 border-t border-[var(--admin-border)]">
          <div className="flex items-center gap-2">
            <span>
              عرض <strong className="text-[var(--admin-text)]">{filteredOrders.length}</strong> من أصل {orders.length} طلب
            </span>
            {hasActiveFilters && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                (تصفية نشطة)
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-[var(--admin-primary)] hover:underline font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة تعيين الفلاتر</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 3. ORDERS TABLE ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th className="px-4 py-3.5 font-bold">المنتج</th>
                <th className="px-4 py-3.5 font-bold">العميل</th>
                <th className="px-4 py-3.5 font-bold">وسيلة الدفع</th>
                <th className="px-4 py-3.5 font-bold">المبلغ</th>
                <th className="px-4 py-3.5 font-bold">الحالة</th>
                <th className="px-4 py-3.5 font-bold">التاريخ</th>
                <th className="px-4 py-3.5 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--admin-text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[var(--admin-primary)] border-t-transparent rounded-full animate-spin" />
                      <span>جاري تحميل بيانات الطلبات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[var(--admin-text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <SlidersHorizontal className="w-8 h-8 text-[var(--admin-text-muted)] opacity-50" />
                      <span className="font-bold text-sm">لا توجد طلبات تطابق الفلترة الحالية</span>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="mt-2 text-xs font-bold text-[var(--admin-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>إلغاء جميع الفلاتر</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id} className="hover:bg-[var(--admin-hover)] transition-colors">
                    {/* Product Name */}
                    <td className="px-4 py-3.5 text-[var(--admin-text)]">
                      <div className="font-bold text-sm line-clamp-2 max-w-xs" title={o.productName}>
                        {o.productName || '—'}
                      </div>
                      <div className="text-[11px] font-mono text-[var(--admin-text-muted)] mt-0.5">
                        {o.id}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-[var(--admin-text)] font-semibold">{o.customerName || '—'}</span>
                        <span className="text-[var(--admin-text-muted)] text-xs font-mono">{o.customerEmail || '—'}</span>
                        {o.customerPhone && (
                          <span className="text-[var(--admin-text-muted)] text-xs mt-0.5 font-mono">{o.customerPhone}</span>
                        )}
                      </div>
                    </td>

                    {/* Payment Method Badge */}
                    <td className="px-4 py-3.5">
                      {o.paymentMethod === 'binance' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          🟡 Binance
                        </span>
                      ) : o.paymentMethod === 'redotpay' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          🔴 RedotPay
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          💳 شارجيلي
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3.5 text-[var(--admin-text)] font-black text-sm whitespace-nowrap">
                      {Number(o.amount || o.productPrice || 0).toLocaleString('en-US')} د.ج
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold">
                        <span className={`w-2 h-2 rounded-full ${
                          o.status === 'paid' 
                            ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                            : o.status === 'pending_manual_review'
                            ? 'bg-blue-500 animate-pulse'
                            : o.status === 'pending' 
                            ? 'bg-amber-400' 
                            : 'bg-rose-500'
                        }`} />
                        <span className={`${
                          o.status === 'paid'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : o.status === 'pending_manual_review'
                            ? 'text-blue-700 dark:text-blue-400'
                            : o.status === 'pending'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {o.status === 'paid' 
                            ? 'مكتمل' 
                            : o.status === 'pending_manual_review'
                            ? 'مراجعة يدوية'
                            : o.status === 'pending' 
                            ? 'انتظار' 
                            : 'ملغي'}
                        </span>
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-xs text-[var(--admin-text-muted)] whitespace-nowrap font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 opacity-60" />
                        <span>{formatDate(o.createdAt)}</span>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        {/* Confirm Paid */}
                        {o.status !== 'paid' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id!, 'paid')}
                            title="تأكيد الدفع (مكتمل)"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Set to Pending */}
                        {o.status !== 'pending' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id!, 'pending')}
                            title="تعيين كمعلق (قيد الانتظار)"
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}

                        {/* Cancel */}
                        {o.status !== 'failed' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id!, 'failed')}
                            title="إلغاء الطلب"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {/* Delete Permanently */}
                        <button
                          onClick={() => handleDelete(o.id!)}
                          title="حذف الطلب نهائياً"
                          className="p-1.5 rounded-lg text-[var(--admin-text-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        >
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
