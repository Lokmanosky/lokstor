'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
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
  const { t, lang, formatCurrency } = useTranslation();
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
    if (!user) {
      setOrdersLoading(false);
      return;
    }

    const orderMap = new Map<string, Order>();

    const commitOrders = () => {
      const list = Array.from(orderMap.values()).sort(
        (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0)
      );
      setOrders(list);
      setOrdersLoading(false);

      list.forEach(o => {
        if (o.status === 'pending' && o.chargilyInvoiceId) {
          fetch(`/api/orders/${o.id}`).catch(() => {});
        }
      });
    };

    // 1. Initial fast load via API route (bypasses Firestore client rule/index quirks)
    const uid = user.uid;
    user.getIdToken().then(token => {
      fetch(`/api/orders?userId=${encodeURIComponent(uid)}&email=${encodeURIComponent(user.email || '')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data?.success && Array.isArray(data.orders)) {
          data.orders.forEach((o: Order) => orderMap.set(o.id, o));
          commitOrders();
        }
      })
      .catch(err => {
        console.warn('API orders fetch notice:', err);
      });
    });

    // 2. Real-time Firestore listeners WITHOUT composite orderBy
    // (Never use orderBy here to prevent Firestore index errors)
    const ordersRef = collection(db, 'orders');
    const unsubs: (() => void)[] = [];

    try {
      // By UID
      const qByUid = query(ordersRef, where('userId', '==', uid));
      const unsubUid = onSnapshot(
        qByUid,
        (snap) => {
          snap.docs.forEach(d => orderMap.set(d.id, { id: d.id, ...d.data() } as Order));
          commitOrders();
        },
        (err) => {
           console.warn('Orders by UID listener notice:', err);
           setOrdersLoading(false);
        }
      );
      unsubs.push(unsubUid);

      // By Email (for old orders)
      if (user.email) {
        const qByEmail = query(ordersRef, where('customerEmail', '==', user.email));
        const unsubEmail = onSnapshot(
          qByEmail,
          (snap) => {
            snap.docs.forEach(d => orderMap.set(d.id, { id: d.id, ...d.data() } as Order));
            commitOrders();
          },
          (err) => {
             console.warn('Orders by Email listener notice:', err);
          }
        );
        unsubs.push(unsubEmail);
      }
    } catch (e) {
      setOrdersLoading(false);
    }

    return () => {
      unsubs.forEach(unsub => unsub());
    };
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

  const isLinkOrContainsLink = (text?: string) => {
    if (!text) return false;
    const trimmed = text.trim();
    return isWebUrl(trimmed) || /https?:\/\/[^\s]+/i.test(trimmed);
  };

  const handleDownloadDeliverable = (order: Order) => {
    const content = (order.downloadUrl || order.deliveryLink || '').trim();
    if (!content) {
      if (order.downloadToken) {
        // Must use fetch with Authorization header — window.open cannot send tokens
        (async () => {
          try {
            const { getAuth } = await import('firebase/auth');
            const token = await getAuth().currentUser?.getIdToken();
            if (!token) return;
            const res = await fetch(`/api/download?order_id=${order.id}&token=${order.downloadToken}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) return;
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${order.productName || 'product'}.txt`;
            a.click();
            URL.revokeObjectURL(url);
          } catch (e) {
            console.error('Download failed', e);
          }
        })();
      }
      return;
    }

    const hasLink = isLinkOrContainsLink(content);

    // If it is a direct URL, open it in a new tab as well
    if (isWebUrl(content)) {
      window.open(content, '_blank', 'noopener,noreferrer');
    }

    // Generate smart text file
    try {
      const cleanName = (order.productName || 'digital-product').replace(/[/\\?%*:|"<>]/g, '_');
      const dateLocale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
      
      const deliverableDetails = hasLink
        ? lang === 'ar'
          ? `-------------------------------------------
رابط التفعيل / التحميل:
يرجى الدخول إلى الرابط التالي للتفعيل:
${content}
-------------------------------------------`
          : lang === 'fr'
          ? `-------------------------------------------
Lien d'activation / Téléchargement :
Veuillez ouvrir le lien suivant pour activer :
${content}
-------------------------------------------`
          : `-------------------------------------------
Activation / Download Link:
Please open the following link to activate:
${content}
-------------------------------------------`
        : lang === 'ar'
          ? `-------------------------------------------
محتوى التفعيل / بيانات الحساب:
${content}
-------------------------------------------`
          : lang === 'fr'
          ? `-------------------------------------------
Données d'activation / Identifiants :
${content}
-------------------------------------------`
          : `-------------------------------------------
Activation Details / Account Credentials:
${content}
-------------------------------------------`;

      const headerText = lang === 'ar'
        ? `===========================================
Lokstor - بيانات المنتج الرقمي والتفعيل
===========================================
المنتج: ${order.productName || 'منتج رقمي'}
رقم الطلب: #${order.id}
المستلم: ${order.customerName || ''} (${order.customerEmail || ''})
تاريخ الشراء: ${new Date(order.createdAt).toLocaleString(dateLocale)}

${deliverableDetails}

شكراً لتعاملكم مع Lokstor!
رابط المتجر: https://lokstor.vercel.app
`
        : lang === 'fr'
        ? `===========================================
Lokstor - Données du produit numérique & Activation
===========================================
Produit : ${order.productName || 'Produit numérique'}
N° Commande : #${order.id}
Destinataire : ${order.customerName || ''} (${order.customerEmail || ''})
Date d'achat : ${new Date(order.createdAt).toLocaleString(dateLocale)}

${deliverableDetails}

Merci d'avoir choisi Lokstor !
Boutique : https://lokstor.vercel.app
`
        : `===========================================
Lokstor - Digital Product & Activation Details
===========================================
Product: ${order.productName || 'Digital Product'}
Order ID: #${order.id}
Recipient: ${order.customerName || ''} (${order.customerEmail || ''})
Purchase Date: ${new Date(order.createdAt).toLocaleString(dateLocale)}

${deliverableDetails}

Thank you for choosing Lokstor!
Store: https://lokstor.vercel.app
`;

      // Prepend UTF-8 BOM so default text viewers recognize UTF-8 properly
      const blob = new Blob(['\uFEFF' + headerText], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = blobUrl;
      tempLink.download = `${cleanName}_${lang === 'ar' ? 'تفعيل' : 'activation'}.txt`;
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
          setProfileMsg({ type: 'error', text: t('account.passMinLength') });
          return;
        }
        if (newPassword !== confirmPassword) {
          setProfileMsg({ type: 'error', text: t('account.passwordsDoNotMatch') });
          return;
        }
        if (!currentPassword) {
          setProfileMsg({ type: 'error', text: t('account.currentPassRequired') });
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

      setProfileMsg({ type: 'success', text: t('account.savedSuccess') });
    } catch (err: any) {
      console.error(err);
      let msg = lang === 'ar' 
        ? 'حدث خطأ أثناء الحفظ. حاول مجدداً.' 
        : lang === 'fr' 
        ? "Une erreur est survenue lors de l'enregistrement." 
        : 'An error occurred while saving. Please try again.';
      const code = err?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        msg = lang === 'ar'
          ? 'كلمة المرور الحالية غير صحيحة. تحقق منها وأعد المحاولة.'
          : lang === 'fr'
          ? 'Mot de passe actuel incorrect.'
          : 'Current password is incorrect.';
      } else if (code === 'auth/requires-recent-login') {
        msg = lang === 'ar'
          ? 'لأمان حسابك، سجّل الخروج وادخل مجدداً ثم حاول.'
          : lang === 'fr'
          ? 'Veuillez vous reconnecter pour modifier ces informations.'
          : 'Please log in again to update your credentials.';
      } else if (code === 'auth/too-many-requests') {
        msg = lang === 'ar'
          ? 'محاولات كثيرة جداً. انتظر دقيقة ثم حاول.'
          : lang === 'fr'
          ? 'Trop de tentatives. Veuillez patienter.'
          : 'Too many attempts. Please wait a moment.';
      } else if (code === 'auth/weak-password') {
        msg = t('account.passMinLength');
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      
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
                  {user.displayName || user.email?.split('@')[0] || t('account.title')}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isAdmin 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {isAdmin ? <Sparkles className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                  <span>{isAdmin ? t('account.adminRole') : t('account.customerRole')}</span>
                </span>
              </div>
              <p className="text-sm text-[var(--store-text-muted)] font-mono" dir="ltr">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link href="/admin" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-bold transition-colors">
                <Settings className="w-4 h-4" />
                <span>{t('nav.adminDashboard')}</span>
              </Link>
            )}
            <button onClick={() => { signOut(); router.push('/'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--store-border)] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-xs font-medium text-[var(--store-text-muted)] transition-colors cursor-pointer">
              <LogOut className={`w-4 h-4 ${lang !== 'ar' ? 'rotate-180' : ''}`} />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-[var(--store-border)]">
          <div className="bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--store-text-muted)] block">{t('account.totalOrders')}</span>
            <span className="text-xl font-bold text-[var(--store-text)] mt-1 block">{orders.length}</span>
          </div>
          <div className="bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--store-text-muted)] block">{t('account.completedOrders')}</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{paidOrders.length}</span>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl p-4">
            <span className="text-xs text-[var(--store-text-muted)] block">{t('account.totalSpent')}</span>
            <span className="text-xl font-bold text-[var(--store-primary)] mt-1 block">
              {formatCurrency(totalSpent)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--store-border)]">
        {[
          { key: 'orders' as const, label: t('account.tabOrders'), icon: <Package className="w-4 h-4" /> },
          { key: 'profile' as const, label: t('account.tabProfile'), icon: <KeyRound className="w-4 h-4" /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'border-[var(--store-primary)] text-[var(--store-primary)]'
                : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'
            }`}>
            {tab.icon}
            {tab.label}
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
                <span>{t('account.tabOrders')}</span>
              </h2>
              <p className="text-xs text-[var(--store-text-muted)] mt-0.5">{t('account.accessDownloadsAnytime')}</p>
            </div>
            <Link href="/" className="text-xs font-semibold text-[var(--store-primary)] hover:underline flex items-center gap-1">
              <span>{t('account.browseStore')}</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-12 text-center text-[var(--store-primary)]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-xs text-[var(--store-text-muted)]">{t('account.loadingOrders')}</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-12 text-center space-y-4">
              <ShoppingBag className="w-10 h-10 opacity-30 mx-auto text-[var(--store-text-muted)]" />
              <h3 className="font-bold text-base text-[var(--store-text)]">{t('account.noOrders')}</h3>
              <p className="text-xs text-[var(--store-text-muted)] max-w-sm mx-auto">{t('account.noOrdersDesc')}</p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--store-primary)] text-[var(--store-bg)] rounded-lg font-bold text-xs hover:opacity-90 transition-opacity">
                {t('account.browseStore')}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isPaid = order.status === 'paid';
                const isPending = order.status === 'pending';
                const dateLocale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
                const dateStr = order.createdAt ? new Date(Number(order.createdAt)).toLocaleDateString(dateLocale, {
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
                          <span>{isPaid ? t('account.statusPaid') : isPending ? t('account.statusPending') : t('account.statusFailed')}</span>
                        </span>
                        <span className="text-sm font-black text-[var(--store-text)]">{formatCurrency(Number(order.productPrice || order.amount || 0))}</span>
                      </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-[var(--store-text)]">{order.productName || t('store.otherProducts')}</h4>
                        <p className="text-xs text-[var(--store-text-muted)]">{t('account.recipient')} {order.customerName} ({order.customerEmail})</p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPaid && (
                          <>
                            {(order.downloadUrl || order.downloadToken || order.deliveryLink) && (
                              <button
                                onClick={() => handleDownloadDeliverable(order)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--store-primary)] text-[var(--store-bg)] text-xs font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{order.downloadUrl && !isWebUrl(order.downloadUrl) || order.deliveryLink && !isWebUrl(order.deliveryLink) ? t('account.downloadTxt') : t('account.downloadLinkOrFile')}</span>
                              </button>
                            )}
                            {(order.downloadUrl || order.deliveryLink) && (
                              <button
                                onClick={() => copyToClipboard((order.downloadUrl || order.deliveryLink)!, `info_${order.id}`)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs text-emerald-400 font-bold transition-all cursor-pointer"
                                title={isLinkOrContainsLink(order.downloadUrl || order.deliveryLink) ? t('account.copyLink') : t('account.copyData')}
                              >
                                {copiedId === `info_${order.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>{t('common.copied')}</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{isLinkOrContainsLink(order.downloadUrl || order.deliveryLink) ? t('account.copyLink') : t('account.copyData')}</span>
                                  </>
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => copyToClipboard(order.id, order.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--store-border)] hover:bg-[var(--store-hover)] text-xs text-[var(--store-text)] transition-colors cursor-pointer"
                            >
                              {copiedId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedId === order.id ? t('account.copiedOrderRef') : t('account.copyOrderRef')}</span>
                            </button>
                          </>
                        )}
                        {isPending && (
                          <>
                            <Link
                              href={order.productId ? `/checkout/${order.productId}${order.selectedVariant?.id ? `?variant=${order.selectedVariant.id}` : ''}` : '/'}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm transition-all"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{t('account.completePayment')}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setOrdersLoading(true);
                                user?.getIdToken().then(token => {
                                  fetch(`/api/orders/${order.id}`, {
                                    headers: {
                                      'Authorization': `Bearer ${token}`
                                    }
                                  }).finally(() => setTimeout(() => setOrdersLoading(false), 800));
                                }).catch(() => setOrdersLoading(false));
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-[var(--store-border)] hover:bg-[var(--store-hover)] text-[11px] text-[var(--store-text-muted)] hover:text-[var(--store-text)] transition-colors cursor-pointer"
                              title={t('account.checkBankStatus')}
                            >
                              <span>{t('account.refreshPayment')}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Prominent Deliverable Card when Paid */}
                    {isPaid && (order.downloadUrl || order.deliveryLink) && (
                      <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1.5 animate-in fade-in">
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{t('account.activationDetailsTitle')}</span>
                        </p>
                        <div className="flex items-center gap-2 bg-[var(--store-bg)] border border-emerald-500/30 p-2 rounded-lg">
                          <span className="font-mono text-xs text-[var(--store-text)] break-all select-all flex-1" dir="ltr">
                            {order.downloadUrl || order.deliveryLink}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard((order.downloadUrl || order.deliveryLink)!, `info_${order.id}`)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
                          >
                            {copiedId === `info_${order.id}` ? t('common.copied') : t('common.copy')}
                          </button>
                        </div>
                      </div>
                    )}
                    {isPaid && !order.downloadUrl && !order.deliveryLink && (
                      <div className="mt-2 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <span>{t('account.fulfillmentInProgress')}</span>
                      </div>
                    )}
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
                {t('account.personalInfo')}
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--store-text-muted)] block">{t('account.displayName')}</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('auth.fullName')}
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text)] placeholder-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--store-text-muted)] block">{t('account.email')}</label>
                <input value={user.email || ''} disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text-muted)] opacity-60 cursor-not-allowed" dir="ltr" />
                <p className="text-[11px] text-[var(--store-text-muted)]">{t('account.emailCannotChange')}</p>
              </div>
            </div>

            {/* Password Change */}
            <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-6 space-y-4">
              <h3 className="font-bold text-[var(--store-text)] flex items-center gap-2">
                <Lock className="w-4 h-4 text-[var(--store-primary)]" />
                {t('account.changePassword')}
                <span className="text-[11px] font-normal text-[var(--store-text-muted)]">{t('account.passwordLeaveBlank')}</span>
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--store-text-muted)] block">{t('account.currentPassword')}</label>
                  <div className="relative">
                    <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text)] placeholder-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors" dir="ltr" />
                    <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                      className={`absolute top-2.5 text-[var(--store-text-muted)] hover:text-[var(--store-text)] cursor-pointer ${lang === 'ar' ? 'left-3' : 'right-3'}`}>
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--store-text-muted)] block">{t('account.newPassword')}</label>
                  <div className="relative">
                    <input type={showNew ? 'text' : 'password'} value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-lg border border-[var(--store-border)] bg-[var(--store-bg)] text-sm text-[var(--store-text)] placeholder-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors" dir="ltr" />
                    <button type="button" onClick={() => setShowNew(!showNew)}
                      className={`absolute top-2.5 text-[var(--store-text-muted)] hover:text-[var(--store-text)] cursor-pointer ${lang === 'ar' ? 'left-3' : 'right-3'}`}>
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[var(--store-text-muted)] block">{t('account.confirmPassword')}</label>
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--store-primary)] text-[var(--store-bg)] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {profileLoading ? t('account.saving') : t('account.saveProfile')}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
