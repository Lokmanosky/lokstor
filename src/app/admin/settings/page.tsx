'use client';

import { useState, useEffect } from 'react';
import { Save, Upload, Image as ImageIcon, Loader2, Lock, User, Eye, EyeOff, CheckCircle2, XCircle, KeyRound, Bell } from 'lucide-react';
import { useStoreSettings, saveStoreSettings } from '@/lib/store-settings';
import { useAuth } from '@/lib/auth-context';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function SettingsPage() {
  const currentSettings = useStoreSettings();
  const { user } = useAuth();
  const { requestPermission, permissionStatus } = usePushNotifications();

  // Store settings
  const [storeName, setStoreName] = useState(currentSettings.storeName || 'Lokstor');
  const [logoUrl, setLogoUrl] = useState(currentSettings.logoImageUrl || '');
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(currentSettings.adminNotificationEmail || 'admin@lokstor.dz');
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
      });
      setStoreMsg({ type: 'success', text: 'تم حفظ إعدادات المتجر بنجاح!' });
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
      // Update display name
      if (displayName.trim() && displayName !== user.displayName) {
        await updateProfile(user, { displayName: displayName.trim() });
        try { await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() }); } catch (_) {}
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
      }
      setAccountMsg({ type: 'success', text: 'تم حفظ التعديلات وتزامنت مع السحابة بنجاح!' });
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
                  <input type="url" value={file ? '' : logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setFile(null); }}
                    disabled={file !== null} className={`${inputCls} disabled:opacity-50`} placeholder="رابط الصورة (URL)" dir="ltr" />
                </div>
              </div>
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
