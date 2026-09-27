'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Order } from '@/types';
import { Copy, Mail, Download, Clock, ShoppingBag, RefreshCw, Users, AlertTriangle, CheckCheck, Filter } from 'lucide-react';

type CustomerSegment = 'abandoned' | 'one-time' | 'repeat' | 'all';

interface CustomerSummary {
  email: string;
  name: string;
  orders: Order[];
  completedCount: number;
  abandonedCount: number;
  totalSpent: number;
  lastActivity: number;
  segment: 'abandoned' | 'one-time' | 'repeat';
}

function timeAgo(ts: number | string): string {
  const diff = Date.now() - Number(ts);
  const m = Math.floor(diff / 60000);
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  return `منذ ${d} يوم`;
}

function formatDate(ts: number | string): string {
  return new Date(Number(ts)).toLocaleDateString('ar-DZ', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function AbandonedPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('all');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
      const list: Order[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Order));
      setAllOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const customers = useMemo<CustomerSummary[]>(() => {
    const map = new Map<string, CustomerSummary>();
    allOrders.forEach((o) => {
      const email = o.customerEmail?.toLowerCase() || 'unknown';
      if (!map.has(email)) {
        map.set(email, {
          email,
          name: o.customerName || '-',
          orders: [],
          completedCount: 0,
          abandonedCount: 0,
          totalSpent: 0,
          lastActivity: 0,
          segment: 'abandoned',
        });
      }
      const c = map.get(email)!;
      c.orders.push(o);
      const ts = Number(o.createdAt);
      if (ts > c.lastActivity) c.lastActivity = ts;
      if (o.status === 'paid') {
        c.completedCount++;
        c.totalSpent += Number(o.productPrice || o.amount || 0);
      } else if (o.status === 'pending') {
        c.abandonedCount++;
      }
    });
    map.forEach((c) => {
      if (c.completedCount === 0) c.segment = 'abandoned';
      else if (c.completedCount === 1) c.segment = 'one-time';
      else c.segment = 'repeat';
    });
    return Array.from(map.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }, [allOrders]);

  const stats = useMemo(() => ({
    total: customers.length,
    abandoned: customers.filter((c) => c.segment === 'abandoned').length,
    oneTime: customers.filter((c) => c.segment === 'one-time').length,
    repeat: customers.filter((c) => c.segment === 'repeat').length,
  }), [customers]);

  const filtered = useMemo(() => {
    let list = customers;
    if (activeSegment === 'abandoned') list = list.filter((c) => c.segment === 'abandoned');
    else if (activeSegment === 'one-time') list = list.filter((c) => c.segment === 'one-time');
    else if (activeSegment === 'repeat') list = list.filter((c) => c.segment === 'repeat');
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.email.includes(q) || c.name.toLowerCase().includes(q));
    }
    return list;
  }, [customers, activeSegment, searchQuery]);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const exportCSV = () => {
    const rows = [
      ['الاسم', 'البريد الالكتروني', 'التصنيف', 'مشتريات', 'متروكة', 'اجمالي الانفاق', 'اخر نشاط'],
      ...filtered.map((c) => [
        c.name, c.email,
        c.segment === 'abandoned' ? 'سلة متروكة' : c.segment === 'one-time' ? 'مشتر مرة واحدة' : 'عميل متكرر',
        c.completedCount, c.abandonedCount, c.totalSpent, formatDate(c.lastActivity),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'customers.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const segStyle: Record<CustomerSummary['segment'], { label: string; cls: string }> = {
    abandoned: { label: 'سلة متروكة', cls: 'bg-amber-500/15 text-amber-500 border border-amber-500/30' },
    'one-time': { label: 'مشترٍ مرة', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
    repeat: { label: 'عميل متكرر', cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
  };

  const tabBtns: { key: CustomerSegment; label: string; count: number }[] = [
    { key: 'all', label: 'الكل', count: stats.total },
    { key: 'abandoned', label: 'سلة متروكة', count: stats.abandoned },
    { key: 'one-time', label: 'اشترى مرة', count: stats.oneTime },
    { key: 'repeat', label: 'عميل متكرر', count: stats.repeat },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">العملاء والسلال المتروكة</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">تصنيف العملاء وادارة التواصل اليدوي</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--admin-border)] text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors">
          <Download className="w-4 h-4" />
          تصدير CSV
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: 'all' as CustomerSegment, label: 'اجمالي العملاء', count: stats.total, icon: <Users className="w-5 h-5" />, color: 'text-[var(--admin-accent)]' },
          { key: 'abandoned' as CustomerSegment, label: 'سلة متروكة', count: stats.abandoned, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-500' },
          { key: 'one-time' as CustomerSegment, label: 'اشترى مرة واحدة', count: stats.oneTime, icon: <ShoppingBag className="w-5 h-5" />, color: 'text-blue-400' },
          { key: 'repeat' as CustomerSegment, label: 'عميل متكرر', count: stats.repeat, icon: <RefreshCw className="w-5 h-5" />, color: 'text-emerald-400' },
        ].map((s) => (
          <button key={s.key} onClick={() => setActiveSegment(s.key)}
            className={`p-4 rounded-xl border text-right transition-all ${activeSegment === s.key ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)]/10' : 'border-[var(--admin-border)] bg-[var(--admin-card)] hover:bg-[var(--admin-hover)]'}`}>
            <div className="flex items-start justify-between mb-2">
              <span className="text-2xl font-bold text-[var(--admin-text)]">{s.count}</span>
              <span className={s.color}>{s.icon}</span>
            </div>
            <p className="text-xs text-[var(--admin-text-muted)]">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Filter className="w-4 h-4 absolute right-3 top-2.5 text-[var(--admin-text-muted)]" />
          <input type="text" placeholder="بحث بالاسم او البريد..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-4 py-2 text-sm rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-accent)]" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {tabBtns.map((t) => (
            <button key={t.key} onClick={() => setActiveSegment(t.key)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${activeSegment === t.key ? 'bg-[var(--admin-accent)] text-white border-[var(--admin-accent)]' : 'border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)]'}`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-[var(--admin-bg)] text-[var(--admin-text-muted)] border-b border-[var(--admin-border)]">
              <tr>
                <th className="px-4 py-3 font-medium">العميل</th>
                <th className="px-4 py-3 font-medium">التصنيف</th>
                <th className="px-4 py-3 font-medium text-center">مشتريات</th>
                <th className="px-4 py-3 font-medium text-center">متروكة</th>
                <th className="px-4 py-3 font-medium">اجمالي الانفاق</th>
                <th className="px-4 py-3 font-medium">اخر نشاط</th>
                <th className="px-4 py-3 font-medium text-center">اجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--admin-border)]">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--admin-text-muted)]">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[var(--admin-accent)] border-t-transparent rounded-full animate-spin" />
                    جاري التحميل...
                  </div>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--admin-text-muted)]">لا توجد نتائج</td></tr>
              ) : (
                filtered.map((c) => {
                  const seg = segStyle[c.segment];
                  const isCopied = copiedEmail === c.email;
                  const mailtoHref = `mailto:${c.email}?subject=${encodeURIComponent('مرحباً من Lokstor')}&body=${encodeURIComponent(`مرحباً ${c.name}،\n\n`)}`;
                  return (
                    <tr key={c.email} className="hover:bg-[var(--admin-hover)] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--admin-text)]">{c.name}</p>
                        <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">{c.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${seg.cls}`}>
                          {seg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: c.completedCount > 0 ? 'var(--admin-success, #10b981)' : 'var(--admin-text-muted)' }}>
                        {c.completedCount}
                      </td>
                      <td className="px-4 py-3 text-center font-bold" style={{ color: c.abandonedCount > 0 ? '#f59e0b' : 'var(--admin-text-muted)' }}>
                        {c.abandonedCount}
                      </td>
                      <td className="px-4 py-3">
                        {c.totalSpent > 0
                          ? <span className="font-semibold" style={{ color: 'var(--admin-success, #10b981)' }}>{c.totalSpent.toLocaleString()} د.ج</span>
                          : <span className="text-[var(--admin-text-muted)]">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-[var(--admin-text-muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {timeAgo(c.lastActivity)}
                        </span>
                        <span className="text-[11px] text-[var(--admin-text-muted)] block mt-0.5">{formatDate(c.lastActivity)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => copyEmail(c.email)} title="نسخ البريد"
                            className="p-1.5 rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-hover)] transition-colors">
                            {isCopied ? <CheckCheck className="w-3.5 h-3.5" style={{ color: '#10b981' }} /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => window.location.href = mailtoHref} title="فتح تطبيق الايميل" type="button" className="p-1.5 rounded-lg border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-accent)] hover:border-[var(--admin-accent)] transition-colors"><Mail className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-[var(--admin-border)] text-xs text-[var(--admin-text-muted)] flex items-center justify-between">
            <span>يعرض {filtered.length} من {customers.length} عميل</span>
            <button onClick={exportCSV} className="flex items-center gap-1 hover:underline" style={{ color: 'var(--admin-accent)' }}>
              <Download className="w-3 h-3" />
              تصدير CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


