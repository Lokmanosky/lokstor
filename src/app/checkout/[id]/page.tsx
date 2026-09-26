'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { Lock, ShieldCheck, ArrowRight, User, Mail, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const [productId, setProductId] = useState<string>('');
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  // Form states
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Unwrap params Promise
  useEffect(() => {
    params.then((unwrapped) => {
      setProductId(unwrapped.id);
    });
  }, [params]);

  // 2. Fetch product details
  useEffect(() => {
    if (!productId) return;

    async function loadProduct() {
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error('Failed to load product:', err);
      } finally {
        setLoadingProduct(false);
      }
    }

    loadProduct();
  }, [productId]);

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (user) {
      if (user.displayName && !customerName) setCustomerName(user.displayName);
      if (user.email && !customerEmail) setCustomerEmail(user.email);
    }
  }, [user]);

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!customerName.trim()) {
      setErrorMessage('يرجى إدخال الاسم بالكامل.');
      return;
    }

    if (!customerEmail.includes('@')) {
      setErrorMessage('يرجى إدخال بريد إلكتروني صحيح.');
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
        <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-slate-800 dark:text-slate-300 font-semibold text-sm">جاري تحميل بيانات الشراء...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-8 my-12 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">عذراً، المنتج غير متوفر</h2>
        <Link href="/" className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline text-sm">
          العودة للمتجر
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8" dir="rtl">
      {/* Header back link */}
      <Link
        href={`/product/${product.id}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة لصفحة تفاصيل المنتج</span>
      </Link>

      {/* Main Title & Subtitle - 100% High Contrast! */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight">
          تأكيد الطلب والدفع عبر Chargily
        </h1>
        <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base font-medium max-w-xl mx-auto">
          أدخل بياناتك لتصلك الفاتورة ورابط التحميل الرقمي مباشرة إلى بريدك الإلكتروني
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Order Summary Box */}
        <div className="md:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl space-y-6 border-2 border-slate-300 dark:border-slate-800 shadow-md">
          <h3 className="font-black text-slate-950 dark:text-white text-lg border-b-2 border-slate-200 dark:border-slate-800 pb-3">
            ملخص الفاتورة
          </h3>

          <div className="flex items-center gap-4">
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shrink-0"
            />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-950 dark:text-white line-clamp-2 leading-snug">
                {product.name}
              </h4>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium block">
                {product.fileType || 'ملف رقمي'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t-2 border-slate-200 dark:border-slate-800 text-sm">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold">
              <span>سعر المنتج:</span>
              <span className="text-slate-950 dark:text-white font-bold">{product.price} د.ج</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold">
              <span>طريقة التسليم:</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">تحميل فوري</span>
            </div>
            <div className="flex justify-between items-center text-slate-950 dark:text-white font-black text-base pt-3 border-t-2 border-slate-200 dark:border-slate-800">
              <span>المبلغ الإجمالي:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-2xl font-black">{product.price} د.ج</span>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>سيتم تحويلك بأمان إلى بوابة Chargily لتأكيد الدفع عبر البطاقة الذهبية أو CIB.</span>
          </div>
        </div>

        {/* Customer Form Box */}
        <div className="md:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-slate-300 dark:border-slate-800 shadow-md">
          <form onSubmit={handleSubmitCheckout} className="space-y-6">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 text-red-600 dark:text-red-400 text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Name input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-950 dark:text-white block">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد الأمين"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-400 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-950 dark:text-white block">
                البريد الإلكتروني <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-400 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/15 transition-all shadow-inner"
                  dir="ltr"
                />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                ملاحظة: تأكد من صحة البريد لتلقي رابط التحميل وصك الشراء.
              </p>
            </div>

            {/* Chargily Notice */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/80 text-xs text-slate-800 dark:text-emerald-200 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 font-black text-emerald-700 dark:text-emerald-400 text-sm">
                <CreditCard className="w-4 h-4" />
                <span>الدفع محمي بواسطة Chargily Pay</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                عند النقر على الزر أدناه، سيتم توجيهك إلى صفحة الدفع الآمنة الخاصة بـ Chargily لإتمام العملية باستخدام البطاقة الذهبية أو بطاقة CIB.
              </p>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="chargily-btn w-full py-4 rounded-xl text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-emerald-500/25 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الاتصال ببوابة Chargily...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
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
