'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
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
  CreditCard,
  Lock,
  Save,
  Eye,
  EyeOff,
  KeyRound
} from 'lucide-react';

export default function CustomerAccountPage() {
  const { user, profile, role, isAdmin, loading: authLoading, signOut } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Profile edit state
  const [activeTab, setActiveTab] = useState<'orders' | 'profile'>('orders');
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  useEffect(() => {
    async function fetchCustomerOrders() {
      if (!user?.email) { setOrdersLoading(false); return; }
      try {
        const userEmail = user.email.toLowerCase().trim();
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('customerEmail', '==', userEmail));
        const snap = await getDocs(q);
        const list: Order[] = [];
        snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() } as Order));
        if (user.email !== userEmail) {
          const q2 = query(ordersRef, where('customerEmail', '==', user.email));
          const snap2 = await getDocs(q2);
          snap2.forEach(docSnap => { if (!list.find(o => o.id === docSnap.id)) list.push({ id: docSnap.id, ...docSnap.data() } as Order); });
        }
        list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        setOrders(list);
      } catch (err) {
        console.error('Error fetching customer orders:', err);
      } finally {
        setOrdersLoading(false);
      }
    }
    if (user) fetchCustomerOrders();
  }, [user]);

  const isWebUrl = (url?: string) => {
    if (!url) return false;
    try {
      const u = new URL(url);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleDownloadDeliverable = (order: Order) => {
    const content = order.downloadUrl;
    if (!content) {
      if (order.downloadToken) {
        window.open(`/api/download?order_id=${order.id}&token=${order.downloadToken}`, '_blank');
      }
      return;
    }

    if (isWebUrl(content)) {
      window.open(content, '_blank', 'noopener,noreferrer');
      return;
    }

    // Text deliverable: download clean .txt file
    try {
      const cleanName = (order.productName || 'digital-product').replace(/[/\\?%*:|"<>]/g, '_');
      const textToSave = `===========================================
Lokstor - بيانات المنتج الرقمي والتفعيل
===========================================
المنتج: ${order.productName || 'منتج رقمي'}
رقم الطلب: #${order.id}
المستلم: ${order.customerName || ''} (${order.customerEmail || ''})
تاريخ الشراء: ${new Date(order.createdAt).toLocaleString('ar-DZ')}

-------------------------------------------
محتوى التفعيل / بيانات الحساب:
${content}
-------------------------------------------

شكراً لتعاملكم مع Lokstor!
رابط المتجر: https://lokstor.vercel.app
`;
      const blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.download = `${cleanName}_تفعيل.txt`;
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download error:', e);
      copyToClipboard(content, `deliverable_${order.id}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setProfileMsg(null);

    try {
      // 1. Update display name
      if (displayName.trim() && displayName !== user.displayName) {
        await updateProfile(user, { displayName: displayName.trim() });
        // Also update Firestore users doc
        try {
          await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
        } catch (_) {}
      }

      // 2. Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          setProfileMsg({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' });
          return;
        }
        if (newPassword !== confirmPassword) {
          setProfileMsg({ type: 'error', text: 'كلمتا المرور غير متطابقتين.' });
          return;
        }
        if (!currentPassword) {
          setProfileMsg({ type: 'error', text: 'يجب إدخال كلمة المرور الحالية للتحقق.' });
          return;
        }
        // Re-authenticate then change password
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      setProfileMsg({ type: 'success', text: 'تم حفظ التعديلات بنجاح وتزامنت مع السحابة!' });
    } catch (err: any) {
      console.error(err);
      let msg = 'حدث خطأ أثناء الحفظ. حاول مجدداً.';
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        msg = 'كلمة المرور الحالية غير صحيحة. تحقق منها وأعد المحاولة.';
      } else if (code === 'auth/requires-recent-login') {
        msg = 'لأمان حسابك، سجّل الخروج وادخل مجدداً ثم حاول.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'محاولات كثيرة جداً. انتظر دقيقة ثم حاول.';
      } else if (code === 'auth/weak-password') {
        msg = 'كلمة المرور الجديدة ضعيفة جداً. استخدم 6 أحرف أو أكثر.';
      }
      setProfileMsg({ type: 'error', text: msg });
    } finally {
      setProfileLoading(false);
    }
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
      
      {/* Header */}
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
              <p className="text-sm text-[var(--store-text-muted)] font-mono" dir="ltr">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors">
                <Settings className="w-4 h-4" />
                <span>لوحة التحكم</span>
              </Link>
            )}
            <button onClick={() => { signOut(); router.push('/'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--store-border)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-xs font-medium text-[var(--store-text-muted)] transition-colors">
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--store-border)]">
        {[
          { key: 'orders' as const, label: 'سجل الطلبات', icon: <Package className="w-4 h-4" /> },
          { key: 'profile' as const, label: 'إعدادات الحساب', icon: <KeyRound className="w-4 h-4" /> },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[var(--store-primary)] text-[var(--store-primary)]'
                : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'
            }`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--store-text)] flex items-center gap-2">
                <Package className="w-5 h-5 text-[var(--store-primary)]" />
                <span>سجل طلباتي</span>
              </h2>
              <p className="text-xs text-[var(--store-text-muted)] mt-0.5">يمكنك الوصول لروابط التحميل في أي وقت</p>
            </div>
            <Link href="/" className="text-xs font-semibold text-[var(--store-primary)] hover:underline flex items-center gap-1">
              <span>تصفح المزيد</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-12 text-center text-[var(--store-primary)]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs text-[var(--store-text-muted)]">جاري تحميل طلباتك...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-12 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 opacity-30 mx-auto text-[var(--store-text-muted)]" />
              <h3 className="font-bold text-base text-[var(--store-text)]">لا توجد طلبات سابقة</h3>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--store-primary)] text-[var(--store-bg)] rounded-lg font-bold text-xs hover:opacity-90 transition-opacity">
                تصفح المتجر الآن
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isPaid = order.status === 'paid';
                const isPending = order.status === 'pending';
                const dateStr = order.createdAt ? new Date(Number(order.createdAt)).toLocaleDateString('ar-DZ', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '—';
                return (
                  <div key={order.id} className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-5 hover:border-[var(--store-primary)]/40 space-y-4 shadow-sm transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--store-border)] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-[var(--store-text-muted)] bg-[var(--store-bg)] px-2 py-1 rounded border border-[var(--store-border)]">#{order.id.slice(0, 8)}</span>
                        <span className="text-xs text-[var(--store-text-muted)]">{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isPaid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isPending ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {isPaid && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {isPending && <Clock className="w-3.5 h-3.5" />}
                          {!isPaid && !isPending && <XCircle className="w-3.5 h-3.5" />}
                          <span>{isPaid ? 'تم الدفع' : isPending ? 'في الانتظار' : 'فشل'}</span>
                        </span>
                        <span className="text-sm font-black text-[var(--store-text)]">{Number(order.productPrice || order.amount || 0).toLocaleString()} د.ج</span>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[var(--store-text)]">{order.productName || 'منتج رقمي'}</h4>
                        <p className="text-xs text-[var(--store-text-muted)]">المستلم: {order.customerName} ({order.customerEmail})</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPaid && (
                          <>
                            {(order.downloadUrl || order.downloadToken) && (
                              <button
                                onClick={() => handleDownloadDeliverable(order)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--store-primary)] text-[var(--store-bg)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{order.downloadUrl && !isWebUrl(order.downloadUrl) ? 'تحميل الملف (.txt)' : 'تحميل الملف'}</span>
                              </button>
                            )}
                            {order.downloadUrl && !isWebUrl(order.downloadUrl) && (
                              <button
                                onClick={() => copyToClipboard(order.downloadUrl!, `info_${order.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs text-emerald-400 font-bold transition-all"
                                title="نسخ معلومات الحساب أو التفعيل"
                              >
                                {copiedId === `info_${order.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>تم نسخ البيانات!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>نسخ بيانات التفعيل</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => copyToClipboard(order.id, order.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--store-border)] hover:bg-[var(--store-hover)] text-xs text-[var(--store-text)] transition-colors"
                            >
                              {copiedId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === order.id ? 'تم النسخ' : 'نسخ رقم الطلب'}</span>
                            </button>
                          </>
                        )}
                        {isPending && (
                          <>
                            <a href={order.chargilyCheckoutUrl || `/checkout/${order.productId}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all">
                              <CreditCard className="w-3.5 h-3.5" /><span>إتمام الدفع</span><ExternalLink className="w-3.5 h-3.5" />
                            </a>
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
      )}

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="max-w-lg">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            
            {/* Display Name */}
            <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-[var(--store-text)] flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--store-primary)]" />
                معلومات الحساب
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--store-text-muted)] block">الاسم الظاهر</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="اسمك الكامل"
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text)] placeholder-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--store-text-muted)] block">البريد الإلكتروني</label>
                <input value={user.email || ''} disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text-muted)] opacity-60 cursor-not-allowed" dir="ltr" />
                <p className="text-[11px] text-[var(--store-text-muted)]">البريد لا يمكن تغييره من هنا.</p>
              </div>
            </div>

            {/* Password Change */}
            <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-[var(--store-text)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--store-primary)]" />
                تغيير كلمة المرور
                <span className="text-[11px] font-normal text-[var(--store-text-muted)]">(اتركها فارغة إذا لا تريد التغيير)</span>
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--store-text-muted)] block">كلمة المرور الحالية</label>
                  <div className="relative">
                    <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pl-10 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text)] placeholder-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors" dir="ltr" />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute left-3 top-2.5 text-[var(--store-text-muted)] hover:text-[var(--store-text)]">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--store-text-muted)] block">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input type={showNew ? 'text' : 'password'} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pl-10 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text)] placeholder-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors" dir="ltr" />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className="absolute left-3 top-2.5 text-[var(--store-text-muted)] hover:text-[var(--store-text)]">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--store-text-muted)] block">تأكيد كلمة المرور الجديدة</label>
                  <input type="password" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text)] placeholder-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors" dir="ltr" />
                </div>
              </div>
            </div>

            {/* Message */}
            {profileMsg && (
              <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {profileMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
                {profileMsg.text}
              </div>
            )}

            <button type="submit" disabled={profileLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--store-primary)] text-[var(--store-bg)] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {profileLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}

