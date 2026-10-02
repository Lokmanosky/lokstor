'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { Trash2, ShoppingBag, CreditCard, Clock, CheckCircle2, Package, XCircle , ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

export default function CartPage() {
  const { items, removeFromCart, totalItems, totalPrice } = useCart();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setLoadingOrders(false);
        return;
      }

      const map = new Map<string, any>();

      // 1. Fast API fetch
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/orders?userId=${encodeURIComponent(user.uid)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data?.success && Array.isArray(data.orders)) {
          data.orders.forEach((o: any) => map.set(o.id, o));
        }
      } catch (e) {}

      // 2. Client Firestore fallback
      try {
        const ordersRef = collection(db, 'orders');
        if (user.uid) {
          const snapUid = await getDocs(query(ordersRef, where('userId', '==', user.uid)));
          snapUid.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        const fetchedOrders = Array.from(map.values()).sort(
          (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
        );
        setOrders(fetchedOrders);
        setLoadingOrders(false);
      }
    }
    
    fetchOrders();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-neutral-500 bg-neutral-500/10 border-neutral-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'مكتمل';
      case 'pending': return 'قيد الانتظار';
      case 'failed': return 'فشل';
      default: return status;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-black text-[var(--store-text)] mb-8 flex items-center gap-3">
        <ShoppingBag className="w-8 h-8 text-[var(--store-primary)]" />
        <span>سلة المشتريات</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.length === 0 ? (
            <div className="store-card p-12 text-center rounded-xl border border-[var(--store-border)]">
              <ShoppingBag className="w-16 h-16 text-[var(--store-text-muted)] mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-bold text-[var(--store-text)] mb-2">السلة فارغة</h2>
              <p className="text-[var(--store-text-muted)] mb-6">لم تقم بإضافة أي منتجات للسلة بعد.</p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--store-text)] text-[var(--store-bg)] rounded-lg font-medium hover:opacity-80 transition-opacity">
                تصفح المنتجات
              </Link>
            </div>
          ) : (
            <div className="store-card rounded-xl border border-[var(--store-border)] overflow-hidden">
              <div className="p-4 border-b border-[var(--store-border)] bg-[var(--store-hover)]">
                <h3 className="font-bold text-[var(--store-text)]">المنتجات الحالية ({totalItems})</h3>
              </div>
              <div className="divide-y divide-[var(--store-border)]">
                {items.map(item => (
                  <div key={item.id} className="p-4 flex gap-4 items-center">
                    <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-md object-cover border border-[var(--store-border)] bg-[var(--store-bg)]" />
                    <div className="flex-1">
                      <h4 className="font-bold text-[var(--store-text)] text-sm mb-1">{item.name}</h4>
                      <div className="text-[var(--store-primary)] font-bold">{item.price} د.ج</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[var(--store-text-muted)] text-sm">الكمية: {item.quantity}</span>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        title="إزالة"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Orders */}
          <div className="mt-12">
            <h2 className="text-xl font-bold text-[var(--store-text)] mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--store-text-muted)]" />
              <span>طلباتي السابقة</span>
            </h2>
            
            {!user ? (
              <div className="store-card p-8 text-center rounded-xl border border-[var(--store-border)]">
                <p className="text-[var(--store-text-muted)] text-sm">قم بتسجيل الدخول لرؤية طلباتك السابقة.</p>
              </div>
            ) : loadingOrders ? (
              <div className="store-card p-8 text-center rounded-xl border border-[var(--store-border)]">
                <p className="text-[var(--store-text-muted)] text-sm animate-pulse">جاري جلب الطلبات...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="store-card p-8 text-center rounded-xl border border-[var(--store-border)]">
                <p className="text-[var(--store-text-muted)] text-sm">لا توجد طلبات سابقة.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="store-card p-5 rounded-xl border border-[var(--store-border)] hover:border-[var(--store-text-muted)] transition-colors">
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-4 pb-4 border-b border-[var(--store-border)]">
                      <div>
                        <div className="text-xs text-[var(--store-text-muted)] mb-1">رقم الطلب</div>
                        <div className="font-mono text-sm font-medium text-[var(--store-text)]">#{order.id.slice(-8).toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--store-text-muted)] mb-1">التاريخ والوقت</div>
                        <div className="text-sm font-medium text-[var(--store-text)]">
                          {order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString('ar-DZ') : 'غير متوفر'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[var(--store-text-muted)] mb-1">المبلغ</div>
                        <div className="text-sm font-bold text-[var(--store-text)]">{order.amount} د.ج</div>
                      </div>
                      <div>
                        <span className={`px-2.5 py-1 text-xs font-bold border rounded-md ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-[var(--store-text-muted)] font-medium mb-2 flex items-center gap-1.5">
                        <Package className="w-4 h-4" /> المنتجات ({order.metadata?.items?.length || 1}):
                      </div>
                      {order.metadata?.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-[var(--store-text)]">{item.name || 'منتج'}</span>
                          <span className="text-[var(--store-text-muted)]">{item.price} د.ج</span>
                        </div>
                      )) || (
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[var(--store-text)]">{order.metadata?.product_name || 'منتج غير محدد'}</span>
                          <span className="text-[var(--store-text-muted)]">{order.amount} د.ج</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="store-card p-6 rounded-xl border border-[var(--store-border)] sticky top-24">
            <h3 className="font-bold text-[var(--store-text)] text-lg mb-6">ملخص الطلب</h3>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--store-text-muted)]">عدد المنتجات</span>
                <span className="font-medium text-[var(--store-text)]">{totalItems}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--store-text-muted)]">المجموع الفرعي</span>
                <span className="font-medium text-[var(--store-text)]">{totalPrice} د.ج</span>
              </div>
              <div className="pt-4 border-t border-[var(--store-border)] flex justify-between">
                <span className="font-bold text-[var(--store-text)]">الإجمالي</span>
                <span className="font-black text-xl text-[var(--store-primary)]">{totalPrice} د.ج</span>
              </div>
            </div>

            <button 
              disabled={items.length === 0}
              className="w-full py-3.5 bg-[var(--store-primary)] text-white font-bold rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--store-primary)]/20 disabled:opacity-50 disabled:shadow-none"
            >
              <CreditCard className="w-5 h-5" />
              <span>إتمام الشراء والانتقال للدفع</span>
            </button>
            
            <p className="text-center text-xs text-[var(--store-text-muted)] mt-4 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              دفع آمن ومحمي عبر Chargily
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
