'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product, ProductVariant } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { useStoreSettings } from '@/lib/store-settings';
import { 
  Lock,
  Ban, 
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
  QrCode,
  Gamepad2,
  Zap
} from 'lucide-react';
import Link from 'next/link';


const DEFAULT_COD_VARIANTS: ProductVariant[] = [
  { id: 'cod_80', name: '80 CP', price: 290, image: '/images/game-coin.jpg' },
  { id: 'cod_420', name: '420 CP', price: 1390, image: '/images/game-coin.jpg' },
  { id: 'cod_880', name: '880 CP', price: 2690, image: '/images/game-coin.jpg' },
  { id: 'cod_2400', name: '2400 CP', price: 6790, image: '/images/game-coin.jpg' },
  { id: 'cod_5000', name: '5000 CP', price: 13990, image: '/images/game-coin.jpg' },
  { id: 'cod_10800', name: '10800 CP', price: 29500, image: '/images/game-coin.jpg' },
  { id: 'cod_pass_w', name: 'تذكرة الإمداد الأسبوعية', price: 290, image: '/images/game-coin.jpg' },
  { id: 'cod_pass_m', name: 'تذكرة الإمداد الشهرية', price: 990, image: '/images/game-coin.jpg' },
];

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, lang } = useTranslation();
  const [productId, setProductId] = useState<string>('');
  const [product, setProduct] = useState<Product | null>(null);
  const isOutOfStock = Boolean(
    product?.status === 'out_of_stock' ||
    (product?.stockType === 'numeric'
      ? (!product?.unlimitedStock && typeof product?.stock === 'number' && product.stock <= 0)
      : (product?.stockLinks && Array.isArray(product.stockLinks) ? product.stockLinks.length === 0 : typeof product?.stock === 'number' && product.stock <= 0))
  );
  const [loadingProduct, setLoadingProduct] = useState(true);

  // Form states
  const { user } = useAuth();
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [gameInfo, setGameInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      if (user.email) setCustomerEmail(user.email);
      if (user.displayName) setCustomerName(user.displayName);
    } else {
      try {
        const savedEmail = localStorage.getItem('lokstor_customer_email');
        const savedName = localStorage.getItem('lokstor_customer_name');
        if (savedEmail && !customerEmail) setCustomerEmail(savedEmail);
        if (savedName && !customerName) setCustomerName(savedName);
      } catch {}
    }
  }, [user]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('lokstor_game_info');
      if (stored) {
        setGameInfo(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error reading game info:', e);
    }
  }, []);

  const { paymentGateways } = useStoreSettings();

  const enabledGateways = useMemo(() => {
    return {
      chargily: paymentGateways?.chargilyEnabled ?? true,
      oneclick: paymentGateways?.oneclickEnabled ?? true,
      binance: paymentGateways?.binanceEnabled ?? true,
      redotpay: paymentGateways?.redotpayEnabled ?? true,
    };
  }, [paymentGateways]);

  const hasAnyGateway = enabledGateways.chargily || enabledGateways.oneclick || enabledGateways.binance || enabledGateways.redotpay;

  const [paymentMethod, setPaymentMethod] = useState<'chargily' | 'oneclick' | 'redotpay' | 'binance'>('chargily');

  // Auto-switch to first available gateway if current is disabled
  useEffect(() => {
    if (paymentMethod === 'chargily' && !enabledGateways.chargily) {
      if (enabledGateways.oneclick) setPaymentMethod('oneclick');
      else if (enabledGateways.binance) setPaymentMethod('binance');
      else if (enabledGateways.redotpay) setPaymentMethod('redotpay');
    } else if (paymentMethod === 'oneclick' && !enabledGateways.oneclick) {
      if (enabledGateways.chargily) setPaymentMethod('chargily');
      else if (enabledGateways.binance) setPaymentMethod('binance');
      else if (enabledGateways.redotpay) setPaymentMethod('redotpay');
    } else if (paymentMethod === 'binance' && !enabledGateways.binance) {
      if (enabledGateways.chargily) setPaymentMethod('chargily');
      else if (enabledGateways.oneclick) setPaymentMethod('oneclick');
      else if (enabledGateways.redotpay) setPaymentMethod('redotpay');
    } else if (paymentMethod === 'redotpay' && !enabledGateways.redotpay) {
      if (enabledGateways.chargily) setPaymentMethod('chargily');
      else if (enabledGateways.oneclick) setPaymentMethod('oneclick');
      else if (enabledGateways.binance) setPaymentMethod('binance');
    }
  }, [enabledGateways, paymentMethod]);
  const [customAmount, setCustomAmount] = useState<number>(1000);
  const searchParams = useSearchParams();
  const variantParamId = searchParams.get('variant');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [gameFields, setGameFields] = useState<Record<string, string>>({});
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

  // Load selected variant with fallback support
  useEffect(() => {
    if (product && variantParamId) {
      const vars = (product.variants && product.variants.length > 0) ? product.variants : DEFAULT_COD_VARIANTS;
      const v = vars.find((x) => x.id === variantParamId);
      if (v) setSelectedVariant(v);
    }
  }, [product, variantParamId]);

  const [appliedDiscount, setAppliedDiscount] = useState<{ value: number, type: 'percentage' | 'fixed' } | null>(null);

  useEffect(() => {
    const coupon = searchParams.get('coupon');
    const targetEmail = user?.email || customerEmail;
    if (coupon && product) {
      const basePrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price || 0);
      fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: coupon, productId: product.id, basePrice, userEmail: targetEmail || undefined })
      }).then(res => res.json()).then(data => {
        if (data.success) {
          setAppliedDiscount({ value: data.value, type: data.type });
        }
      }).catch(() => {});
    }
  }, [searchParams, product, selectedVariant, user, customerEmail]);

  // Compute effective price based on selected variant, custom amount, base price, and discount
  const effectivePrice = useMemo(() => {
    let base = 0;
    if (selectedVariant) base = Number(selectedVariant.price);
    else if (product?.priceUnspecified && customAmount) base = Number(customAmount);
    else base = Number(product?.price || 0);

    if (appliedDiscount) {
      if (appliedDiscount.type === 'percentage') {
        return Math.max(0, Math.round(base * (1 - appliedDiscount.value / 100)));
      } else {
        return Math.max(0, base - appliedDiscount.value);
      }
    }
    return base;
  }, [selectedVariant, product, customAmount, appliedDiscount]);

  // Dynamic USDT equivalent based on product dollar rate / priceUsd
  const cryptoUsdtEquivalent = useMemo(() => {
    // If selected variant has a specific priceUsd defined and no discount applied
    if (!appliedDiscount && selectedVariant && (selectedVariant as any).priceUsd && (selectedVariant as any).priceUsd > 0) {
      return `~${(selectedVariant as any).priceUsd}$ USDT`;
    }
    // If product has specific priceUsd defined (and not custom amount or discount)
    if (!appliedDiscount && !selectedVariant && (product as any)?.priceUsd && (product as any).priceUsd > 0 && (!customAmount || customAmount === product?.price)) {
      return `~${(product as any).priceUsd}$ USDT`;
    }

    const rate = (product as any)?.dollarRate && (product as any).dollarRate > 0 ? Number((product as any).dollarRate) : 250;
    const approx = Math.max(0.5, Math.round((effectivePrice / rate) * 100) / 100);
    return `~${approx}$ USDT`;
  }, [effectivePrice, product, selectedVariant, customAmount, appliedDiscount]);

  const isGameProduct = Boolean(
    (product?.category && (product.category.includes('لعب') || product.category.includes('شحن'))) ||
    product?.type === 'games' ||
    (product?.name && (product.name.toLowerCase().includes('cod') || product.name.toLowerCase().includes('call of duty') || product.name.toLowerCase().includes('شدات') || product.name.toLowerCase().includes('نقاط')))
  );

  const activeRequiredFields = useMemo(() => {
    if (product?.requiresCustomerInfo === false) {
      return [];
    }
    if (product?.requiredFields && product.requiredFields.length > 0) {
      // Don't duplicate email input if already captured in customer delivery box
      return product.requiredFields.filter((f: any) => {
        const id = (f.id || '').toLowerCase();
        const label = (f.label || '').toLowerCase();
        const isEmailField = id === 'email' || id === 'customer_email' || id === 'user_email' ||
          ((label.includes('بريد') || label.includes('email')) && !label.includes('لعبة') && !id.includes('game') && !id.includes('pass'));
        return !isEmailField;
      });
    }
    if (product?.requiresCustomerInfo === true && isGameProduct) {
      return [
        { id: 'game_email', label: 'البريد الإلكتروني للعبة (Call Of Duty / Activision)', placeholder: 'Call Of Duty / Activision Email', required: true, type: 'text' },
        { id: 'game_password', label: 'كلمة المرور (Password)', placeholder: 'أدخل كلمة مرور الحساب', required: true, type: 'password' },
      ];
    }
    return [];
  }, [product, isGameProduct]);

  const handleGameInfoChange = (fieldId: string, value: string) => {
    setGameInfo(prev => {
      const updated = { ...prev, [fieldId]: value };
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('lokstor_game_info', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };


  // Pre-fill logic removed because login is strictly enforced

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

    const defaultCustomerName = lang === 'ar' ? 'عميل' : lang === 'fr' ? 'Client' : 'Customer';
    const finalEmail = (user?.email || customerEmail).trim().toLowerCase();
    const finalName = (customerName || user?.displayName || defaultCustomerName).trim();

    if (!finalEmail) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني لتسليم الطلب.' : lang === 'fr' ? 'Veuillez saisir votre e-mail pour recevoir votre commande.' : 'Please enter your email to receive your order.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(finalEmail)) {
      setErrorMessage(lang === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة، يرجى كتابته بشكل سليم (مثال: name@gmail.com).' : lang === 'fr' ? 'Format d\'e-mail invalide (ex: name@gmail.com).' : 'Invalid email address format (e.g. name@gmail.com).');
      return;
    }

    if (isOutOfStock) {
      setErrorMessage(t('checkout.outOfStock'));
      return;
    }

    // Save to local storage for guest convenience
    try {
      localStorage.setItem('lokstor_customer_email', finalEmail);
      if (finalName && finalName !== defaultCustomerName) {
        localStorage.setItem('lokstor_customer_name', finalName);
      }
    } catch {}

    setIsSubmitting(true);

    try {
      let token: string | undefined = undefined;
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (tokErr) {
          console.warn('Could not retrieve token:', tokErr);
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId,
          customerName: finalName,
          customerEmail: finalEmail,
          paymentMethod,
          variantId: selectedVariant?.id || undefined,
          customFieldsData: Object.keys(gameInfo).length > 0 ? gameInfo : undefined,
          fcmToken: typeof window !== 'undefined' ? (localStorage.getItem('fcm_token') || undefined) : undefined,
          discountCode: searchParams.get('coupon') || undefined,
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = resText ? JSON.parse(resText) : {};
      } catch (parseError) {
        console.error('Failed to parse checkout JSON response:', resText);
      }

      if (!res.ok || !data.success) {
        throw new Error(data?.error || (lang === 'ar' ? 'حدث خطأ أثناء إعداد الفاتورة، يرجى المحاولة مرة أخرى.' : lang === 'fr' ? 'Une erreur est survenue lors de la création de la facture.' : 'An error occurred while preparing your invoice. Please try again.'));
      }

      if (paymentMethod === 'redotpay' || paymentMethod === 'binance') {
        const orderRef = data.orderId.replace('ord_', '').slice(0, 8).toUpperCase();
        const methodTitle = paymentMethod === 'binance' ? 'Binance / USDT 🟡' : 'RedotPay 🔴';
        
        // Prepare prefilled Telegram message
        const telegramMessage = lang === 'ar'
          ? `مرحباً، أرغب في تأكيد شراء منتج عبر ${methodTitle}\n\n` +
            `📦 المنتج: ${product?.name}\n` +
            `💰 المبلغ: ${effectivePrice.toLocaleString('en-US')} د.ج (${cryptoUsdtEquivalent})\n` +
            `👤 الاسم: ${finalName}\n` +
            `📧 البريد: ${finalEmail}\n` +
            `🔖 رقم الطلب: #${orderRef}\n` +
            (Object.keys(gameInfo).length > 0
              ? `\n🎮 بيانات حساب اللعبة للشحن:\n` + Object.entries(gameInfo).map(([k, v]) => `• ${k}: ${v}`).join('\n') + '\n\n'
              : '\n') +
            `سأرسل لكم لقطة شاشة وصل التحويل الآن للتأكيد والتفعيل السريع.`
          : lang === 'fr'
          ? `Bonjour, je souhaite confirmer mon achat via ${methodTitle}\n\n` +
            `📦 Produit : ${product?.name}\n` +
            `💰 Montant : ${effectivePrice.toLocaleString('en-US')} DZD (${cryptoUsdtEquivalent})\n` +
            `👤 Nom : ${finalName}\n` +
            `📧 E-mail : ${finalEmail}\n` +
            `🔖 Réf Commande : #${orderRef}\n` +
            (Object.keys(gameInfo).length > 0
              ? `\n🎮 Infos du compte de jeu :\n` + Object.entries(gameInfo).map(([k, v]) => `• ${k}: ${v}`).join('\n') + '\n\n'
              : '\n') +
            `Je vous envoie la capture du reçu de transfert maintenant.`
          : `Hello, I would like to confirm my purchase via ${methodTitle}\n\n` +
            `📦 Product: ${product?.name}\n` +
            `💰 Amount: ${effectivePrice.toLocaleString('en-US')} DZD (${cryptoUsdtEquivalent})\n` +
            `👤 Name: ${finalName}\n` +
            `📧 Email: ${finalEmail}\n` +
            `🔖 Order Ref: #${orderRef}\n` +
            (Object.keys(gameInfo).length > 0
              ? `\n🎮 Game Account Details:\n` + Object.entries(gameInfo).map(([k, v]) => `• ${k}: ${v}`).join('\n') + '\n\n'
              : '\n') +
            `I am sending the payment receipt screenshot now for fast activation.`;

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
        setIsSubmitting(false);
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(lang === 'ar' ? 'رابط الدفع غير متوفر' : lang === 'fr' ? 'Lien de paiement indisponible' : 'Payment URL unavailable');
      }
    } catch (err: any) {
      console.error('Checkout submit error:', err);
      setErrorMessage(err?.message || (lang === 'ar' ? 'حدث خطأ غير متوقع أثناء إعداد الطلب.' : lang === 'fr' ? 'Une erreur inattendue est survenue.' : 'An unexpected error occurred.'));
      setIsSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-blue-950 dark:text-white font-bold text-sm">{t('checkout.loading')}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center bg-white dark:bg-[#1D1F24] border-2 border-slate-300 dark:border-[#2C2E33] rounded-3xl p-8 my-12 shadow-sm">
        <h2 className="text-2xl font-black text-black dark:text-white mb-4">{t('checkout.outOfStockTitle')}</h2>
        <Link href="/" className="text-emerald-700 dark:text-emerald-400 font-bold hover:underline text-sm">
          {t('checkout.backToStore')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-7 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header back link */}
      <Link
        href={`/product/${product.id}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:opacity-80 transition-opacity"
      >
        <ArrowRight className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${lang !== 'ar' ? 'rotate-180' : ''}`} />
        <span>{t('checkout.back')}</span>
      </Link>

      {/* Main Title & Subtitle */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight checkout-main-title">
          {t('checkout.title')}
        </h1>
        <p className="text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold max-w-xl mx-auto">
          {t('checkout.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Order Summary Box */}
        <div className="md:col-span-5 bg-white dark:bg-[#1D1F24] p-5 sm:p-6 rounded-2xl space-y-4 border-2 border-slate-300 dark:border-[#2C2E33] shadow-sm">
          <h3 className="font-black text-black dark:text-white text-base sm:text-lg border-b-2 border-slate-200 dark:border-[#2C2E33] pb-2.5">
            {t('checkout.orderSummary')}
          </h3>

          <div className="flex items-center gap-4">
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover bg-slate-50 dark:bg-[#16181C] border-2 border-slate-300 dark:border-[#2C2E33] shrink-0"
            />
            <div className="space-y-1">
              <h4 className="font-black text-sm text-black dark:text-white line-clamp-2 leading-snug">
                {product.name} {selectedVariant ? `(${selectedVariant.name})` : ''}
              </h4>
              <span className="text-xs text-blue-950 dark:text-slate-400 font-bold block">
                {product.fileType || t('checkout.defaultType')}
              </span>
            </div>
          </div>

          {Object.keys(gameInfo).length > 0 && (
            <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/25 border-2 border-indigo-200 dark:border-indigo-900/40 rounded-xl space-y-2 text-xs text-right">
              <span className="font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                <Gamepad2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{lang === 'ar' ? 'بيانات شحن الحساب المُدخلة:' : lang === 'fr' ? 'Informations du compte de jeu :' : 'Game Account Details:'}</span>
              </span>
              {Object.entries(gameInfo).map(([k, v]) => {
                const isSecret = k.toLowerCase().includes('pass') || k.includes('كلمة');
                const friendlyLabel = 
                  k === 'game_email' ? (lang === 'ar' ? 'البريد الإلكتروني للعبة' : 'Game Email') :
                  k === 'game_password' ? (lang === 'ar' ? 'كلمة المرور' : 'Password') :
                  k === 'player_id' ? (lang === 'ar' ? 'معرف اللاعب' : 'Player ID') : k;
                return (
                  <div key={k} className="flex justify-between items-center text-blue-950 dark:text-slate-200 font-bold gap-2">
                    <span className="text-slate-600 dark:text-slate-400 shrink-0">{friendlyLabel}:</span>
                    <span className="font-mono text-[11px] truncate max-w-[180px] text-left dir-ltr">
                      {isSecret ? '••••••••' : v}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-2.5 pt-4 border-t-2 border-slate-200 dark:border-[#2C2E33] text-sm">
            <div className="flex justify-between items-center text-blue-950 dark:text-slate-300 font-bold">
              <span>{t('checkout.productPrice')}</span>
              <span className="text-black dark:text-white font-black">{selectedVariant ? `${selectedVariant.price.toLocaleString('en-US')} ${t('common.currency')}` : product.priceUnspecified ? `${customAmount.toLocaleString('en-US')} ${t('common.currency')} (${lang === 'ar' ? 'محدد حسب طلبك' : lang === 'fr' ? 'sur mesure' : 'custom'})` : `${product.price.toLocaleString('en-US')} ${t('common.currency')}`}</span>
            </div>
            <div className="flex justify-between items-center text-blue-950 dark:text-slate-300 font-bold">
              <span>{t('checkout.deliveryMethod')}</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-black">{t('checkout.instantDelivery')}</span>
            </div>
            <div className="flex justify-between items-center text-black dark:text-white font-black text-base pt-3 border-t-2 border-slate-200 dark:border-[#2C2E33]">
              <span>{t('checkout.totalAmount')}</span>
              <div className="text-left">
                <span className="text-emerald-600 dark:text-emerald-400 text-2xl font-black block leading-none">
                  {effectivePrice.toLocaleString('en-US')} {t('common.currency')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  ({cryptoUsdtEquivalent})
                </span>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/25 p-3.5 rounded-xl border-2 border-emerald-300 dark:border-emerald-800 text-xs text-blue-950 dark:text-emerald-200 font-bold flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>{t('checkout.guaranteeBadge')}</span>
          </div>
        </div>

        {/* Customer Form Box */}
        <div className="md:col-span-7 bg-white dark:bg-[#1D1F24] p-4 sm:p-5 rounded-2xl space-y-3.5 border-2 border-slate-300 dark:border-[#2C2E33] shadow-sm">
          
          {/* Manual Payment Success State (RedotPay or Binance) */}
          {submittedOrder ? (
            <div className="space-y-5 py-3 text-center">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-black text-black dark:text-white">
                  {t('checkout.orderSuccessTitle')}
                </h3>
                <p className="text-sm font-bold text-blue-950 dark:text-slate-300">
                  {t('checkout.orderRefLabel')} <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black text-base">#{submittedOrder.orderRef}</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                  {t('checkout.manualOrderNotice')}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#16181C] border-2 border-slate-200 dark:border-[#2C2E33] text-right space-y-2 text-xs">
                {submittedOrder.method === 'binance' ? (
                  <>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600 dark:text-slate-400">Binance Pay UID:</span>
                      <span className="font-mono text-black dark:text-white font-black">427636242</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-600 dark:text-slate-400">USDT (BEP20 BSC):</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px] truncate max-w-[200px]">0xf0782cc454c9f0b273a11aba636fac62f18b24dd</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-600 dark:text-slate-400">{t('checkout.recipientAccount')}</span>
                    <span className="font-mono text-black dark:text-white font-black">1622725404 (Lokmanosky)</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span className="text-slate-600 dark:text-slate-400">{t('checkout.requiredAmount')}</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-black">{effectivePrice.toLocaleString('en-US')} {t('common.currency')} ({cryptoUsdtEquivalent})</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <a
                  href={submittedOrder.telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-6 rounded-xl bg-[#0088cc] hover:bg-[#0077b5] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>{t('checkout.openTelegramBtn')}</span>
                </a>

                <div className="flex items-center gap-2.5">
                  <Link
                    href="/account"
                    className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-[#2C2E33] hover:border-slate-400 dark:hover:border-[#3E4249] font-black text-xs text-black dark:text-white text-center transition-all"
                  >
                    {t('checkout.viewInAccount')}
                  </Link>
                  <Link
                    href="/"
                    className="flex-1 py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-[#2C2E33] hover:border-slate-400 dark:hover:border-[#3E4249] font-black text-xs text-slate-700 dark:text-slate-300 text-center transition-all"
                  >
                    {t('common.backToStore')}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitCheckout} className="space-y-3">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs sm:text-sm font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {isOutOfStock && (
                <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border-2 border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-300 text-sm font-bold flex items-center gap-3">
                  <Ban className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
                  <div>
                    <span className="font-black block text-base">{t('product.outOfStock')}</span>
                    <span className="text-xs font-semibold">{t('checkout.outOfStock')}</span>
                  </div>
                </div>
              )}

              {/* PAYMENT METHOD SELECTION */}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                  <span>{t('checkout.selectMethod')} <span className="text-red-500">*</span></span>
                  {hasAnyGateway && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                      {lang === 'ar' ? 'وسائل دفع آمنة 100%' : '100% Secure Payments'}
                    </span>
                  )}
                </label>
                
                {/* 1. Automated Gateway: Chargily (الذهبية / CIB) */}
                {enabledGateways.chargily && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('chargily')}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      paymentMethod === 'chargily'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/25 dark:border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-[#2C2E33]/80 hover:border-slate-300 dark:hover:border-[#3E4249] bg-white dark:bg-[#16181C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white dark:bg-[#1C1F26] p-1 flex items-center justify-center shadow-xs shrink-0 border border-slate-200 dark:border-slate-700/60 overflow-hidden">
                        <img 
                          src="/images/algerie-poste.svg" 
                          alt="Algérie Poste" 
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {t('checkout.edahabiaCib')}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60">
                            {lang === 'ar' ? 'شارجيلي 🇩🇿' : 'Chargily 🇩🇿'}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-normal mt-0.5">
                          {t('checkout.chargilyDesc')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        paymentMethod === 'chargily' 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'border border-slate-300 dark:border-[#2C2E33] text-transparent'
                      }`}>
                        ✓
                      </span>
                    </div>
                  </button>
                )}

                {/* 2. Automated Gateway: OneClickDz (الذهبية / CIB) */}
                {enabledGateways.oneclick && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('oneclick')}
                    className={`w-full p-2.5 sm:p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                      paymentMethod === 'oneclick'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/25 dark:border-blue-500 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-[#2C2E33]/80 hover:border-slate-300 dark:hover:border-[#3E4249] bg-white dark:bg-[#16181C]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-50 dark:bg-blue-950/50 p-1 flex items-center justify-center shadow-xs shrink-0 border border-blue-200 dark:border-blue-800/60 overflow-hidden text-blue-600 dark:text-blue-400">
                        <img 
                          src="/images/algerie-poste.svg" 
                          alt="Algérie Poste" 
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {t('checkout.edahabiaCib')}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-300/60 dark:border-blue-700/60">
                            {lang === 'ar' ? 'ون كليك 🇩🇿' : 'OneClickDz 🇩🇿'}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-normal mt-0.5">
                          {lang === 'ar' ? 'دفع إلكتروني آمن وفوري عبر OneClickDz' : 'Paiement électronique instantané via OneClickDz'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        paymentMethod === 'oneclick' 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'border border-slate-300 dark:border-[#2C2E33] text-transparent'
                      }`}>
                        ✓
                      </span>
                    </div>
                  </button>
                )}

                {/* 3. Manual Options Side-by-Side: Binance & RedotPay */}
                {(enabledGateways.binance || enabledGateways.redotpay) && (
                  <div className={`grid gap-2 ${
                    enabledGateways.binance && enabledGateways.redotpay ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                  }`}>
                    {/* Binance */}
                    {enabledGateways.binance && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('binance')}
                        className={`p-2.5 sm:p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between ${
                          paymentMethod === 'binance'
                            ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/25 dark:border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                            : 'border-slate-200 dark:border-[#2C2E33]/80 hover:border-slate-300 dark:hover:border-[#3E4249] bg-white dark:bg-[#16181C]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-[#F0B90B] flex items-center justify-center text-slate-950 font-bold shrink-0">
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-slate-950" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2.5l3.5 3.5-3.5 3.5-3.5-3.5L12 2.5zm-5.5 5.5l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zm11 0l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zm-5.5 5.5l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zm0-4.5l2 2-2 2-2-2 2-2z"/>
                              </svg>
                            </div>
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {t('checkout.binance')}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                              USDT
                            </span>
                          </div>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            paymentMethod === 'binance' 
                              ? 'bg-[#F0B90B] text-slate-950 shadow-xs' 
                              : 'border border-slate-300 dark:border-[#2C2E33] text-transparent'
                          }`}>
                            ✓
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-normal leading-tight">
                          {t('checkout.binanceDesc')}
                        </p>
                      </button>
                    )}

                    {/* RedotPay */}
                    {enabledGateways.redotpay && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('redotpay')}
                        className={`p-2.5 sm:p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex flex-col justify-between ${
                          paymentMethod === 'redotpay'
                            ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/25 dark:border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                            : 'border-slate-200 dark:border-[#2C2E33]/80 hover:border-slate-300 dark:hover:border-[#3E4249] bg-white dark:bg-[#16181C]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              R
                            </span>
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {t('checkout.redotpay')}
                            </span>
                          </div>
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            paymentMethod === 'redotpay' 
                              ? 'bg-rose-600 text-white shadow-xs' 
                              : 'border border-slate-300 dark:border-[#2C2E33] text-transparent'
                          }`}>
                            ✓
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-normal leading-tight">
                          {t('checkout.redotpayDesc')}
                        </p>
                      </button>
                    )}
                  </div>
                )}

                {/* If no gateways enabled at all */}
                {!hasAnyGateway && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs sm:text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{lang === 'ar' ? 'بوابات الدفع معطلة مؤقتاً لأعمال الصيانة. يرجى التواصل معنا عبر تلغرام.' : 'Payment gateways are temporarily disabled for maintenance. Please contact us on Telegram.'}</span>
                  </div>
                )}
              </div>

              {/* Logged-in recognition or Guest Contact Inputs */}
              {user ? (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/40 text-xs flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{t('checkout.accountRecognized')}</span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">{t('checkout.loggedIn')}</span>
                      </div>
                      <span className="text-emerald-800 dark:text-emerald-300 font-medium block text-xs mt-0.5">
                        {user.displayName ? `${t('checkout.welcome')} ${user.displayName} • ` : ''}{user.email}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-bold text-xs sm:text-sm text-slate-950 dark:text-slate-100">
                        {t('checkout.deliveryDetails')}
                      </span>
                    </div>
                    <Link 
                      href="/register" 
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('post_login_redirect', window.location.pathname + window.location.search);
                        }
                      }}
                      className="text-[11px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 transition-colors"
                    >
                      <User className="w-3 h-3" />
                      <span>{t('checkout.haveAccount')}</span>
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {/* Email Input (Mandatory) */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <span>{t('checkout.deliveryEmail')}</span>
                          <span className="text-red-500 font-bold">*</span>
                        </span>
                        <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {t('checkout.emailNotice')}
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          dir="ltr"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="name@gmail.com"
                          className="w-full px-3 py-2 pr-9 bg-white dark:bg-[#16181C] border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
                        />
                        <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {t('checkout.emailDesc')}
                      </p>
                    </div>

                    {/* Name Input (Optional) */}
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <span>{t('checkout.fullName')}</span>
                          <span className="text-slate-400 text-[11px] font-normal">({t('common.optional')})</span>
                        </span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder={t('checkout.namePlaceholder')}
                          className="w-full px-3 py-2 pr-9 bg-white dark:bg-[#16181C] border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 shadow-xs transition-all"
                        />
                        <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GAME ACCOUNT REQUIRED INPUTS */}
              {activeRequiredFields.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border-2 border-indigo-300 dark:border-indigo-900/40 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-indigo-200/80 dark:border-indigo-800/50 pb-2">
                    <div className="flex items-center gap-2">
                      {isGameProduct ? (
                        <Gamepad2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      )}
                      <span className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
                        {isGameProduct
                          ? (lang === 'ar' ? 'بيانات حساب اللعبة لشحن الطلب' : 'Game Account Details for Recharge')
                          : (lang === 'ar' ? 'بيانات إضافية لتفعيل الحساب' : 'Account Activation Details')}
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-bold">*</span>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                      {lang === 'ar' ? 'معلومات مشفرة ومحمية 🔒' : 'Encrypted & Secure 🔒'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeRequiredFields.map((field: any) => (
                      <div key={field.id} className="space-y-1">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-300 flex items-center justify-between">
                          <span>{field.label} {field.required && <span className="text-red-600 dark:text-red-400">*</span>}</span>
                        </label>
                        <input
                          type={field.type || (field.id.includes('pass') ? 'password' : 'text')}
                          required={field.required}
                          value={gameInfo[field.id] || ''}
                          onChange={(e) => handleGameInfoChange(field.id, e.target.value)}
                          placeholder={field.placeholder || `أدخل ${field.label}...`}
                          className="w-full px-3 py-2 bg-white dark:bg-[#16181C] border-2 border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-mono font-bold text-black dark:text-white focus:outline-none focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-600/20 shadow-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DYNAMIC CONTENT BASED ON PAYMENT METHOD */}
              {(paymentMethod === 'chargily' || paymentMethod === 'oneclick') && (
                <>
                  {/* Chargily Notice */}
                  <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{paymentMethod === 'oneclick' ? (lang === 'ar' ? 'الدفع محمي بواسطة OneClickDz' : 'Paiement sécurisé par OneClickDz') : t('checkout.chargilyNoticeTitle')}</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 font-normal pr-5 text-[11px] sm:text-xs leading-normal">
                      {paymentMethod === 'oneclick'
                        ? (lang === 'ar' ? 'لإتمام العملية بالبطاقة الذهبية أو بطاقة CIB سيتم تحويلك لصفحة الدفع التابعة لـ OneClickDz والتسليم فوراً.' : 'Paiement sécurisé par carte Edahabia ou CIB via OneClickDz.')
                        : t('checkout.chargilyNoticeDesc')}
                    </p>
                  </div>

                  {/* Submit CTA for Chargily */}
                  <button
                    type="submit"
                    disabled={isSubmitting || isOutOfStock}
                    className={`w-full py-3 sm:py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all ${
                      isOutOfStock
                        ? 'bg-red-600 hover:bg-red-700 text-white cursor-not-allowed shadow-md opacity-95'
                        : paymentMethod === 'oneclick' ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow-md hover:shadow-blue-500/25 cursor-pointer' : 'chargily-btn text-white disabled:opacity-50 shadow-md hover:shadow-emerald-500/25 cursor-pointer'
                    }`}
                  >
                    {isOutOfStock ? (
                      <>
                        <Ban className="w-5 h-5" />
                        <span>{t('product.outOfStock')}</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{t('checkout.preparing')}</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>{t('checkout.payBtn')} ({effectivePrice.toLocaleString('en-US')} {t('common.currency')})</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {paymentMethod === 'redotpay' && (
                <>
                  {/* RedotPay Details Box */}
                  <div className="p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-900/40 space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-rose-200/80 dark:border-rose-900/40 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black">
                          R
                        </span>
                        <h4 className="font-black text-sm text-black dark:text-white">
                          {lang === 'ar' ? 'بيانات التحويل عبر RedotPay' : lang === 'fr' ? 'Détails du transfert RedotPay' : 'RedotPay Transfer Details'}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200">
                        {lang === 'ar' ? 'تحويل داخلي 0% رسوم' : lang === 'fr' ? 'Transfert interne 0% frais' : 'Internal transfer 0% fee'}
                      </span>
                    </div>

                    {/* RedotPay ID & Name with Copy Button */}
                    <div className="bg-white dark:bg-[#16181C] p-3.5 rounded-xl border-2 border-rose-200 dark:border-rose-900/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                        <span>{lang === 'ar' ? 'معرّف الحساب (RedotPay ID):' : 'RedotPay ID:'}</span>
                        <span className="text-black dark:text-white font-semibold">{lang === 'ar' ? 'الاسم: Lokmanosky' : 'Name: Lokmanosky'}</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="font-mono text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-wider">
                          1622725404
                        </span>
                        
                        <button
                          type="button"
                          onClick={handleCopyRedotId}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/80 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-800 dark:text-rose-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border border-rose-300 dark:border-rose-800"
                        >
                          {copiedRedotId ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-400">{t('common.copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'نسخ الـ ID' : 'Copy ID'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Steps instructions */}
                    <div className="space-y-2 text-xs font-bold text-blue-950 dark:text-slate-300">
                      <p className="font-black text-black dark:text-white">{lang === 'ar' ? 'خطوات الإتمام السريعة:' : lang === 'fr' ? 'Étapes rapides :' : 'Quick Steps:'}</p>
                      <div className="space-y-1.5 pr-2">
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                          <span>{lang === 'ar' ? <>افتح تطبيق <strong>RedotPay</strong> واختر <strong>Transfer</strong> (تحويل داخلي).</> : lang === 'fr' ? <>Ouvrez l'application <strong>RedotPay</strong> et choisissez <strong>Transfer</strong>.</> : <>Open the <strong>RedotPay</strong> app and select <strong>Transfer</strong>.</>}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                          <span>{lang === 'ar' ? <>الصق المعرّف <strong className="font-mono text-rose-600 dark:text-rose-400">1622725404</strong> وحوّل المبلغ المطلوب ({cryptoUsdtEquivalent}).</> : lang === 'fr' ? <>Collez l'ID <strong className="font-mono text-rose-600 dark:text-rose-400">1622725404</strong> et transférez le montant ({cryptoUsdtEquivalent}).</> : <>Paste ID <strong className="font-mono text-rose-600 dark:text-rose-400">1622725404</strong> and transfer ({cryptoUsdtEquivalent}).</>}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                          <span>{lang === 'ar' ? 'التقط لقطة شاشة للوصل (Screenshot) واضغط الزر أدناه لإرساله عبر تلغرام ليتم تفعيل حسابك فوراً.' : lang === 'fr' ? 'Prenez une capture du reçu et cliquez sur le bouton ci-dessous pour l\'envoyer sur Telegram.' : 'Take a screenshot of the receipt and click below to send it via Telegram for instant activation.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA for RedotPay via Telegram */}
                  <button
                    type="submit"
                    disabled={isSubmitting || isOutOfStock}
                    className={`w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2.5 transition-all ${
                      isOutOfStock
                        ? 'bg-red-600 hover:bg-red-700 text-white cursor-not-allowed shadow-md opacity-95'
                        : 'bg-[#0088cc] hover:bg-[#0077b5] text-white disabled:opacity-50 shadow-lg hover:shadow-[#0088cc]/30 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    {isOutOfStock ? (
                      <>
                        <Ban className="w-5 h-5" />
                        <span>{t('product.outOfStock')}</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{lang === 'ar' ? 'جاري تسجيل الطلب وتجهيز التلغرام...' : lang === 'fr' ? 'Enregistrement de la commande...' : 'Registering order & opening Telegram...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>{t('checkout.openTelegramBtn')}</span>
                      </>
                    )}
                  </button>
                </>
              )}

              {paymentMethod === 'binance' && (
                <>
                  {/* Binance Details Box */}
                  <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-900/40 space-y-4">
                    <div className="flex items-center justify-between border-b-2 border-amber-200 dark:border-amber-900/40 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[#F0B90B] flex items-center justify-center text-slate-950 font-black text-xs">
                          B
                        </div>
                        <h4 className="font-black text-sm text-black dark:text-white">
                          {lang === 'ar' ? 'بيانات التحويل عبر منصة Binance (بايننس)' : lang === 'fr' ? 'Détails du transfert Binance' : 'Binance Transfer Details'}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        {lang === 'ar' ? 'USDT مقبول' : 'USDT Accepted'}
                      </span>
                    </div>

                    {/* Method 1: Binance Pay UID */}
                    <div className="bg-white dark:bg-[#16181C] p-3.5 rounded-xl border-2 border-amber-200 dark:border-amber-900/40 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px]">1</span>
                          <span>{lang === 'ar' ? 'تحويل داخلي عبر Binance Pay (بدون رسوم 0%):' : lang === 'fr' ? 'Transfert interne Binance Pay (0% frais) :' : 'Internal transfer via Binance Pay (0% fee):'}</span>
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px]">{lang === 'ar' ? 'موصى به (أسرع)' : lang === 'fr' ? 'Recommandé (plus rapide)' : 'Recommended (fastest)'}</span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{lang === 'ar' ? 'Binance UID (المعرّف):' : 'Binance UID:'}</span>
                          <span className="font-mono text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 tracking-wider">
                            427636242
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyBinanceUid}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-200 font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border border-amber-300 dark:border-amber-800"
                        >
                          {copiedBinanceUid ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-400">{t('common.copied')}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{lang === 'ar' ? 'نسخ الـ UID' : 'Copy UID'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Method 2: USDT BEP20 Address */}
                    <div className="bg-white dark:bg-[#16181C] p-3.5 rounded-xl border-2 border-emerald-200 dark:border-[#2C2E33] space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">2</span>
                          <span>{lang === 'ar' ? 'إيداع USDT عبر الشبكة:' : lang === 'fr' ? 'Dépôt USDT sur le réseau :' : 'USDT Network Deposit:'}</span>
                        </span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-black px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-[10px] border border-emerald-200 dark:border-emerald-700">
                          BNB Smart Chain (BEP20) BSC
                        </span>
                      </div>

                      <div className="pt-1 space-y-1.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">{lang === 'ar' ? 'عنوان الإيداع (Deposit Address):' : 'Deposit Address:'}</span>
                        <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#1D1F24] border border-slate-300 dark:border-[#2C2E33] flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 break-all text-left dir-ltr select-all">
                            0xf0782cc454c9f0b273a11aba636fac62f18b24dd
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyBscAddress}
                            className="p-1.5 rounded-lg bg-white dark:bg-[#16181C] hover:bg-slate-100 dark:hover:bg-[#25272D] text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-[#2C2E33] shrink-0 transition-all active:scale-95 cursor-pointer"
                            title={lang === 'ar' ? 'نسخ عنوان المحفظة' : lang === 'fr' ? 'Copier l\'adresse' : 'Copy Wallet Address'}
                          >
                            {copiedBscAddress ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* QR Code toggle */}
                      <div className="pt-1 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => setShowQrModal(!showQrModal)}
                          className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? (showQrModal ? 'إخفاء رمز الـ QR' : 'عرض رمز الـ QR للمسح المباشر') : lang === 'fr' ? (showQrModal ? 'Masquer le QR code' : 'Afficher le QR code') : (showQrModal ? 'Hide QR Code' : 'Show QR Code for direct scan')}</span>
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
                    <div className="space-y-2 text-xs font-bold text-amber-950 dark:text-slate-300">
                      <p className="font-black text-black dark:text-white">{lang === 'ar' ? 'خطوات الإتمام السريعة:' : lang === 'fr' ? 'Étapes rapides :' : 'Quick Steps:'}</p>
                      <div className="space-y-1.5 pr-2">
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</span>
                          <span>{lang === 'ar' ? <>افتح تطبيق <strong>Binance</strong> واختر <strong>Pay</strong> (بالـ UID مجاناً) أو اسحب <strong>USDT</strong> على شبكة <strong>BEP20</strong>.</> : lang === 'fr' ? <>Ouvrez l'application <strong>Binance</strong> et choisissez <strong>Pay</strong> (via UID sans frais) ou retirez des <strong>USDT</strong> sur le réseau <strong>BEP20</strong>.</> : <>Open <strong>Binance</strong> and choose <strong>Pay</strong> (via UID with 0% fee) or transfer <strong>USDT</strong> on the <strong>BEP20</strong> network.</>}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</span>
                          <span>{lang === 'ar' ? <>حوّل المبلغ المطلوب ({cryptoUsdtEquivalent}).</> : lang === 'fr' ? <>Transférez le montant ({cryptoUsdtEquivalent}).</> : <>Transfer the required amount ({cryptoUsdtEquivalent}).</>}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[10px] shrink-0 mt-0.5">3</span>
                          <span>{lang === 'ar' ? 'التقط لقطة شاشة للوصل (Screenshot) واضغط الزر أدناه لإرساله عبر تلغرام للتفعيل الفوري.' : lang === 'fr' ? 'Prenez une capture du reçu et cliquez ci-dessous pour l\'envoyer sur Telegram pour une activation immédiate.' : 'Take a screenshot of the receipt and click below to send it via Telegram for instant activation.'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit CTA for Binance via Telegram */}
                  <button
                    type="submit"
                    disabled={isSubmitting || isOutOfStock}
                    className={`w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2.5 transition-all ${
                      isOutOfStock
                        ? 'bg-red-600 hover:bg-red-700 text-white cursor-not-allowed shadow-md opacity-95'
                        : 'bg-[#0088cc] hover:bg-[#0077b5] text-white disabled:opacity-50 shadow-lg hover:shadow-[#0088cc]/30 cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    {isOutOfStock ? (
                      <>
                        <Ban className="w-5 h-5" />
                        <span>{t('product.outOfStock')}</span>
                      </>
                    ) : isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>{lang === 'ar' ? 'جاري تسجيل الطلب وتجهيز التلغرام...' : lang === 'fr' ? 'Enregistrement de la commande...' : 'Registering order & opening Telegram...'}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>{t('checkout.openTelegramBtn')}</span>
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
