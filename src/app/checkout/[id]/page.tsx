'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  User, 
  Mail, 
  CreditCard, 
  AlertCircle, 
  Copy, 
  Check, 
  Send, 
  ExternalLink,
  Sparkles,
  CheckCircle2,
  QrCode
} from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const [productId, setProductId] = useState<string>('');
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);

  // Form states
  const { user } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'chargily' | 'redotpay' | 'binance'>('chargily');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Copy & Interaction states
  const [copiedRedotId, setCopiedRedotId] = useState(false);
  const [copiedBinanceUid, setCopiedBinanceUid] = useState(false);
  const [copiedBscAddress, setCopiedBscAddress] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Manual payment submission state (RedotPay / Binance)
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderId: string;
    orderRef: string;
    telegramUrl: string;
    method: 'redotpay' | 'binance';
  } | null>(null);

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

  const handleCopyRedotId = () => {
    navigator.clipboard.writeText('1622725404');
    setCopiedRedotId(true);
    setTimeout(() => setCopiedRedotId(false), 2500);
  };

  const handleCopyBinanceUid = () => {
    navigator.clipboard.writeText('427636242');
    setCopiedBinanceUid(true);
    setTimeout(() => setCopiedBinanceUid(false), 2500);
  };

  const handleCopyBscAddress = () => {
    navigator.clipboard.writeText('0xf0782cc454c9f0b273a11aba636fac62f18b24dd');
    setCopiedBscAddress(true);
    setTimeout(() => setCopiedBscAddress(false), 2500);
  };

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
          paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشلت عملية إنشاء الفاتورة');
      }

      if (paymentMethod === 'redotpay' || paymentMethod === 'binance') {
        const orderRef = data.orderId.replace('ord_', '').slice(0, 8).toUpperCase();
        const methodTitle = paymentMethod === 'binance' ? 'بايننس (Binance / USDT) 🟡' : 'RedotPay 🔴';
        
        // Prepare prefilled Telegram message
        const telegramMessage = 
`مرحباً، أرغب في تأكيد شراء منتج عبر ${methodTitle}\n\n` +
`📦 المنتج: ${product?.name}\n` +
`💰 المبلغ: ${product?.price?.toLocaleString('en-US')} د.ج (~4$ USDT)\n` +
`👤 الاسم: ${customerName}\n` +
`📧 البريد: ${customerEmail}\n` +
`🔖 رقم الطلب: #${orderRef}\n\n` +
`سأرسل لكم لقطة شاشة وصل التحويل الآن للتأكيد والتفعيل السريع.`;

        const telegramUrl = `https://t.me/Loktech?text=${encodeURIComponent(telegramMessage)}`;
        
        // Open Telegram in new tab
        window.open(telegramUrl, '_blank');

        setSubmittedOrder({
          orderId: data.orderId,
          orderRef,
          telegramUrl,
          method: paymentMethod,
        });
        setIsSubmitting(false);
        return;
      }

      // Chargily redirect
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
        <p className="text-blue-950 font-bold text-sm">جاري تحميل بيانات الشراء...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center bg-white border-2 border-slate-300 rounded-3xl p-8 my-12 shadow-sm">
        <h2 className="text-2xl font-black text-black mb-4">عذراً، المنتج غير متوفر</h2>
        <Link href="/" className="text-emerald-700 font-bold hover:underline text-sm">
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
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-950 hover:text-blue-800 transition-colors"
      >
        <ArrowRight className="w-4 h-4 text-blue-950" />
        <span>العودة لصفحة تفاصيل المنتج</span>
      </Link>

      {/* Main Title & Subtitle */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
          تأكيد الطلب وإتمام الدفع
        </h1>
        <p className="text-blue-950 text-sm sm:text-base font-semibold max-w-xl mx-auto">
          اختر وسيلة الدفع المناسبة لك، وسيصلك رابط التفعيل والتحميل فوراً
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Order Summary Box */}
        <div className="md:col-span-5 bg-white p-6 sm:p-7 rounded-2xl space-y-6 border-2 border-slate-300 shadow-sm">
          <h3 className="font-black text-black text-lg border-b-2 border-slate-200 pb-3">
            ملخص الفاتورة
          </h3>

          <div className="flex items-center gap-4">
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover bg-slate-50 border-2 border-slate-300 shrink-0"
            />
            <div className="space-y-1">
              <h4 className="font-black text-sm text-black line-clamp-2 leading-snug">
                {product.name}
              </h4>
              <span className="text-xs text-blue-950 font-bold block">
                {product.fileType || 'اشتراك / ملف رقمي'}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t-2 border-slate-200 text-sm">
            <div className="flex justify-between items-center text-blue-950 font-bold">
              <span>سعر المنتج:</span>
              <span className="text-black font-black">{product.price.toLocaleString('en-US')} د.ج</span>
            </div>
            <div className="flex justify-between items-center text-blue-950 font-bold">
              <span>طريقة التسليم:</span>
              <span className="text-emerald-700 font-black">تفعيل وتسليم فوري</span>
            </div>
            <div className="flex justify-between items-center text-black font-black text-base pt-3 border-t-2 border-slate-200">
              <span>المبلغ الإجمالي:</span>
              <div className="text-left">
                <span className="text-emerald-600 text-2xl font-black block leading-none">
                  {product.price.toLocaleString('en-US')} د.ج
                </span>
                <span className="text-xs text-slate-500 font-bold">
                  (أو ما يعادله بـ USDT / RedotPay ~4$)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 p-3.5 rounded-xl border-2 border-emerald-300 text-xs text-blue-950 font-bold flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <span>معاملاتك مؤمنة بالكامل مع تسليم فوري وتوثيق رسمي للطلب.</span>
          </div>
        </div>

        {/* Customer Form Box */}
        <div className="md:col-span-7 bg-white p-6 sm:p-8 rounded-2xl space-y-6 border-2 border-slate-300 shadow-sm">
          
          {/* Manual Payment Success State (RedotPay or Binance) */}
          {submittedOrder ? (
            <div className="space-y-6 py-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-400 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-black">
                  تم تسجيل طلبك بنجاح! 🎉
                </h3>
                <p className="text-sm font-bold text-blue-950">
                  رقم الطلب المرجعي: <span className="font-mono text-emerald-700 font-black text-base">#{submittedOrder.orderRef}</span>
                </p>
                <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
                  تم فتح محادثة التلغرام تلقائياً لنقل تفاصيل طلبك. يرجى إرسال لقطة شاشة وصل التحويل (${submittedOrder.method === 'binance' ? 'بايننس' : 'RedotPay'}) ليتم التفعيل والتسليم معك فوراً.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-200 text-right space-y-2 text-xs">
                {submittedOrder.method === 'binance' ? (
                  <>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">Binance Pay UID:</span>
                      <span className="font-mono text-black font-black">427636242</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600">USDT (BEP20 BSC):</span>
                      <span className="font-mono text-slate-800 text-[11px] truncate max-w-[200px]">0xf0782cc454c9f0b273a11aba636fac62f18b24dd</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-600">حساب RedotPay المستلم:</span>
                    <span className="font-mono text-black font-black">1622725404 (Lokmanosky)</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600">المبلغ المطلوب:</span>
                  <span className="text-emerald-700 font-black">{product.price.toLocaleString('en-US')} د.ج (~4$ USDT)</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={submittedOrder.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>فتح محادثة تلغرام لإرسال الوصل ✈️</span>
                </a>

                <div className="flex items-center gap-3">
                  <Link
                    href="/account"
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-300 hover:border-slate-400 font-black text-xs text-black text-center transition-all"
                  >
                    عرض الطلب في حسابي
                  </Link>
                  <Link
                    href="/"
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-slate-300 hover:border-slate-400 font-black text-xs text-slate-700 text-center transition-all"
                  >
                    العودة للمتجر
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitCheckout} className="space-y-6">
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border-2 border-red-300 text-red-700 text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* PAYMENT METHOD SELECTION */}
              <div className="space-y-2.5">
                <label className="text-sm font-black text-black block">
                  اختر وسيلة الدفع <span className="text-red-600">*</span>
                </label>
                
                {/* 2 Top Options: Chargily & RedotPay */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Chargily */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('chargily')}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                      paymentMethod === 'chargily'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-md ring-2 ring-emerald-600/20'
                        : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-black flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        البطاقة الذهبية / CIB
                      </span>
                      {paymentMethod === 'chargily' && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-950 font-bold">
                      دفع إلكتروني آمن وفوري عبر Chargily
                    </p>
                  </button>

                  {/* Option 2: RedotPay */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('redotpay')}
                    className={`p-3.5 sm:p-4 rounded-2xl border-2 text-right transition-all cursor-pointer ${
                      paymentMethod === 'redotpay'
                        ? 'border-rose-600 bg-rose-50/70 shadow-md ring-2 ring-rose-600/20'
                        : 'border-slate-300 hover:border-slate-400 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-black flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                          R
                        </span>
                        محفظة RedotPay
                      </span>
                      {paymentMethod === 'redotpay' && (
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-rose-900 font-bold">
                      تحويل بالـ ID فوري بدون رسوم (0% عمولة)
                    </p>
                  </button>
                </div>

                {/* Option 3: Binance - Slim Rectangle Full-Width underneath */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('binance')}
                  className={`w-full p-3 sm:p-3.5 rounded-2xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    paymentMethod === 'binance'
                      ? 'border-amber-500 bg-amber-50/80 shadow-md ring-2 ring-amber-500/20'
                      : 'border-slate-300 hover:border-slate-400 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#F0B90B] flex items-center justify-center text-slate-950 font-black shadow-sm shrink-0">
                      {/* Binance Diamond Icon */}
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-slate-950" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2.5l3.5 3.5-3.5 3.5-3.5-3.5L12 2.5zm-5.5 5.5l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zm11 0l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zm-5.5 5.5l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zm0-4.5l2 2-2 2-2-2 2-2z"/>
                      </svg>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-black">
                          بايننس (Binance)
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300">
                          USDT
                        </span>
                      </div>
                      <p className="text-xs text-amber-950 font-semibold mt-0.5">
                        تحويل داخلي بالـ UID (مجاني 0%) أو إيداع USDT (BEP20)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline-block text-[11px] font-bold text-slate-500">
                      0% رسوم Pay
                    </span>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      paymentMethod === 'binance' 
                        ? 'bg-[#F0B90B] text-slate-950' 
                        : 'border border-slate-300 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                </button>
              </div>

              {/* Logged-in recognition */}
              {user ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </div>
                    <div>
                      <span className="font-black text-black block text-sm">تم التعرف على حسابك ({user.email})</span>
                      <span className="text-blue-950 font-bold block">تم ملء بيانات الدفع والتسليم تلقائياً بحسابك</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-200 text-emerald-950 font-black rounded-lg text-[11px] shrink-0">
                    ملء آلي
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 font-bold">
                  💡 إذا كان لديك حساب، سجل دخولك ليتم ملء بياناتك وإضافة طلبك لحسابك تلقائياً.
                </div>
              )}

              {/* Name input */}
              <div className="space-y-2">
                <label className="text-sm font-black text-black block">
                  الاسم الكامل <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-950 pointer-events-none" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: محمد الأمين"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-4 pr-11 py-3.5 bg-white border-2 border-slate-400 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Email input */}
              <div className="space-y-2">
                <label className="text-sm font-black text-black block">
                  البريد الإلكتروني <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-950 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full pl-4 pr-11 py-3.5 bg-white border-2 border-slate-400 rounded-xl text-sm font-bold text-black placeholder:text-slate-400 focus:outline-none focus:border-blue-900 focus:ring-2 focus:ring-blue-900/20 transition-all shadow-sm"
                    dir="ltr"
                  />
                </div>
                <p className="text-xs text-blue-950 font-bold">
                  ملاحظة: تأكد من صحة البريد لتلقي تفاصيل الشراء وإشعار التفعيل.
                </p>
              </div>

              {/* DYNAMIC CONTENT BASED ON PAYMENT METHOD */}
              {paymentMethod === 'chargily' && (
                <>
                  {/* Chargily Notice */}
                  <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-300 text-xs space-y-1.5 leading-relaxed">
                    <div className="flex items-center gap-2 font-black text-emerald-800 text-sm">
                      <CreditCard className="w-4 h-4" />
                      <span>الدفع محمي بواسطة Chargily Pay</span>
                    </div>
                    <p className="text-blue-950 font-semibold">
                      عند النقر على الزر أدناه، سيتم توجيهك إلى صفحة الدفع الآمنة الخاصة بـ Chargily لإتمام العملية باستخدام البطاقة الذهبية أو بطاقة CIB.
                    </p>
                  </div>

                  {/* Submit CTA for Chargily */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="chargily-btn w-full py-4 rounded-xl text-white font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg hover:shadow-emerald-500/25 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري الاتصال ببوابة Chargily...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>متابعة لصفحة الدفع ({product.price.toLocaleString('en-US')} د.ج)</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {paymentMethod === 'redotpay' && (
                <>
                  {/* RedotPay Details Box */}
                  <div className="p-5 rounded-2xl bg-rose-50/80 border-2 border-rose-300 space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-rose-200/80 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                          R
                        </span>
                        <h4 className="font-black text-sm text-black">
                          بيانات التحويل عبر RedotPay
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-200/80 text-rose-900">
                        تحويل داخلي 0% رسوم
                      </span>
                    </div>

                    {/* RedotPay ID & Name with Copy Button */}
                    <div className="bg-white p-3.5 rounded-xl border-2 border-rose-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                        <span>معرّف الحساب (RedotPay ID):</span>
                        <span className="text-black font-semibold">الاسم: Lokmanosky</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="font-mono text-xl sm:text-2xl font-black text-rose-600 tracking-wider">
                          1622725404
                        </span>
                        
                        <button
                          type="button"
                          onClick={handleCopyRedotId}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border border-rose-300"
                        >
                          {copiedRedotId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الـ ID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Steps instructions */}
                    <div className="space-y-2 text-xs font-bold text-blue-950">
                      <p className="font-black text-black">خطوات الإتمام السريعة:</p>
                      <div className="space-y-1.5 pr-2">
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                          <span>افتح تطبيق <strong>RedotPay</strong> واختر <strong>Transfer</strong> (تحويل داخلي).</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                          <span>الصق المعرّف <strong className="font-mono text-rose-600">1622725404</strong> وحوّل المبلغ المطلوب (~4$ أو ما يعادله).</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                          <span>التقط لقطة شاشة للوصل (Screenshot) واضغط الزر أدناه لإرساله عبر تلغرام ليتم تفعيل حسابك فوراً.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA for RedotPay via Telegram */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-black text-base flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg hover:shadow-[#0088cc]/30 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري تسجيل الطلب وتجهيز التلغرام...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>إرسال الوصل للتفعيل الفوري عبر تلغرام ✈️</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {paymentMethod === 'binance' && (
                <>
                  {/* Binance Details Box */}
                  <div className="p-5 rounded-2xl bg-amber-50/70 border-2 border-amber-300 space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-amber-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#F0B90B] flex items-center justify-center text-slate-950 font-black text-xs">
                          B
                        </div>
                        <h4 className="font-black text-sm text-black">
                          بيانات التحويل عبر منصة Binance (بايننس)
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        USDT مقبول
                      </span>
                    </div>

                    {/* Method 1: Binance Pay UID */}
                    <div className="bg-white p-3.5 rounded-xl border-2 border-amber-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px]">1</span>
                          <span>تحويل داخلي عبر Binance Pay (بدون رسوم 0%):</span>
                        </span>
                        <span className="text-emerald-700 font-extrabold text-[11px]">موصى به (أسرع)</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div>
                          <span className="text-[11px] text-slate-500 block font-semibold">Binance UID (المعرّف):</span>
                          <span className="font-mono text-xl sm:text-2xl font-black text-amber-700 tracking-wider">
                            427636242
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyBinanceUid}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border border-amber-300"
                        >
                          {copiedBinanceUid ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الـ UID</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Method 2: USDT BEP20 Address */}
                    <div className="bg-white p-3.5 rounded-xl border-2 border-emerald-200 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">2</span>
                          <span>إيداع USDT عبر الشبكة:</span>
                        </span>
                        <span className="text-emerald-700 font-black px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] border border-emerald-200">
                          BNB Smart Chain (BEP20) BSC
                        </span>
                      </div>

                      <div className="pt-1 space-y-1.5">
                        <span className="text-[11px] text-slate-500 block font-semibold">عنوان الإيداع (Deposit Address):</span>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-300 flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-800 break-all text-left dir-ltr select-all">
                            0xf0782cc454c9f0b273a11aba636fac62f18b24dd
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyBscAddress}
                            className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shrink-0 transition-all active:scale-95 cursor-pointer"
                            title="نسخ عنوان المحفظة"
                          >
                            {copiedBscAddress ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* QR Code toggle */}
                      <div className="pt-1 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => setShowQrModal(!showQrModal)}
                          className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{showQrModal ? 'إخفاء رمز الـ QR' : 'عرض رمز الـ QR للمسح المباشر'}</span>
                        </button>
                      </div>

                      {showQrModal && (
                        <div className="p-3 bg-slate-900 rounded-xl flex flex-col items-center justify-center space-y-2 mt-2">
                          <img 
                            src="/binance-qr.png" 
                            alt="Binance USDT BEP20 QR Code"
                            className="w-48 h-48 rounded-lg object-contain bg-white p-1"
                          />
                          <span className="text-[11px] text-slate-300 font-mono">
                            USDT (BEP20 / BSC)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Steps instructions */}
                    <div className="space-y-2 text-xs font-bold text-amber-950">
                      <p className="font-black text-black">خطوات الإتمام السريعة:</p>
                      <div className="space-y-1.5 pr-2">
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                          <span>افتح تطبيق <strong>Binance</strong> واختر <strong>Pay</strong> (بالـ UID مجاناً) أو اسحب <strong>USDT</strong> على شبكة <strong>BEP20</strong>.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                          <span>حوّل المبلغ المطلوب (~4$ USDT أو ما يعادله).</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                          <span>التقط لقطة شاشة للوصل (Screenshot) واضغط الزر أدناه لإرساله عبر تلغرام للتفعيل الفوري.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA for Binance via Telegram */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-black text-base flex items-center justify-center gap-2.5 disabled:opacity-50 shadow-lg hover:shadow-[#0088cc]/30 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري تسجيل الطلب وتجهيز التلغرام...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>إرسال وصل بايننس للتفعيل الفوري عبر تلغرام ✈️</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
