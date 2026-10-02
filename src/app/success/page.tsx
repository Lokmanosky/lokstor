'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Order } from '@/types';
import { Check, RefreshCw, Download, Copy, CheckCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function isUrl(str: string) {
  try {
    new URL(str);
    return str.startsWith('http://') || str.startsWith('https://');
  } catch {
    return false;
  }
}

function DeliveryBox({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (isUrl(content)) {
    return (
      <div className="space-y-3 pt-4">
        <a
          href={content}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="chargily-btn inline-flex items-center justify-center gap-3 w-full py-4 px-8 rounded-2xl text-slate-950 font-black text-base shadow-xl"
        >
          <Download className="w-5 h-5" />
          <span>تحميل الملف الرقمي الآن</span>
        </a>
        <p className="text-[11px] text-slate-500">
          رابط التحميل الخاص بك. إذا لم يعمل، انسخه وافتحه في المتصفح.
        </p>
      </div>
    );
  }

  // Plain text content: account credentials, code, instructions, etc.
  return (
    <div className="space-y-3 pt-4 text-right">
      <p className="text-xs text-emerald-400 font-bold">📦 محتوى الطلب الرقمي:</p>
      <div className="relative bg-[var(--store-bg)] border border-emerald-500/30 rounded-2xl p-5">
        <pre className="text-sm text-[var(--store-text)] whitespace-pre-wrap break-words font-mono leading-relaxed">
          {content}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-white hover:bg-slate-700 transition-colors shadow-sm"
        >
          {copied ? (
            <><CheckCheck className="w-3.5 h-3.5 text-emerald-400" /><span className="text-emerald-400">تم النسخ</span></>
          ) : (
            <><Copy className="w-3.5 h-3.5 text-white" /><span className="text-white">نسخ</span></>
          )}
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        احتفظ بهذه المعلومات في مكان آمن. لن تتمكن من الوصول إليها مجدداً بعد مغادرة هذه الصفحة.
      </p>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const isMock = searchParams.get('mock') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmingMock, setConfirmingMock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const { user } = useAuth();

  const fetchOrder = async (confirmDemo = false) => {
    if (!orderId || !user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const url = confirmDemo
        ? `/api/orders/${orderId}?mock_confirm=true`
        : `/api/orders/${orderId}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();

      if (res.ok && data.order) {
        setOrder(data.order);
      } else {
        setErrorMsg(data.error || 'لم نتمكن من إيجاد بيانات الطلب');
      }
    } catch (err: any) {
      setErrorMsg('حدث خطأ أثناء الاستعلام عن حالة الطلب.');
    } finally {
      setLoading(false);
      setConfirmingMock(false);
    }
  };

  useEffect(() => {
    if (!orderId || !user) {
      setLoading(false);
      return;
    }

    fetchOrder(isMock);

    // Auto-polling every 3 seconds if order is not yet marked paid (e.g. CIB / SATIM confirmation delay)
    let polls = 0;
    const interval = setInterval(() => {
      if (order?.status === 'paid' || polls >= 12) {
        clearInterval(interval);
        return;
      }
      polls++;
      fetchOrder(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [orderId, isMock, order?.status]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center bg-[var(--store-card)] border border-[var(--store-border)] shadow-xl rounded-3xl p-12 my-12">
        <div className="inline-block w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-[var(--store-text)] mb-2">جاري التحقق من حالة الدفع...</h2>
        <p className="text-[var(--store-text-muted)] text-xs">يرجى الانتظار لحظات.</p>
      </div>
    );
  }

  if (!orderId || (!loading && !order)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center bg-[var(--store-card)] border border-[var(--store-border)] shadow-xl rounded-3xl p-12 my-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto text-2xl font-bold">!</div>
        <h2 className="text-2xl font-bold text-[var(--store-text)]">لم يتم العثور على الطلب</h2>
        <p className="text-[var(--store-text-muted)] text-xs leading-relaxed max-w-md mx-auto">
          {errorMsg || 'يرجى التأكد من رابط الشراء أو الاستعلام باستخدام البريد الإلكتروني.'}
        </p>
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs">
          <ArrowRight className="w-4 h-4" /><span>العودة للرئيسية</span>
        </Link>
      </div>
    );
  }

  const isPaid = order?.status === 'paid';
  const deliveryContent = order?.downloadUrl;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="bg-[var(--store-card)] border border-[var(--store-border)] shadow-xl p-8 sm:p-12 rounded-3xl text-center space-y-8 border border-[var(--store-border)] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Status Icon */}
        <div className="relative">
          {isPaid ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <Check className="w-10 h-10 stroke-[3]" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
          )}
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-[var(--store-text)]">
            {isPaid ? 'تم الدفع وتأكيد الطلب بنجاح! 🎉' : 'طلبك قيد المعالجة...'}
          </h1>
          <p className="text-[var(--store-text-muted)] text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            {isPaid
              ? 'شكراً لثقتك بـ Lokstor! محتوى طلبك الرقمي جاهز أدناه.'
              : 'جاري استلام إشعار الدفع النهائي من بوابة Chargily.'}
          </p>
        </div>

        {/* Order Info */}
        <div className="bg-[var(--store-bg)] border border-[var(--store-border)] p-6 rounded-2xl text-right space-y-3 text-xs">
          <div className="flex justify-between items-center text-[var(--store-text-muted)] border-b border-[var(--store-border)] pb-3">
            <span>رقم الطلب:</span>
            <span className="font-mono font-bold text-[var(--store-text)]">{order?.id}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--store-text-muted)] border-b border-[var(--store-border)] pb-3">
            <span>المنتج:</span>
            <span className="font-bold text-[var(--store-text)]">{order?.productName}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--store-text-muted)] border-b border-[var(--store-border)] pb-3">
            <span>البريد الإلكتروني:</span>
            <span className="text-emerald-400 font-semibold">{order?.customerEmail}</span>
          </div>
          <div className="flex justify-between items-center text-[var(--store-text-muted)]">
            <span>المبلغ المدفوع:</span>
            <span className="font-black text-[var(--store-text)] text-sm">{order?.productPrice} د.ج</span>
          </div>
        </div>

        {/* Delivery Section */}
        {isPaid ? (
          deliveryContent ? (
            <DeliveryBox content={deliveryContent} />
          ) : (
            <div className="pt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
              <p className="font-bold">جاري تجهيز محتوى الطلب...</p>
              <p className="text-[var(--store-text-muted)] mt-1">إذا لم يظهر المحتوى خلال دقيقة، يرجى التواصل معنا برقم طلبك.</p>
            </div>
          )
        ) : (
          <div className="space-y-4 pt-2">
            <button
              onClick={() => fetchOrder(false)}
              className="w-full py-3 rounded-xl bg-[var(--store-bg)] text-[var(--store-text)] font-bold text-xs border border-[var(--store-border)] hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة الفحص والتحقق</span>
            </button>

            {/* Dev Mock Confirm */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
              <p className="font-bold">وضع التطوير / التجربة المحلية:</p>
              <p className="text-[11px] text-[var(--store-text-muted)]">
                لمحاكاة نجاح الدفع وعرض المحتوى الرقمي فوراً (بدون Webhook حقيقي):
              </p>
              <button
                onClick={() => { setConfirmingMock(true); fetchOrder(true); }}
                disabled={confirmingMock}
                className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition-colors"
              >
                {confirmingMock ? 'جاري التأكيد...' : 'تأكيد كمدفوع ومحاكاة التسليم'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs text-[var(--store-text-muted)] hover:text-[var(--store-text)] font-semibold">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[var(--store-text-muted)] text-sm">جاري التحميل...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
