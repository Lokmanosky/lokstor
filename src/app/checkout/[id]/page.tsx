'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { ArrowRight, Lock, CreditCard, ShieldCheck, User, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState<boolean>(true);

  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function loadProd() {
      try {
        const snap = await getDoc(doc(db, 'products', productId));
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() } as Product);
        } else {
          const seed = INITIAL_PRODUCTS.find((p) => p.id === productId);
          if (seed) setProduct(seed);
        }
      } catch (err) {
        const seed = INITIAL_PRODUCTS.find((p) => p.id === productId);
        if (seed) setProduct(seed);
      } finally {
        setLoadingProduct(false);
      }
    }
    loadProd();
  }, [productId]);

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim() || !customerEmail.trim()) {
      setErrorMessage('يرجى كتابة الاسم الكامل والبريد الإلكتروني لتلقي رابط التحميل.');
      return;
    }

    if (!customerEmail.includes('@')) {
      setErrorMessage('يرجى أدخال بريد إلكتروني صحيح.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          customerName,
          customerEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشلت عملية إنشاء الفاتورة');
      }

      // Redirect user to Chargily Checkout URL
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('رابط الدفع غير متوفر');
      }
    } catch (err: any) {
      console.error('Checkout submit error:', err);
      setErrorMessage(err?.message || 'حدث خطأ غير متوقع أثناء إعداد الطلب.');
      setIsSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">جاري تحميل بيانات الشراء...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center glass-card rounded-3xl p-8 my-12">
        <h2 className="text-2xl font-bold text-white mb-4">عذراً، المنتج غير متوفر</h2>
        <Link href="/" className="text-emerald-400 font-bold hover:underline text-sm">
          العودة للمتجر
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header link */}
      <Link
        href={`/product/${product.id}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة لصفحة تفاصيل المنتج</span>
      </Link>

      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-white">تأكيد الطلب والدفع عبر Chargily</h1>
        <p className="text-slate-400 text-xs sm:text-sm">
          أدخل بياناتك لتصلك الفاتورة ورابط التحميل الرقمي مباشرة إلى بريدك الإلكتروني
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Order Summary Box */}
        <div className="md:col-span-5 glass-card p-6 rounded-3xl space-y-6 border border-slate-800">
          <h3 className="font-bold text-white text-base border-b border-slate-800 pb-4">
            ملخص الفاتورة
          </h3>

          <div className="flex items-center gap-4">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover bg-slate-900 border border-slate-800"
            />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-white line-clamp-2">{product.name}</h4>
              <span className="text-xs text-slate-400 block">{product.fileType || 'ملف رقمي'}</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-800 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>سعر المنتج:</span>
              <span className="text-white font-semibold">{product.price} د.ج</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>طريقة التسليم:</span>
              <span className="text-emerald-400 font-semibold">تحميل فوري</span>
            </div>
            <div className="flex justify-between text-white font-bold text-sm pt-2 border-t border-slate-800">
              <span>المبلغ الإجمالي:</span>
              <span className="text-emerald-400 text-lg font-black">{product.price} د.ج</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>سيتم تحويلك بأمان إلى بوابة Chargily لتأكيد الدفع عبر البطاقة الذهبية أو CIB.</span>
          </div>
        </div>

        {/* Customer Form Box */}
        <div className="md:col-span-7 glass-card p-8 rounded-3xl space-y-6 border border-slate-800">
          <form onSubmit={handleSubmitCheckout} className="space-y-5">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Name input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 block">
                الاسم الكامل <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد الأمين"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 block">
                البريد الإلكتروني <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                ملاحظة: تأكد من صحة البريد لتلقي رابط التحميل وصك الشراء.
              </p>
            </div>

            {/* Chargily Notice */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <CreditCard className="w-4 h-4" />
                <span>الدفع محمي بواسطة Chargily Pay</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                عند النقر على الزر أدناه، سيتم توجيهك إلى صفحة الدفع الآمنة الخاصة بـ Chargily لإتمام العملية باستخدام البطاقة الذهبية أو بطاقة CIB.
              </p>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="chargily-btn w-full py-4 rounded-2xl text-slate-950 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>جاري الاتصال ببوابة Chargily...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>متابعة لصفحة الدفع ({product.price} د.ج)</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
