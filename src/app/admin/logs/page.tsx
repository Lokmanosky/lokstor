'use client';

import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, onSnapshot, query, orderBy, limit, deleteDoc, doc, writeBatch, getDocs, where 
} from 'firebase/firestore';
import { AdminLog, AdminActionCategory, AdminActionType } from '@/types';
import {
  History,
  Search,
  Filter,
  Trash2,
  Download,
  Calendar,
  User,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Edit,
  DollarSign,
  ImageIcon,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Package,
  ShoppingCart,
  Boxes,
  FolderOpen,
  Tag,
  Megaphone,
  Star,
  Settings,
  Clock,
  Eye,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Send,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('all');
  
  // Selected log for detailed view modal
  const [selectedLog, setSelectedLog] = useState<AdminLog | null>(null);

  // Clear / Prune Modal
  const [isPruneModalOpen, setIsPruneModalOpen] = useState(false);
  const [pruneMode, setPruneMode] = useState<'30days' | 'all'>('30days');
  const [isPruning, setIsPruning] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    // Listen to adminLogs realtime with order by createdAt desc
    const q = query(collection(db, 'adminLogs'), orderBy('createdAt', 'desc'), limit(1000));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: AdminLog[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as AdminLog);
        });
        setLogs(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching admin logs:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // ── Helper formatters ────────────────────────────────────────────────────────
  const formatTimeAgo = (ts: number): string => {
    const diff = Date.now() - Number(ts);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    const d = Math.floor(h / 24);
    if (d < 30) return `منذ ${d} يوم`;
    return new Date(ts).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' });
  };

  const formatFullDate = (ts: number): string => {
    return new Date(ts).toLocaleString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // ── Category Icon & Label mapping ──────────────────────────────────────────
  const getCategoryDetails = (cat: AdminActionCategory) => {
    switch (cat) {
      case 'products':
        return { label: 'المنتجات', icon: Package, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
      case 'orders':
        return { label: 'الطلبات', icon: ShoppingCart, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'inventory':
        return { label: 'المخزون', icon: Boxes, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
      case 'categories':
        return { label: 'الأقسام', icon: FolderOpen, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' };
      case 'discounts':
        return { label: 'أكواد الخصم', icon: Tag, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'ticker':
        return { label: 'الشريط الإعلاني', icon: Megaphone, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
      case 'reviews':
        return { label: 'التقييمات', icon: Star, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
      case 'settings':
        return { label: 'الإعدادات', icon: Settings, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
      default:
        return { label: 'عام', icon: History, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  // ── Action Type details mapping ─────────────────────────────────────────────
  const getActionTypeDetails = (type: AdminActionType) => {
    switch (type) {
      case 'create':
        return { label: 'إضافة', icon: PlusCircle, badgeClass: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30' };
      case 'price_change':
        return { label: 'تغيير سعر', icon: DollarSign, badgeClass: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30 font-bold' };
      case 'image_change':
        return { label: 'تعديل صور', icon: ImageIcon, badgeClass: 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/30' };
      case 'reorder':
        return { label: 'إعادة ترتيب', icon: ArrowUpDown, badgeClass: 'bg-purple-500/15 text-purple-500 dark:text-purple-400 border-purple-500/30' };
      case 'delete':
        return { label: 'حذف نهائي', icon: Trash2, badgeClass: 'bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30 font-bold' };
      case 'order_cancel':
        return { label: 'إلغاء طلب', icon: XCircle, badgeClass: 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30 font-bold' };
      case 'order_fulfill':
        return { label: 'تسليم طلب', icon: Send, badgeClass: 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30' };
      case 'status_change':
        return { label: 'تغيير حالة', icon: CheckCircle2, badgeClass: 'bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 border-indigo-500/30' };
      case 'stock_update':
        return { label: 'تحديث مخزون', icon: Boxes, badgeClass: 'bg-blue-500/15 text-blue-500 dark:text-blue-400 border-blue-500/30' };
      case 'reminder':
        return { label: 'تذكير بالدفع', icon: Send, badgeClass: 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30' };
      case 'bulk_action':
        return { label: 'إجراء جماعي', icon: Layers, badgeClass: 'bg-violet-500/15 text-violet-500 dark:text-violet-400 border-violet-500/30' };
      case 'update':
      default:
        return { label: 'تعديل', icon: Edit, badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30' };
    }
  };

  // ── Filters & Stats Calculation ─────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = logs.length;
    const productsCount = logs.filter(l => l.category === 'products').length;
    const ordersCount = logs.filter(l => l.category === 'orders').length;
    const priceChangesCount = logs.filter(l => l.actionType === 'price_change' || l.metadata?.priceChanged).length;
    const deletionsCount = logs.filter(l => l.actionType === 'delete' || l.actionType === 'order_cancel').length;

    return { total, productsCount, ordersCount, priceChangesCount, deletionsCount };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (log.title || '').toLowerCase().includes(q);
        const descMatch = (log.description || '').toLowerCase().includes(q);
        const targetMatch = (log.targetName || '').toLowerCase().includes(q);
        const emailMatch = (log.adminEmail || '').toLowerCase().includes(q);
        const idMatch = (log.targetId || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !targetMatch && !emailMatch && !idMatch) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'ALL' && log.category !== selectedCategory) {
        return false;
      }

      // 3. Action type filter
      if (selectedActionType !== 'ALL' && log.actionType !== selectedActionType) {
        return false;
      }

      // 4. Time range filter
      if (timeRange !== 'all') {
        const now = Date.now();
        const logTime = Number(log.createdAt);
        if (timeRange === 'today') {
          const startOfDay = new Date().setHours(0, 0, 0, 0);
          if (logTime < startOfDay) return false;
        } else if (timeRange === '7days') {
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          if (logTime < sevenDaysAgo) return false;
        } else if (timeRange === '30days') {
          const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
          if (logTime < thirtyDaysAgo) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, selectedCategory, selectedActionType, timeRange]);

  // Paginated logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredLogs.slice(startIndex, startIndex + pageSize);
  }, [filteredLogs, currentPage]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;

  // ── Export Logs ─────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['التاريخ', 'التصنيف', 'نوع العملية', 'العنوان', 'التفاصيل', 'اسم العنصر', 'معرف العنصر', 'إيميل الأدمن'];
    const rows = filteredLogs.map(l => [
      `"${formatFullDate(l.createdAt)}"`,
      `"${getCategoryDetails(l.category).label}"`,
      `"${getActionTypeDetails(l.actionType).label}"`,
      `"${(l.title || '').replace(/"/g, '""')}"`,
      `"${(l.description || '').replace(/"/g, '""')}"`,
      `"${(l.targetName || '').replace(/"/g, '""')}"`,
      `"${(l.targetId || '').replace(/"/g, '""')}"`,
      `"${l.adminEmail || ''}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lokstor-admin-activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('تم تصدير السجل بصيغة CSV بنجاح');
  };

  const exportToJSON = () => {
    if (filteredLogs.length === 0) return;
    const jsonStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lokstor-admin-activity-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('تم تصدير السجل بصيغة JSON بنجاح');
  };

  // ── Prune old logs handler ──────────────────────────────────────────────────
  const handlePruneLogs = async () => {
    setIsPruning(true);
    try {
      const batch = writeBatch(db);
      let targetLogs: AdminLog[] = [];

      if (pruneMode === '30days') {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        targetLogs = logs.filter(l => Number(l.createdAt) < thirtyDaysAgo);
      } else {
        targetLogs = [...logs];
      }

      if (targetLogs.length === 0) {
        showNotification('لا توجد سجلات تطابق خيار التنظيف المحدد', 'error');
        setIsPruning(false);
        setIsPruneModalOpen(false);
        return;
      }

      // Firestore limits batches to 500 operations
      const chunkSize = 450;
      for (let i = 0; i < targetLogs.length; i += chunkSize) {
        const chunk = targetLogs.slice(i, i + chunkSize);
        const b = writeBatch(db);
        chunk.forEach(logItem => {
          if (logItem.id) b.delete(doc(db, 'adminLogs', logItem.id));
        });
        await b.commit();
      }

      showNotification(`تم تنظيف وحذف (${targetLogs.length}) سجل بنجاح.`);
      setIsPruneModalOpen(false);
    } catch (err: any) {
      console.error('Error pruning logs:', err);
      showNotification('فشل تنظيف السجلات: ' + err?.message, 'error');
    } finally {
      setIsPruning(false);
    }
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[var(--admin-text)]">سجل حركات ونشاطات الأدمن</h1>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-500 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  مباشر
                </span>
              </div>
              <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                سجل رقابي شامل لجميع عمليات الإضافة، الحذف، تعديل الأسعار، تغيير الصور، والترتيب
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] text-xs font-bold text-[var(--admin-text)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="تصدير السجل كملف Excel / CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={exportToJSON}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] text-xs font-bold text-[var(--admin-text)] transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="تصدير السجل كملف JSON للمطورين"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>تصدير JSON</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPruneModalOpen(true)}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold text-red-400 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="تنظيف السجلات القديمة"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>تنظيف السجل</span>
          </button>
        </div>
      </div>

      {/* ── Feedback Notification ── */}
      {feedbackMsg && (
        <div className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Stats Overview Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] text-[var(--admin-text-muted)] font-medium">إجمالي الحركات</span>
          <div className="text-xl font-bold font-mono text-[var(--admin-text)]">{stats.total}</div>
          <div className="text-[10px] text-[var(--admin-text-muted)] flex items-center gap-1">
            <History className="w-3 h-3 text-indigo-400" />
            <span>كل العمليات المسجلة</span>
          </div>
        </div>

        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] text-[var(--admin-text-muted)] font-medium">حركات المنتجات</span>
          <div className="text-xl font-bold font-mono text-indigo-400">{stats.productsCount}</div>
          <div className="text-[10px] text-[var(--admin-text-muted)] flex items-center gap-1">
            <Package className="w-3 h-3 text-indigo-400" />
            <span>إضافة، تعديل وترتيب</span>
          </div>
        </div>

        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] text-[var(--admin-text-muted)] font-medium">تغيير الأسعار 💰</span>
          <div className="text-xl font-bold font-mono text-amber-400">{stats.priceChangesCount}</div>
          <div className="text-[10px] text-[var(--admin-text-muted)] flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-amber-400" />
            <span>تعديلات أسعار بيع</span>
          </div>
        </div>

        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-3.5 space-y-1 shadow-xs">
          <span className="text-[11px] text-[var(--admin-text-muted)] font-medium">عمليات الحذف والإلغاء 🗑️</span>
          <div className="text-xl font-bold font-mono text-red-400">{stats.deletionsCount}</div>
          <div className="text-[10px] text-[var(--admin-text-muted)] flex items-center gap-1">
            <Trash2 className="w-3 h-3 text-red-400" />
            <span>حذف منتجات وإلغاء طلبات</span>
          </div>
        </div>
      </div>

      {/* ── Filters Section ── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-4 space-y-3.5 shadow-xs">
        {/* Search Bar & Time Range */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="ابحث بالعنوان، اسم المنتج، المعرف، تفاصيل التعديل أو إيميل الأدمن..."
              className="w-full pr-9 pl-4 py-2 bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg text-xs text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Time range tabs */}
          <div className="flex items-center gap-1 bg-[var(--admin-bg)] border border-[var(--admin-border)] p-1 rounded-lg self-stretch sm:self-auto overflow-x-auto hide-scrollbar">
            {[
              { id: 'all', label: 'الكل' },
              { id: 'today', label: 'اليوم' },
              { id: '7days', label: 'آخر 7 أيام' },
              { id: '30days', label: 'آخر شهر' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setTimeRange(tab.id as any); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer ${
                  timeRange === tab.id
                    ? 'bg-[var(--admin-primary)] text-white shadow-2xs'
                    : 'text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="space-y-1.5 pt-1 border-t border-[var(--admin-border)]/60">
          <div className="text-[11px] font-semibold text-[var(--admin-text-muted)]">تصفية حسب القسم:</div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {[
              { id: 'ALL', label: 'كافة الأقسام', icon: Layers },
              { id: 'products', label: '📦 المنتجات', icon: Package },
              { id: 'orders', label: '🛒 الطلبات', icon: ShoppingCart },
              { id: 'inventory', label: '📊 المخزون', icon: Boxes },
              { id: 'categories', label: '📂 أقسام المتجر', icon: FolderOpen },
              { id: 'discounts', label: '🏷️ أكواد الخصم', icon: Tag },
              { id: 'ticker', label: '📢 الشريط الإعلاني', icon: Megaphone },
              { id: 'reviews', label: '⭐ التقييمات', icon: Star },
              { id: 'settings', label: '⚙️ الإعدادات', icon: Settings },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer border transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text)] hover:border-indigo-500/50'
                }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Type Filter Pills */}
        <div className="space-y-1.5 pt-1 border-t border-[var(--admin-border)]/60">
          <div className="text-[11px] font-semibold text-[var(--admin-text-muted)]">تصفية حسب نوع العملية:</div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {[
              { id: 'ALL', label: 'كافة العمليات' },
              { id: 'create', label: '➕ إضافة' },
              { id: 'price_change', label: '💰 تغيير سعر' },
              { id: 'image_change', label: '🖼️ تعديل صور' },
              { id: 'reorder', label: '🔀 إعادة ترتيب' },
              { id: 'status_change', label: '⚡ تغيير حالة' },
              { id: 'order_cancel', label: '❌ إلغاء طلب' },
              { id: 'order_fulfill', label: '🚀 تسليم طلب' },
              { id: 'stock_update', label: '📦 تحديث مخزون' },
              { id: 'reminder', label: '🔔 تذكير بالدفع' },
              { id: 'delete', label: '🗑️ حذف نهائي' },
              { id: 'bulk_action', label: '⚡ إجراء جماعي' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => { setSelectedActionType(type.id); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer border transition-all ${
                  selectedActionType === type.id
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-[var(--admin-bg)] border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Activity Feed Table ── */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg)]">
          <div className="text-xs font-bold text-[var(--admin-text)]">
            سجل العمليات ({filteredLogs.length})
          </div>
          <div className="text-[11px] text-[var(--admin-text-muted)]">
            صفحة {currentPage} من {totalPages}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--admin-primary)] mx-auto" />
            <p className="text-xs text-[var(--admin-text-muted)]">جاري تحميل سجل النشاطات...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-2 text-[var(--admin-text-muted)]">
            <History className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-bold text-[var(--admin-text)]">لا توجد عمليات مسجلة</p>
            <p className="text-xs">لم يتم تسجيل أي نشاط يطابق الفلاتر المحددة حالياً.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--admin-border)]">
            {paginatedLogs.map((log) => {
              const catInfo = getCategoryDetails(log.category);
              const actionInfo = getActionTypeDetails(log.actionType);
              const CatIcon = catInfo.icon;
              const ActionIcon = actionInfo.icon;

              return (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="p-3 sm:p-4 hover:bg-[var(--admin-hover)] transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Action Icon Badge */}
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${catInfo.color}`}>
                      <CatIcon className="w-4 h-4" />
                    </div>

                    {/* Details content */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Action Type Badge */}
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${actionInfo.badgeClass}`}>
                          <ActionIcon className="w-3 h-3" />
                          <span>{actionInfo.label}</span>
                        </span>

                        {/* Title */}
                        <span className="font-bold text-xs sm:text-sm text-[var(--admin-text)] group-hover:text-[var(--admin-primary)] transition-colors">
                          {log.title}
                        </span>

                        {/* Target Name */}
                        {log.targetName && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] truncate max-w-[200px]">
                            {log.targetName}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--admin-text-muted)] line-clamp-2 leading-relaxed">
                        {log.description}
                      </p>

                      {/* Admin info & Timestamp */}
                      <div className="flex items-center gap-3 text-[11px] text-[var(--admin-text-muted)] pt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <User className="w-3 h-3 text-indigo-400" />
                          <span>{log.adminEmail || 'مدير'}</span>
                        </span>

                        <span>•</span>

                        <span className="flex items-center gap-1 text-[11px]" title={formatFullDate(log.createdAt)}>
                          <Clock className="w-3 h-3 text-amber-500/80" />
                          <span>{formatTimeAgo(log.createdAt)}</span>
                        </span>

                        {log.targetId && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[10px] opacity-70">
                              ID: {log.targetId.slice(0, 10)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side inspect button */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--admin-border)] group-hover:border-[var(--admin-primary)] group-hover:bg-[var(--admin-primary)] group-hover:text-white text-xs font-bold text-[var(--admin-text-muted)] transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>تفاصيل</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg)]">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            <span className="text-xs text-[var(--admin-text-muted)] font-mono font-bold">
              {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card)] text-xs font-bold disabled:opacity-40 cursor-pointer"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Log Details Modal ── */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--admin-border)] flex items-center justify-between bg-[var(--admin-bg)]">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryDetails(selectedLog.category).color}`}>
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--admin-text)]">تفاصيل حركة الأدمن</h3>
                  <p className="text-[10px] text-[var(--admin-text-muted)] font-mono">{formatFullDate(selectedLog.createdAt)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Title & description */}
              <div className="space-y-1 p-3.5 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)]">
                <div className="font-bold text-sm text-[var(--admin-text)]">{selectedLog.title}</div>
                <div className="text-[var(--admin-text-muted)] leading-relaxed">{selectedLog.description}</div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] space-y-1">
                  <span className="text-[10px] text-[var(--admin-text-muted)]">القسم</span>
                  <div className="font-bold text-[var(--admin-text)]">{getCategoryDetails(selectedLog.category).label}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] space-y-1">
                  <span className="text-[10px] text-[var(--admin-text-muted)]">نوع العملية</span>
                  <div className="font-bold text-[var(--admin-text)]">{getActionTypeDetails(selectedLog.actionType).label}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] space-y-1">
                  <span className="text-[10px] text-[var(--admin-text-muted)]">المدير المنفذ</span>
                  <div className="font-bold text-[var(--admin-text)] truncate">{selectedLog.adminEmail}</div>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] space-y-1">
                  <span className="text-[10px] text-[var(--admin-text-muted)]">الوقت الدقيق</span>
                  <div className="font-mono text-[var(--admin-text)]">{formatTimeAgo(selectedLog.createdAt)}</div>
                </div>
              </div>

              {/* Target item info */}
              {(selectedLog.targetName || selectedLog.targetId) && (
                <div className="p-3 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] space-y-1">
                  <span className="text-[10px] text-[var(--admin-text-muted)] font-bold">العنصر المتأثر (Target):</span>
                  <div className="font-bold text-sm text-[var(--admin-text)]">{selectedLog.targetName || '—'}</div>
                  {selectedLog.targetId && (
                    <div className="font-mono text-[10px] text-[var(--admin-text-muted)] break-all select-all">
                      ID: {selectedLog.targetId}
                    </div>
                  )}
                </div>
              )}

              {/* Comparison Diff Box (Before vs After) */}
              {selectedLog.diff && (selectedLog.diff.before || selectedLog.diff.after) && (
                <div className="space-y-2">
                  <div className="font-bold text-[11px] text-[var(--admin-text)]">مقارنة التغييرات (Diff):</div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 space-y-1">
                      <div className="font-bold text-[10px] text-red-400">قبل التعديل (Previous):</div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selectedLog.diff.before, null, 2)}</pre>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-1">
                      <div className="font-bold text-[10px] text-emerald-400">بعد التعديل (Updated):</div>
                      <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selectedLog.diff.after, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Metadata Details */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-bold text-[11px] text-[var(--admin-text)]">بيانات إضافية (Metadata):</div>
                  <pre className="p-3 rounded-lg bg-[var(--admin-bg)] border border-[var(--admin-border)] font-mono text-[11px] text-[var(--admin-text-muted)] overflow-x-auto whitespace-pre-wrap select-all max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[var(--admin-border)] bg-[var(--admin-bg)] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-[var(--admin-primary)] text-white font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Housekeeping / Prune Modal ── */}
      {isPruneModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in-50 zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-[var(--admin-text)]">تنظيف سجل الحركات</h3>
              <p className="text-xs text-[var(--admin-text-muted)]">
                اختر نوع التنظيف لحذف السجلات القديمة لتخفيف قاعدة البيانات والحفاظ على سرعة المتجر.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <label
                onClick={() => setPruneMode('30days')}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  pruneMode === '30days'
                    ? 'border-indigo-500 bg-indigo-500/10 text-[var(--admin-text)] font-bold'
                    : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
                }`}
              >
                <div>
                  <div className="font-bold">حذف السجلات الأقدم من 30 يوماً</div>
                  <div className="text-[10px] opacity-75">الحفاظ على سجل الشهر الحالي فقط</div>
                </div>
                <input
                  type="radio"
                  name="prune"
                  checked={pruneMode === '30days'}
                  onChange={() => setPruneMode('30days')}
                  className="accent-indigo-600"
                />
              </label>

              <label
                onClick={() => setPruneMode('all')}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  pruneMode === 'all'
                    ? 'border-red-500 bg-red-500/10 text-red-400 font-bold'
                    : 'border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-muted)]'
                }`}
              >
                <div>
                  <div className="font-bold text-red-400">حذف كافة السجلات نهائياً (تفريغ كامل)</div>
                  <div className="text-[10px] opacity-75">لا يمكن التراجع عن هذا الإجراء</div>
                </div>
                <input
                  type="radio"
                  name="prune"
                  checked={pruneMode === 'all'}
                  onChange={() => setPruneMode('all')}
                  className="accent-red-600"
                />
              </label>
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                disabled={isPruning}
                onClick={handlePruneLogs}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isPruning ? 'جاري التنظيف...' : 'تأكيد الحذف'}
              </button>
              <button
                type="button"
                disabled={isPruning}
                onClick={() => setIsPruneModalOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-[var(--admin-border)] hover:bg-[var(--admin-hover)] text-xs font-bold text-[var(--admin-text-muted)] transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
