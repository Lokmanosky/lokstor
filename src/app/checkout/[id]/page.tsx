'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
        <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-[var(--store-text-muted)] text-sm">جاري تحميل بيانات الشراء...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-8 my-12 shadow-sm">
        <h2 className="text-2xl font-bold text-[var(--store-text)] mb-4">عذراً، المنتج غير متوفر</h2>
        <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-sm">
          العودة للمتجر
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8" dir="rtl">
      {/* Header link */}
      <Link
        href={`/product/${product.id}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--store-text-muted)] hover:text-[var(--store-primary)] transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة لصفحة تفاصيل المنتج</span>
      </Link>

      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--store-text)]">تأكيد الطلب والدفع عبر Chargily</h1>
        <p className="text-[var(--store-text-muted)] text-xs sm:text-sm">
          أدخل بياناتك لتصلك الفاتورة ورابط التحميل الرقمي مباشرة إلى بريدك الإلكتروني
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Order Summary Box */}
        <div className="md:col-span-5 bg-[var(--store-card)] p-6 rounded-2xl space-y-6 border border-[var(--store-border)] shadow-sm">
          <h3 className="font-bold text-[var(--store-text)] text-base border-b border-[var(--store-border)] pb-4">
            ملخص الفاتورة
          </h3>

          <div className="flex items-center gap-4">
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover bg-[var(--store-bg)] border border-[var(--store-border)]"
            />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-[var(--store-text)] line-clamp-2">{product.name}</h4>
              <span className="text-xs text-[var(--store-text-muted)] block">{product.fileType || 'ملف رقمي'}</span>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-[var(--store-border)] text-xs">
            <div className="flex justify-between text-[var(--store-text-muted)]">
              <span>سعر المنتج:</span>
              <span className="text-[var(--store-text)] font-semibold">{product.price} د.ج</span>
            </div>
            <div className="flex justify-between text-[var(--store-text-muted)]">
              <span>طريقة التسليم:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">تحميل فوري</span>
            </div>
            <div className="flex justify-between text-[var(--store-text)] font-bold text-sm pt-2 border-t border-[var(--store-border)]">
              <span>المبلغ الإجمالي:</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-lg font-black">{product.price} د.ج</span>
            </div>
          </div>

          <div className="bg-[var(--store-bg)] p-3.5 rounded-xl border border-[var(--store-border)] text-xs text-[var(--store-text-muted)] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>سيتم تحويلك بأمان إلى بوابة Chargily لتأكيد الدفع عبر البطاقة الذهبية أو CIB.</span>
          </div>
        </div>

        {/* Customer Form Box */}
        <div className="md:col-span-7 bg-[var(--store-card)] p-6 sm:p-8 rounded-2xl space-y-6 border border-[var(--store-border)] shadow-sm">
          <form onSubmit={handleSubmitCheckout} className="space-y-5">
            {errorMessage && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Name input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--store-text)] block">
                الاسم الكامل <span className="text-emerald-600 dark:text-emerald-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute right-3.5 top-3.5 text-[var(--store-text-muted)]" />
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد الأمين"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl text-xs text-[var(--store-text)] placeholder:text-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors"
                />
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--store-text)] block">
                البريد الإلكتروني <span className="text-emerald-600 dark:text-emerald-400">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute right-3.5 top-3.5 text-[var(--store-text-muted)]" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl text-xs text-[var(--store-text)] placeholder:text-[var(--store-text-muted)] focus:outline-none focus:border-[var(--store-primary)] transition-colors"
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-[var(--store-text-muted)]">
                ملاحظة: تأكد من صحة البريد لتلقي رابط التحميل وصك الشراء.
              </p>
            </div>

            {/* Chargily Notice */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-[var(--store-text-muted)] space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-4 h-4" />
                <span>الدفع محمي بواسطة Chargily Pay</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                عند النقر على الزر أدناه، سيتم توجيهك إلى صفحة الدفع الآمنة الخاصة بـ Chargily لإتمام العملية باستخدام البطاقة الذهبية أو بطاقة CIB.
              </p>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="chargily-btn w-full py-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
