'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon, Loader2, Lock, User, Eye, EyeOff, CheckCircle2, XCircle, KeyRound, Bell, DollarSign, CreditCard, Wallet, Zap, ShieldCheck } from 'lucide-react';
import { useStoreSettings, saveStoreSettings } from '@/lib/store-settings';
import { useAuth } from '@/lib/auth-context';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { logAdminActivity } from '@/lib/admin-logger';

export default function SettingsPage() {
  const currentSettings = useStoreSettings();
  const { user } = useAuth();
  const { requestPermission, permissionStatus } = usePushNotifications();

  // Store settings
  const [storeName, setStoreName] = useState(currentSettings.storeName || 'Lokstor');
  const [logoUrl, setLogoUrl] = useState(currentSettings.logoImageUrl || '');
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(currentSettings.adminNotificationEmail || 'admin@lokstor.dz');
  const [dollarRate, setDollarRate] = useState<number>(currentSettings.dollarRate || 250);
  const [paymentGateways, setPaymentGateways] = useState({
    chargilyEnabled: currentSettings.paymentGateways?.chargilyEnabled ?? true,
    oneclickEnabled: currentSettings.paymentGateways?.oneclickEnabled ?? true,
    binanceEnabled: currentSettings.paymentGateways?.binanceEnabled ?? true,
    redotpayEnabled: currentSettings.paymentGateways?.redotpayEnabled ?? true,
  });
  const [oneclickApiKey, setOneclickApiKey] = useState(currentSettings.oneclickApiKey || '');
  const [file, setFile] = useState<File | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeMsg, setStoreMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account settings
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'store' | 'account'>('store');
  const [testNotifLoading, setTestNotifLoading] = useState(false);
  const [testNotifMsg, setTestNotifMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSendTestNotification = async () => {
    if (!user) return;
    setTestNotifLoading(true);
    setTestNotifMsg(null);
    try {
      const token = await user.getIdToken();
      const localFcmToken = typeof window !== 'undefined' ? localStorage.getItem('fcm_token') : null;
      const res = await fetch('/api/admin/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: localFcmToken || undefined })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestNotifMsg({ type: 'success', text: 'تم إرسال الإشعار التجريبي! تفقد شريط إشعارات هاتفك الآن 🔔' });
      } else {
        setTestNotifMsg({ type: 'error', text: data.error || 'فشل إرسال الإشعار التجريبي' });
      }
    } catch (err: any) {
      setTestNotifMsg({ type: 'error', text: err.message || 'حدث خطأ في الاتصال' });
    } finally {
      setTestNotifLoading(false);
    }
  };

  useEffect(() => {
    setStoreName(currentSettings.storeName || 'Lokstor');
    setLogoUrl(currentSettings.logoImageUrl || '');
    if (currentSettings.adminNotificationEmail) {
      setAdminNotificationEmail(currentSettings.adminNotificationEmail);
    }
    if (currentSettings.dollarRate !== undefined) {
      setDollarRate(currentSettings.dollarRate);
    }
    if (currentSettings.paymentGateways) {
      setPaymentGateways({
        chargilyEnabled: currentSettings.paymentGateways.chargilyEnabled ?? true,
        oneclickEnabled: currentSettings.paymentGateways.oneclickEnabled ?? true,
        binanceEnabled: currentSettings.paymentGateways.binanceEnabled ?? true,
        redotpayEnabled: currentSettings.paymentGateways.redotpayEnabled ?? true,
      });
    }
    if (currentSettings.oneclickApiKey !== undefined) {
      setOneclickApiKey(currentSettings.oneclickApiKey);
    }
  }, [currentSettings]);

  useEffect(() => {
    if (user) setDisplayName(user.displayName || '');
  }, [user]);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setStoreLoading(true);
    setStoreMsg(null);
    try {
      let finalLogoUrl = logoUrl;
      if (file) {
        finalLogoUrl = await fileToBase64(file);
        setLogoUrl(finalLogoUrl);
      }
      await saveStoreSettings({
        storeName,
        logoImageUrl: finalLogoUrl,
        adminNotificationEmail: adminNotificationEmail.trim(),
        dollarRate: Number(dollarRate || 250),
        paymentGateways,
        oneclickApiKey: oneclickApiKey.trim(),
      });
      setStoreMsg({ type: 'success', text: 'تم حفظ إعدادات المتجر بنجاح!' });
      await logAdminActivity({
        category: 'settings',
        actionType: 'update',
        title: 'تعديل إعدادات المتجر',
        description: `تم تحديث اسم المتجر (${storeName})، سعر صرف الدولار (1$ = ${dollarRate} د.ج) وإيميل الإشعارات (${adminNotificationEmail.trim()})${file ? ' وتحديث الشعار' : ''}`,
        metadata: { storeName, dollarRate, adminNotificationEmail: adminNotificationEmail.trim(), logoChanged: Boolean(file) }
      });
    } catch (err: any) {
      setStoreMsg({ type: 'error', text: 'حدث خطأ أثناء الحفظ.' });
    } finally {
      setStoreLoading(false);
      setFile(null);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setAccountLoading(true);
    setAccountMsg(null);
    try {
      let changedName = false;
      let changedPass = false;
      // Update display name
      if (displayName.trim() && displayName !== user.displayName) {
        await updateProfile(user, { displayName: displayName.trim() });
        try { await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() }); } catch (_) {}
        changedName = true;
      }
      // Update password
      if (newPassword) {
        if (newPassword.length < 6) { setAccountMsg({ type: 'error', text: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.' }); return; }
        if (newPassword !== confirmPassword) { setAccountMsg({ type: 'error', text: 'كلمتا المرور غير متطابقتين.' }); return; }
        if (!currentPassword) { setAccountMsg({ type: 'error', text: 'أدخل كلمة المرور الحالية للتحقق.' }); return; }
        const credential = EmailAuthProvider.credential(user.email!, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        changedPass = true;
      }
      setAccountMsg({ type: 'success', text: 'تم حفظ التعديلات وتزامنت مع السحابة بنجاح!' });
      await logAdminActivity({
        category: 'settings',
        actionType: 'update',
        title: 'تحديث بيانات حساب الأدمن',
        description: `تم تحديث بيانات الحساب${changedName ? ` (تعديل الاسم إلى: ${displayName.trim()})` : ''}${changedPass ? ' (تغيير كلمة المرور)' : ''}`,
        metadata: { changedName, changedPass }
      });
    } catch (err: any) {
      const code = err?.code || '';
      let msg = 'حدث خطأ. حاول مجدداً.';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-login-credentials') {
        msg = 'كلمة المرور الحالية غير صحيحة. تحقق منها وأعد المحاولة.';
      } else if (code === 'auth/requires-recent-login') {
        msg = 'لأمان حسابك، سجّل الخروج وادخل مجدداً ثم حاول.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'محاولات كثيرة جداً. انتظر دقيقة ثم حاول.';
      } else if (code === 'auth/weak-password') {
        msg = 'كلمة المرور الجديدة ضعيفة. استخدم 6 أحرف أو أكثر.';
      }
      setAccountMsg({ type: 'error', text: msg });
      setAccountMsg({ type: 'error', text: msg });
    } finally {
      setAccountLoading(false);
    }
  };

  const inputCls = "w-full bg-[var(--admin-bg)] border border-[var(--admin-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-primary)] transition-colors";
  const MsgBox = ({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) => msg ? (
    <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
      {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {msg.text}
    </div>
  ) : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-[var(--admin-text)]">الإعدادات</h1>
        <p className="text-sm text-[var(--admin-text-muted)] mt-1">إعدادات المتجر والحساب الشخصي</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--admin-border)]">
        {[
          { key: 'store' as const, label: 'إعدادات المتجر', icon: <ImageIcon className="w-4 h-4" /> },
          { key: 'account' as const, label: 'الحساب الشخصي', icon: <KeyRound className="w-4 h-4" /> },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[var(--admin-primary)] text-[var(--admin-primary)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Store Settings Tab */}
      {activeTab === 'store' && (
        <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl shadow-sm p-6">
          <form onSubmit={handleSaveStore} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--admin-text)]">اسم المتجر</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                className={inputCls} placeholder="مثال: Lokstor" required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--admin-text)] flex items-center justify-between">
                <span>بريد إشعارات الطلبات (الأدمن)</span>
                <span className="text-xs text-[var(--admin-primary)] font-normal">Resend Email</span>
              </label>
              <input 
                type="email" 
                value={adminNotificationEmail} 
                onChange={(e) => setAdminNotificationEmail(e.target.value)}
                className={inputCls} 
                placeholder="admin@lokstor.dz" 
                dir="ltr" 
              />
              <p className="text-xs text-[var(--admin-text-muted)]">
                البريد الذي ستصلك عليه إشعارات الدفع الناجح (شارجيلي) وطلبات التحقق اليدوي (بايننس وريدوت باي).
              </p>
            </div>

            {/* Dollar Exchange Rate Setting */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-[var(--admin-text)] block">
                      سعر صرف الدولار الافتراضي للمتجر (USD Rate)
                    </label>
                    <p className="text-xs text-[var(--admin-text-muted)]">
                      سعر الصرف الافتراضي لحساب الأسعار وطلبات بايننس (Binance USDT) وريدوت باي (1$ = ... د.ج).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="relative w-40">
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={dollarRate}
                    onChange={(e) => setDollarRate(Number(e.target.value))}
                    className={inputCls + ' pl-10 font-mono font-bold text-emerald-600 dark:text-emerald-400'}
                    placeholder="250"
                    required
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--admin-text-muted)] pointer-events-none">
                    د.ج
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {[240, 245, 250, 255, 260].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDollarRate(r)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                        dollarRate === r
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[var(--admin-bg)] border border-[var(--admin-border)] text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]'
                      }`}
                    >
                      {r} د.ج
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium text-[var(--admin-text)] block">شعار المتجر</label>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] flex items-center justify-center overflow-hidden shrink-0">
                  {file ? <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                    : logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    : <ImageIcon className="w-6 h-6 text-[var(--admin-text-muted)]" />}
                </div>
                <div className="flex-1 space-y-3">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-[var(--admin-hover)] border border-[var(--admin-border)] text-[var(--admin-text)] rounded-lg text-sm font-medium hover:bg-[var(--admin-border)] transition-colors w-fit">
                    <Upload className="w-4 h-4" />رفع صورة (Base64)
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="h-px bg-[var(--admin-border)] flex-1" />
                    <span className="text-xs text-[var(--admin-text-muted)]">أو</span>
                    <div className="h-px bg-[var(--admin-border)] flex-1" />
                  </div>
                  <input type="text" value={file ? '' : logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setFile(null); }}
                    disabled={file !== null} className={`${inputCls} disabled:opacity-50`} placeholder="رابط الصورة (URL)" dir="ltr" />
                </div>
              </div>
            </div>

            {/* Payment Gateways Switch Section */}
            <div className="p-4 sm:p-5 rounded-xl bg-[var(--admin-bg)] border border-[var(--admin-border)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--admin-text)] flex items-center gap-2">
                      <span>إدارة بوابات الدفع (تفعيل وإيقاف)</span>
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        التحكم المباشر
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                      حدد البوابات التي ستظهر للعملاء في صفحة الشراء (Checkout). يمكنك تفعيل واحدة فقط أو عدة بوابات معاً.
                    </p>
                  </div>
                </div>

                {/* Bulk Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPaymentGateways({ chargilyEnabled: true, oneclickEnabled: true, binanceEnabled: true, redotpayEnabled: true })}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] hover:border-emerald-500/50 hover:text-emerald-400 transition"
                  >
                    تفعيل الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentGateways({ chargilyEnabled: true, oneclickEnabled: true, binanceEnabled: false, redotpayEnabled: false })}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] hover:border-blue-500/50 hover:text-blue-400 transition"
                  >
                    الآلية فقط ⚡
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentGateways({ chargilyEnabled: false, oneclickEnabled: false, binanceEnabled: true, redotpayEnabled: true })}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] hover:border-amber-500/50 hover:text-amber-400 transition"
                  >
                    اليدوية فقط 🤝
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentGateways({ chargilyEnabled: false, oneclickEnabled: false, binanceEnabled: false, redotpayEnabled: false })}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-[var(--admin-card)] border border-[var(--admin-border)] text-red-400 hover:bg-red-500/10 transition"
                  >
                    تعطيل الكل
                  </button>
                </div>
              </div>

              {/* Gateway Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Chargily Pay */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  paymentGateways.chargilyEnabled
                    ? 'bg-emerald-500/5 border-emerald-500/30 shadow-xs'
                    : 'bg-[var(--admin-card)] border-[var(--admin-border)] opacity-60'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--admin-text)]">شارجيلي (Chargily Pay)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            ⚡ دفع آلي
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-500/10 text-[var(--admin-text-muted)] border border-[var(--admin-border)]">
                            الذهبية / CIB
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-muted)] mt-1 leading-relaxed">
                          دفع تلقائي عبر بريد الجزائر مع تسليم فوري وتلقائي للكود فور نجاح العملية.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaymentGateways(prev => ({ ...prev, chargilyEnabled: !prev.chargilyEnabled }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        paymentGateways.chargilyEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        paymentGateways.chargilyEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* 2. OneClickDz (Navio) */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  paymentGateways.oneclickEnabled
                    ? 'bg-blue-500/5 border-blue-500/30 shadow-xs'
                    : 'bg-[var(--admin-card)] border-[var(--admin-border)] opacity-60'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--admin-text)]">ون كليك (OneClickDz Navio)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            ⚡ دفع آلي
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            الذهبية / CIB
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-muted)] mt-1 leading-relaxed">
                          بوابة الدفع بالبطاقة الذهبية و CIB مع التحقق والتسليم التلقائي عبر OneClickDz.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaymentGateways(prev => ({ ...prev, oneclickEnabled: !prev.oneclickEnabled }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        paymentGateways.oneclickEnabled ? 'bg-blue-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        paymentGateways.oneclickEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* OneClick API Key Custom Override */}
                  <div className="mt-3 pt-2.5 border-t border-[var(--admin-border)]/60">
                    <label className="text-[11px] font-medium text-[var(--admin-text-muted)] flex items-center justify-between mb-1">
                      <span>مفتاح API الخاص بـ OneClickDz (X-Access-Token)</span>
                      <span className="text-[10px] text-blue-400">اختياري (مضبوط تلقائياً من .env)</span>
                    </label>
                    <input
                      type="password"
                      value={oneclickApiKey}
                      onChange={(e) => setOneclickApiKey(e.target.value)}
                      placeholder="اتركه فارغاً لاستخدام المفتاح من .env.local أو أدخل مفتاحك هنا"
                      className="w-full text-xs font-mono px-3 py-1.5 rounded-lg bg-[var(--admin-card)] border border-[var(--admin-border)] text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)]/50 focus:border-blue-500 focus:outline-hidden"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* 3. Binance Pay */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  paymentGateways.binanceEnabled
                    ? 'bg-amber-500/5 border-amber-500/30 shadow-xs'
                    : 'bg-[var(--admin-card)] border-[var(--admin-border)] opacity-60'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--admin-text)]">بايننس (Binance USDT)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            🤝 يدوي
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            UID & BEP20
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-muted)] mt-1 leading-relaxed">
                          تحويل بالـ UID أو عنوان BEP20، مع تأكيد الدفع وإرسال الإثبات يدوياً عبر تيليغرام.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaymentGateways(prev => ({ ...prev, binanceEnabled: !prev.binanceEnabled }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        paymentGateways.binanceEnabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        paymentGateways.binanceEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                {/* 4. RedotPay */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  paymentGateways.redotpayEnabled
                    ? 'bg-rose-500/5 border-rose-500/30 shadow-xs'
                    : 'bg-[var(--admin-card)] border-[var(--admin-border)] opacity-60'
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-[var(--admin-text)]">ريدوت باي (RedotPay)</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            🤝 يدوي
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-slate-500/10 text-[var(--admin-text-muted)] border border-[var(--admin-border)]">
                            ID: 1622725404
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--admin-text-muted)] mt-1 leading-relaxed">
                          تحويل مباشر بالـ ID عبر تطبيق RedotPay مع مراجعة يدوية للطلب وإرسال السكرين شوت.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPaymentGateways(prev => ({ ...prev, redotpayEnabled: !prev.redotpayEnabled }))}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        paymentGateways.redotpayEnabled ? 'bg-rose-500' : 'bg-slate-700'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        paymentGateways.redotpayEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Notice */}
              {(!paymentGateways.chargilyEnabled && !paymentGateways.oneclickEnabled && !paymentGateways.binanceEnabled && !paymentGateways.redotpayEnabled) && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>تنبيه: جميع بوابات الدفع معطلة حالياً! لن يتمكن الزبائن من اختيار أي طريقة دفع في صفحة الشراء.</span>
                </div>
              )}
            </div>

            <MsgBox msg={storeMsg} />

            <div className="pt-4 border-t border-[var(--admin-border)] flex justify-end">
              <button type="submit" disabled={storeLoading}
                className="flex items-center gap-2 px-6 py-2 bg-[var(--admin-primary)] text-[var(--admin-bg)] rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 min-w-[140px] justify-center">
                {storeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /><span>حفظ الإعدادات</span></>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && user && (
        <form onSubmit={handleSaveAccount} className="space-y-5">
          {/* Name */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-[var(--admin-text)] flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--admin-primary)]" />
              معلومات الحساب
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--admin-text-muted)] block">الاسم الظاهر</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                placeholder="اسمك الكامل" className={inputCls} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--admin-text-muted)] block">البريد الإلكتروني</label>
              <input value={user.email || ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} dir="ltr" />
              <p className="text-[11px] text-[var(--admin-text-muted)]">البريد لا يمكن تغييره من هنا.</p>
            </div>
          </div>

          {/* Password */}
          <div className="bg-[var(--admin-card)] border border-[var(--admin-border)] rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-[var(--admin-text)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--admin-primary)]" />
              تغيير كلمة المرور
              <span className="text-[11px] font-normal text-[var(--admin-text-muted)]">(اتركها فارغة إذا لا تريد التغيير)</span>
            </h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--admin-text-muted)] block">كلمة المرور الحالية</label>
                <div className="relative">
                  <input type={showCurrent ? 'text' : 'password'} value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••"
                    className={`${inputCls} pl-10`} dir="ltr" />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute left-3 top-2.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--admin-text-muted)] block">كلمة المرور الجديدة</label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••"
                    className={`${inputCls} pl-10`} dir="ltr" />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute left-3 top-2.5 text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-[var(--admin-text-muted)] block">تأكيد كلمة المرور الجديدة</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••" className={inputCls} dir="ltr" />
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-[var(--admin-card)] rounded-xl border border-[var(--admin-border)] p-4 sm:p-6 space-y-4">
            <h3 className="text-sm font-bold text-[var(--admin-text)] flex items-center gap-2 border-b border-[var(--admin-border)] pb-2">
              <Bell className="w-4 h-4 text-emerald-500" />
              إشعارات النظام (Push Notifications)
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-[var(--admin-text-muted)] space-y-1">
                <p>تتيح لك هذه الميزة تلقي إشعارات بالطلبات الجديدة حتى لو كان المتصفح مغلقاً.</p>
                <div className="flex items-center gap-1.5 mt-2 font-medium">
                  حالة الإشعارات في هذا المتصفح: 
                  {permissionStatus === 'granted' ? (
                    <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> مسموح بها</span>
                  ) : permissionStatus === 'denied' ? (
                    <span className="text-red-500 flex items-center gap-1"><XCircle className="w-3.5 h-3.5"/> محظورة (تتطلب تفعيل من المتصفح)</span>
                  ) : (
                    <span className="text-amber-500 flex items-center gap-1"><Bell className="w-3.5 h-3.5"/> غير مفعلة</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={requestPermission}
                  disabled={permissionStatus === 'denied'}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {permissionStatus === 'granted' ? 'تحديث وتأكيد الاتصال' : 'تفعيل الإشعارات الآن'}
                </button>
                {permissionStatus === 'granted' && (
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    disabled={testNotifLoading}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {testNotifLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                    {testNotifLoading ? 'جاري الإرسال...' : '🔔 إرسال إشعار تجريبي لهاتفي'}
                  </button>
                )}
              </div>
            </div>
            {testNotifMsg && (
              <div className={`text-xs p-3 rounded-lg border ${testNotifMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                {testNotifMsg.text}
              </div>
            )}
          </div>

          <MsgBox msg={accountMsg} />

          <button type="submit" disabled={accountLoading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--admin-primary)] text-[var(--admin-bg)] font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
            {accountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {accountLoading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </button>
        </form>
      )}
    </div>
  );
}
