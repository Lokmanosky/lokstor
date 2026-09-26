'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Order } from '@/types';
import { CheckCircle2, Download, ShieldCheck, Sparkles, ArrowRight, RefreshCw, FileText, Check } from 'lucide-react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const isMock = searchParams.get('mock') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [confirmingMock, setConfirmingMock] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const fetchOrder = async (confirmDemo = false) => {
    if (!orderId) return;
    try {
      setLoading(true);
      const url = confirmDemo
        ? `/api/orders/${orderId}?mock_confirm=true`
        : `/api/orders/${orderId}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.order) {
        setOrder(data.order);
      } else {
        setErrorMsg(data.error || 'لم نتمكن من إيجاد بيانات الطلب');
      }
    } catch (err: any) {
      console.error('Fetch order error:', err);
      setErrorMsg('حدث خطأ أثناء الاستعلام عن حالة الطلب.');
    } finally {
      setLoading(false);
      setConfirmingMock(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      // Automatically auto confirm if mock parameter is present
      fetchOrder(isMock);
    } else {
      setLoading(false);
    }
  }, [orderId, isMock]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center glass-card rounded-3xl p-12 my-12">
        <div className="inline-block w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">جاري التحقق من حالة الفاتورة والدفع...</h2>
        <p className="text-slate-400 text-xs">يرجى الانتظار لحظات حتى يتم تأكيد التحويل بواسطة بوابة Chargily.</p>
      </div>
    );
  }

  if (!orderId || (!loading && !order)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center glass-card rounded-3xl p-12 my-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center justify-center mx-auto">
          !
        </div>
        <h2 className="text-2xl font-bold text-white">لم يتم العثور على الطلب</h2>
        <p className="text-slate-400 text-xs leading-relaxed max-w-md mx-auto">
          {errorMsg || 'يرجى التأكد من رابط الشراء أو الاستعلام باستخدام البريد الإلكتروني.'}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </Link>
      </div>
    );
  }

  const isPaid = order?.status === 'paid';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      <div className="glass-card p-8 sm:p-12 rounded-3xl text-center space-y-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Glow backdrop */}
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
          <h1 className="text-3xl font-extrabold text-white">
            {isPaid ? 'تم الدفع وتأكيد الطلب بنجاح! 🎉' : 'طلبك قيد المعالجة والتأكيد...'}
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            {isPaid
              ? 'شكراً لك على ثقتك بـ لوقستور lokstor! ملفك الرقمي أصبح جاهزاً للتحميل الآن.'
              : 'جاري استلام إشعار الدفع النهائي من بوابة Chargily. يرجى تحديث الصفحة أو انتظار تأكيد Webhook.'}
          </p>
        </div>

        {/* Order Info Card */}
        <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl text-right space-y-3 text-xs">
          <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/80 pb-3">
            <span>رقم الطلب:</span>
            <span className="font-mono font-bold text-white">{order?.id}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/80 pb-3">
            <span>المنتج:</span>
            <span className="font-bold text-white">{order?.productName}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 border-b border-slate-800/80 pb-3">
            <span>البريد الإلكتروني للعميل:</span>
            <span className="text-emerald-400 font-semibold">{order?.customerEmail}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>المبلغ المدفوع:</span>
            <span className="font-black text-white text-sm">{order?.productPrice} د.ج</span>
          </div>
        </div>

        {/* Download Action Section */}
        {isPaid ? (
          <div className="space-y-4 pt-4">
            <a
              href={order?.downloadUrl || `/api/download?order_id=${order?.id}&token=${order?.downloadToken}`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="chargily-btn inline-flex items-center justify-center gap-3 w-full py-4 px-8 rounded-2xl text-slate-950 font-black text-base shadow-xl"
            >
              <Download className="w-5 h-5" />
              <span>تحميل الملف الرقمي الان</span>
            </a>
            <p className="text-[11px] text-slate-500">
              رابط التحميل الخاص بك صالح ومتوفر أيضاً عبر البريد الإلكتروني.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <button
              onClick={() => fetchOrder(false)}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs border border-slate-800 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة الفحص والتحقق</span>
            </button>

            {/* Dev Mock Confirm Helper button */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
              <p className="font-bold">وضع التطوير/التجربة المحلية (Demo / Test Mode):</p>
              <p className="text-[11px] text-slate-400">
                إذا كنت تتصفح دون ربط Webhook مائي مباشر بـ Chargily، يمكنك محاكاة نجاح الترسيل وتفعيل رابط التحميل فوراً:
              </p>
              <button
                onClick={() => {
                  setConfirmingMock(true);
                  fetchOrder(true);
                }}
                disabled={confirmingMock}
                className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-extrabold text-xs hover:bg-amber-400 transition-colors"
              >
                {confirmingMock ? 'جاري التأكيد التجريبي...' : 'تأكيد العملية كمدفوعة ومحاكاة التحميل'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-white font-semibold">
          العودة للصفحة الرئيسية للمتجر
        </Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">جاري التحميل...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
