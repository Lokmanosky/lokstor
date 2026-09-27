'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Order } from '@/types';
import Link from 'next/link';
import { 
  User, 
  Package, 
  Download, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  LogOut, 
  ShieldCheck, 
  Copy, 
  Check, 
  Loader2,
  Settings,
  Sparkles,
  CreditCard
} from 'lucide-react';

export default function CustomerAccountPage() {
  const { user, profile, role, isAdmin, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function fetchCustomerOrders() {
      if (!user?.email) {
        setOrdersLoading(false);
        return;
      }

      try {
        // Query orders by customer email
        const userEmail = user.email.toLowerCase().trim();
        const ordersRef = collection(db, 'orders');
        
        // Fetch matching customer orders
        const q = query(ordersRef, where('customerEmail', '==', userEmail));
        const snap = await getDocs(q);
        
        const list: Order[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });

        // Also check if any order was saved with raw unlowercased email
        if (user.email !== userEmail) {
          const q2 = query(ordersRef, where('customerEmail', '==', user.email));
          const snap2 = await getDocs(q2);
          snap2.forEach(docSnap => {
            if (!list.find(o => o.id === docSnap.id)) {
              list.push({ id: docSnap.id, ...docSnap.data() } as Order);
            }
          });
        }

        // Sort by createdAt descending
        list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        setOrders(list);
      } catch (err) {
        console.error('Error fetching customer orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    }

    if (user) {
      fetchCustomerOrders();
    }
  }, [user]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-[var(--store-primary)]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalSpent = paidOrders.reduce((sum, o) => sum + Number(o.productPrice || o.amount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8" dir="rtl">
      
      {/* ── Top Header / Welcome Banner ──────────────────────────────────────── */}
      <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--store-primary)]/10 border border-[var(--store-primary)]/20 text-[var(--store-primary)] flex items-center justify-center text-2xl font-black shrink-0">
              {user.displayName ? user.displayName[0].toUpperCase() : user.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--store-text)]">
                  {user.displayName || user.email?.split('@')[0] || 'حسابي'}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isAdmin 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {isAdmin ? <Sparkles className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  <span>{isAdmin ? 'مسؤول المتجر (Admin)' : 'عميل المتجر (Customer)'}</span>
                </span>
              </div>
              <p className="text-sm text-[var(--store-text-muted)] font-mono" dir="ltr">
                {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>لوحة التحكم (Admin)</span>
              </Link>
            )}

            <button
              onClick={() => { signOut(); router.push('/'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--store-border)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-xs font-medium text-[var(--store-text-muted)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-[var(--store-border)]">
          <div className="bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--store-text-muted)] block">إجمالي الطلبات</span>
            <span className="text-xl font-bold text-[var(--store-text)] mt-1 block">{orders.length}</span>
          </div>
          <div className="bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--store-text-muted)] block">الطلبات المكتملة</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{paidOrders.length}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--store-text-muted)] block">إجمالي المشتريات</span>
            <span className="text-xl font-bold text-[var(--store-primary)] mt-1 block">
              {totalSpent.toLocaleString()} <span className="text-xs">د.ج</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Orders History Section ───────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[var(--store-text)] flex items-center gap-2">
              <Package className="w-5 h-5 text-[var(--store-primary)]" />
              <span>سجل طلباتي والمشتريات</span>
            </h2>
            <p className="text-xs text-[var(--store-text-muted)] mt-0.5">
              يمكنك الوصول لروابط التحميل وبيانات الحسابات المشتراة في أي وقت
            </p>
          </div>
          <Link
            href="/"
            className="text-xs font-semibold text-[var(--store-primary)] hover:underline flex items-center gap-1"
          >
            <span>تصفح المزيد من المنتجات</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {ordersLoading ? (
          <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-12 text-center text-[var(--store-primary)]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-xs text-[var(--store-text-muted)]">جاري تحميل سجل طلباتك...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--store-bg)] border border-[var(--store-border)] flex items-center justify-center mx-auto text-[var(--store-text-muted)]">
              <ShoppingBag className="w-7 h-7 opacity-40" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[var(--store-text)]">لا توجد طلبات سابقة</h3>
              <p className="text-xs text-[var(--store-text-muted)] max-w-sm mx-auto">
                لم تقم بطلب أي منتج حتى الآن. تصفح تشكيلتنا من الاشتراكات والمنتجات الرقمية لبدء الشراء.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--store-primary)] text-[var(--store-bg)] rounded-lg font-bold text-xs hover:opacity-90 transition-opacity"
            >
              <span>تصفح المتجر الآن</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isPaid = order.status === 'paid';
              const isPending = order.status === 'pending';
              
              const dateStr = order.createdAt ? new Date(Number(order.createdAt)).toLocaleDateString('ar-DZ', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }) : '—';

              return (
                <div
                  key={order.id}
                  className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-5 transition-colors hover:border-[var(--store-primary)]/40 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--store-border)] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[var(--store-text-muted)] bg-[var(--store-bg)] px-2 py-1 rounded border border-[var(--store-border)]">
                        #{order.id.slice(0, 8)}
                      </span>
                      <span className="text-xs text-[var(--store-text-muted)]">
                        {dateStr}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isPending
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {isPaid && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isPending && <Clock className="w-3.5 h-3.5" />}
                        {!isPaid && !isPending && <XCircle className="w-3.5 h-3.5" />}
                        <span>{isPaid ? 'تم الدفع بنجاح' : isPending ? 'في انتظار الدفع' : 'فشل الطلب'}</span>
                      </span>

                      <span className="text-sm font-black text-[var(--store-text)]">
                        {Number(order.productPrice || order.amount || 0).toLocaleString()} د.ج
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-[var(--store-text)]">
                        {order.productName || 'منتج رقمي'}
                      </h4>
                      <p className="text-xs text-[var(--store-text-muted)]">
                        المستلم: {order.customerName} ({order.customerEmail})
                      </p>
                    </div>

                    {/* Delivery / Action for Customer */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {isPaid && (
                        <>
                          {/* Direct Download URL */}
                          {order.downloadUrl ? (
                            <a
                              href={order.downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--store-primary)] text-[var(--store-bg)] text-xs font-bold hover:opacity-90 transition-opacity"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل الملف</span>
                            </a>
                          ) : order.downloadToken ? (
                            <a
                              href={`/api/download?token=${order.downloadToken}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--store-primary)] text-[var(--store-bg)] text-xs font-bold hover:opacity-90 transition-opacity"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>تحميل الملف</span>
                            </a>
                          ) : null}

                          {/* Account/Code info */}
                          {order.chargilyInvoiceId && (
                            <button
                              onClick={() => copyToClipboard(order.id, order.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--store-border)] hover:bg-[var(--store-hover)] text-xs text-[var(--store-text)] transition-colors"
                              title="نسخ رقم الفاتورة"
                            >
                              {copiedId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === order.id ? 'تم النسخ' : 'نسخ رقم الطلب'}</span>
                            </button>
                          )}
                        </>
                      )}

                      {isPending && (
                        <>
                          <a
                            href={order.chargilyCheckoutUrl || `/checkout/${order.productId}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>إتمام الدفع الآن</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => copyToClipboard(order.id, order.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--store-border)] hover:bg-[var(--store-hover)] text-xs text-[var(--store-text)] transition-colors"
                            title="نسخ رقم الطلب"
                          >
                            {copiedId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === order.id ? 'تم النسخ' : 'نسخ رقم الطلب'}</span>
                          </button>
                        </>
                      )}


                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
