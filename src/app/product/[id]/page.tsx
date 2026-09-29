'use client';

import { use, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, query, collection, where, onSnapshot, addDoc } from 'firebase/firestore';
import { Product, ProductVariant, GameFieldRequirement } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { Star, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  CreditCard, 
  Lock, 
  Ban, 
  ShoppingCart, 
  Check, 
  Share2, 
  Heart, 
  Sparkles, 
  Maximize2, 
  X, 
  ZoomIn, 
  ZoomOut, 
  LogIn, 
  Gamepad2, 
  Layers 
} from 'lucide-react';

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

const DEFAULT_COD_FIELDS: GameFieldRequirement[] = [
  { id: 'game_email', label: 'E-Mail (البريد الإلكتروني للعبة Call Of Duty)', placeholder: 'Call Of Duty / Activision Email', required: true, type: 'text' },
  { id: 'game_password', label: 'Password (كلمة المرور)', placeholder: 'أدخل كلمة مرور الحساب', required: true, type: 'password' },
];

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
  const { t, lang } = useTranslation();

  const getCategoryName = (cat?: string) => {
    if (!cat) return '';
    if (cat.includes('ألعاب') || cat.toLowerCase().includes('game')) return t('category.games');
    if (cat.includes('رقمية') || cat.toLowerCase().includes('digital')) return t('category.digital');
    if (cat.includes('اشتراك') || cat.toLowerCase().includes('sub')) return t('category.subs');
    return cat;
  };

  const getFieldLabel = (field: GameFieldRequirement) => {
    if (lang === 'ar') return field.label;
    if (field.id === 'game_email' || field.label.includes('البريد')) return t('field.gameEmail');
    if (field.id === 'game_password' || field.label.includes('كلمة المرور')) return t('field.gamePassword');
    if (field.id === 'player_id' || field.label.includes('معرف')) return t('field.playerId');
    return field.label;
  };

  const getFieldPlaceholder = (field: GameFieldRequirement) => {
    if (lang === 'ar') return field.placeholder || `أدخل ${field.label}...`;
    if (field.id === 'game_email') return 'Call Of Duty / Activision Email';
    if (field.id === 'game_password') return lang === 'fr' ? 'Entrez le mot de passe' : 'Enter account password';
    if (field.id === 'player_id') return lang === 'fr' ? 'Entrez votre Player ID' : 'Enter Player ID';
    return lang === 'fr' ? `Entrez ${getFieldLabel(field)}...` : `Enter ${getFieldLabel(field)}...`;
  };
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Variants & Game recharge states
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImagePreviewOpen(false);
        setZoomLevel(1);
      }
    };
    if (isImagePreviewOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isImagePreviewOpen]);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() } as Product);
        } else {
          const seed = INITIAL_PRODUCTS.find((p) => p.id === productId);
          if (seed) setProduct(seed);
        }
      } catch (err) {
        const seed = INITIAL_PRODUCTS.find((p) => p.id === productId);
        if (seed) setProduct(seed);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [productId]);

  // Determine active variants (from Firestore or default fallback for game recharge products)
  const isGameProduct = Boolean(
    (product?.category && (product.category.includes('لعب') || product.category.includes('شحن'))) ||
    product?.type === 'games' ||
    (product?.name && (product.name.toLowerCase().includes('cod') || product.name.toLowerCase().includes('call of duty') || product.name.toLowerCase().includes('شدات') || product.name.toLowerCase().includes('نقاط')))
  );

  const activeVariants: ProductVariant[] = useMemo(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants;
    }
    if (isGameProduct) {
      return DEFAULT_COD_VARIANTS;
    }
    return [];
  }, [product, isGameProduct]);

  const activeRequiredFields: GameFieldRequirement[] = useMemo(() => {
    if (product?.requiredFields && product.requiredFields.length > 0) {
      return product.requiredFields;
    }
    if (isGameProduct) {
      return DEFAULT_COD_FIELDS;
    }
    return [];
  }, [product, isGameProduct]);

  useEffect(() => {
    if (activeVariants.length > 0 && !selectedVariant) {
      setSelectedVariant(activeVariants[0]);
    }
  }, [activeVariants, selectedVariant]);

  const handleAddToCart = () => {
    if (!product) return;
    if (!user) {
      setShowLoginToast(true);
      setTimeout(() => setShowLoginToast(false), 3500);
      return;
    }
    const finalPrice = selectedVariant ? selectedVariant.price : product.price;
    const finalName = selectedVariant ? `${product.name} (${selectedVariant.name})` : product.name;
    addToCart({
      id: product.id,
      name: finalName,
      price: finalPrice,
      imageUrl: (product.imageUrl || product.image || '').replace(/^"+|"+$/g, ''),
      quantity: 1,
      type: product.fileType || 'شحن رصيد ألعاب',
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
  };

    // ─── REVIEWS STATE ──────────────────────────
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '', name: user?.displayName || '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (!product) return;
    const q = query(collection(db, 'reviews'), where('productId', '==', product.id), where('status', '==', 'approved'));
    const unsub = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      // also sort by date desc locally
      data.sort((a,b) => b.createdAt - a.createdAt);
      setReviews(data);
    });
    return () => unsub();
  }, [product]);

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReview.name.trim() || !newReview.comment.trim()) return alert('يرجى كتابة الاسم والتعليق');
    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        productId: product?.id,
        customerName: newReview.name,
        rating: newReview.rating,
        comment: newReview.comment,
        status: 'pending',
        createdAt: Date.now()
      });
      setReviewSubmitted(true);
      setNewReview({ rating: 5, comment: '', name: user?.displayName || '' });
    } catch (err) {
      console.error(err);
      alert('حدث خطأ');
    }
    setIsSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-4" />
        <p className="text-[var(--store-text-muted)] text-sm font-semibold">جاري جلب تفاصيل المنتج...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-12 my-12 shadow-sm">
        <h2 className="text-2xl font-bold text-[var(--store-text)] mb-4">المنتج غير موجود</h2>
        <p className="text-[var(--store-text-muted)] text-sm mb-6">عذراً، لم نتمكن من العثور على المنتج المطلوب.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </Link>
      </div>
    );
  }


  const isOutOfStock = Boolean(
    product.status === 'out_of_stock' ||
    (product.stockType === 'numeric'
      ? (!product.unlimitedStock && typeof product.stock === 'number' && product.stock <= 0)
      : (product.stockLinks && Array.isArray(product.stockLinks) ? product.stockLinks.length === 0 : typeof product.stock === 'number' && product.stock <= 0))
  );

  const displayPrice = selectedVariant ? selectedVariant.price : product.price;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[var(--store-text-muted)]">
        <Link href="/" className="hover:text-[var(--store-text)] transition-colors">
          {t('common.home')}
        </Link>
        <span>›</span>
        {product.category && (
          <>
            <Link href={`/?tab=${product.category}`} className="hover:text-[var(--store-text)] transition-colors">{getCategoryName(product.category)}</Link>
            <span>›</span>
          </>
        )}
        <span className="text-[var(--store-text)] font-bold truncate max-w-xs sm:max-w-md">
          {product.name}
        </span>
      </nav>

      {/* Main 2-Column Section: Image on Right, Details on Left (in RTL) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* RIGHT COLUMN: Product Image */}
        <div className="lg:col-span-5 space-y-4">
          <div 
            onClick={() => {
              setIsImagePreviewOpen(true);
              setZoomLevel(1);
            }}
            className="group relative bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl overflow-hidden shadow-sm cursor-zoom-in transition-all hover:shadow-md bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center min-h-[300px]"
            title={t('product.zoomHint')}
          >
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              className="w-full h-auto max-h-[500px] object-contain object-center transition-transform duration-300 group-hover:scale-[1.01]"
            />
            {/* Hover overlay hint badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/85 hover:bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl backdrop-blur-md shadow-lg transition-all opacity-90 group-hover:opacity-100 group-hover:scale-105 pointer-events-none">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{t('product.zoomHint')}</span>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Details Card (Title, Price, Variants Grid, Game Fields, CTA) */}
        <div className="lg:col-span-7 bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
          {/* 1. Title */}
          <h1 className="text-xl sm:text-2xl font-black text-[var(--store-text)] leading-snug tracking-tight">
            {product.name}
          </h1>
          {/* Average Rating */}
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center text-amber-400">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= (reviews.length > 0 ? Math.round(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) : 5) ? 'fill-current' : 'text-[var(--store-border)]'}`} />
              ))}
            </div>
            <span className="text-sm font-bold text-[var(--store-text-muted)]">({reviews.length} تقييم)</span>
          </div>

          {/* 2. Price Line with Share & Favorite Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-500 tracking-tight">
                    {displayPrice.toLocaleString('en-US')}
                  </span>
                  <span className="text-xl font-black text-emerald-500">
                    {t('common.currency')}
                  </span>
                </div>
                {/* Discount Badge */}
                {(!selectedVariant || !selectedVariant.originalPrice) && product.originalPrice && product.originalPrice > product.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[var(--store-text-muted)] line-through decoration-red-500/60 decoration-2">
                      {product.originalPrice} د.ج
                    </span>
                    <span className="bg-red-500/10 text-red-500 text-xs font-bold px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                      وفر {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% 🔥
                    </span>
                  </div>
                )}
                {selectedVariant && selectedVariant.originalPrice && selectedVariant.originalPrice > selectedVariant.price && (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[var(--store-text-muted)] line-through decoration-red-500/60 decoration-2">
                      {selectedVariant.originalPrice} د.ج
                    </span>
                    <span className="bg-red-500/10 text-red-500 text-xs font-bold px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                      وفر {Math.round(((selectedVariant.originalPrice - selectedVariant.price) / selectedVariant.originalPrice) * 100)}% 🔥
                    </span>
                  </div>
                )}
              </div>
              {selectedVariant && (
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mt-0.5">
                  {t('product.selectedPackage')} {selectedVariant.name}
                </span>
              )}
            </div>

            {/* Favorite & Share Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-xl border border-[var(--store-border)] hover:border-emerald-500 bg-[var(--store-bg)] flex items-center justify-center text-[var(--store-text)] hover:text-emerald-500 shadow-sm transition-all active:scale-95 cursor-pointer relative"
                title={t('product.shareTooltip')}
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                {copiedLink && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] px-2 py-0.5 rounded whitespace-nowrap shadow-md z-20">
                    {t('common.copied')}
                  </span>
                )}
              </button>

              <button
                onClick={() => setLiked(!liked)}
                className={`w-10 h-10 rounded-xl border border-[var(--store-border)] bg-[var(--store-bg)] flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer ${
                  liked 
                    ? 'border-rose-500 text-rose-500 bg-rose-50 dark:bg-rose-950/30' 
                    : 'text-[var(--store-text)] hover:text-rose-500 hover:border-rose-400'
                }`}
                title={t('product.favTooltip')}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Out of stock or low stock alert banner */}
          {isOutOfStock ? (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-black flex items-center gap-2.5">
              <Ban className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{t('product.outOfStockAlert')}</span>
            </div>
          ) : !Boolean(product.unlimitedStock || (product.stockType === 'numeric' && product.unlimitedStock)) && 
             (product.stockType === 'numeric' ? (product.stock || 0) : (product.stockLinks ? product.stockLinks.length : (product.stock || 0))) < 20 && (
            <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
              <span>
                {lang === 'ar' ? 'الكمية محدودة: متبقي ' : 'Limited quantity: only '}
                <strong className="text-sm font-black text-red-600 dark:text-red-400 underline mx-1">
                  {product.stockType === 'numeric' ? (product.stock || 0) : (product.stockLinks ? product.stockLinks.length : (product.stock || 0))}
                </strong>
                {lang === 'ar' ? 'قطع فقط في المخزون ⚡' : 'items left in stock ⚡'}
              </span>
            </div>
          )}

          {/* ── 3. Box: اختر ما يناسبك (Variant Cards Grid) ── */}
          {activeVariants.length > 0 && (
            <div className="pt-3 border-t border-[var(--store-border)] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-black text-[var(--store-text)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{t('product.choosePackage')}</span>
                </h3>
                {selectedVariant && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {selectedVariant.name}
                  </span>
                )}
              </div>

              {/* Grid of Variants (2 Columns like DzairPay competitor layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {activeVariants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-right cursor-pointer group ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 ring-2 ring-indigo-500/40 shadow-sm'
                          : 'border-[var(--store-border)] bg-[var(--store-bg)] hover:border-indigo-400 hover:bg-[var(--store-card)]'
                      }`}
                    >
                      {/* Left: Price in DA */}
                      <div className="flex flex-col items-start">
                        <span className={`text-sm font-black ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--store-text)]'}`}>
                          {v.price.toLocaleString('en-US')} <span className="text-xs font-bold">{t('common.currency')}</span>
                        </span>
                        {v.originalPrice && v.originalPrice > v.price && (
                          <span className="text-[10px] text-[var(--store-text-muted)] line-through">
                            {v.originalPrice.toLocaleString('en-US')} {t('common.currency')}
                          </span>
                        )}
                      </div>

                      {/* Right: Icon + Variant Name */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs sm:text-sm ${isSelected ? 'font-black text-indigo-950 dark:text-white' : 'font-bold text-[var(--store-text)]'}`}>
                          {v.name}
                        </span>
                        {v.image ? (
                          <img
                            src={v.image}
                            alt=""
                            className="w-7 h-7 rounded-lg object-contain shrink-0 bg-black/5 p-0.5 border border-[var(--store-border)] shadow-sm"
                          />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 4. Required Game Account Info Inputs ── */}
          {activeRequiredFields.length > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-[var(--store-text)] flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-indigo-500" />
                  <span>{t('product.requiredGameInfo')}</span>
                </h3>
                <span className="text-[10px] text-[var(--store-text-muted)]">{t('product.confidential')}</span>
              </div>
              <div className="space-y-2.5">
                {activeRequiredFields.map((field) => (
                  <div key={field.id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[var(--store-text)]">
                        {getFieldLabel(field)} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {fieldErrors[field.id] && (
                        <span className="text-[11px] text-rose-500 font-bold">{fieldErrors[field.id] || t('product.fieldRequired')}</span>
                      )}
                    </div>
                    <input
                      type={field.type || 'text'}
                      value={customFieldsData[field.id] || ''}
                      onChange={(e) => {
                        setCustomFieldsData(prev => ({ ...prev, [field.id]: e.target.value }));
                        if (fieldErrors[field.id]) {
                          setFieldErrors(prev => ({ ...prev, [field.id]: '' }));
                        }
                      }}
                      placeholder={getFieldPlaceholder(field)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[var(--store-border)] bg-[var(--store-bg)] text-xs text-[var(--store-text)] font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Description ── */}
          {product.description && (
            <div className="pt-2 border-t border-[var(--store-border)]">
              <p className="text-[var(--store-text)] text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium text-neutral-400">
                {product.description}
              </p>
            </div>
          )}

          {/* ── 6. Features ── */}
          {product.features && product.features.length > 0 && (
            <div className="pt-3 border-t border-[var(--store-border)] space-y-2">
              <h3 className="font-bold text-xs text-[var(--store-text-muted)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('product.features')}</span>
              </h3>
              <div className="space-y-1.5">
                {product.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-[var(--store-text)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 7. Purchase CTA Buttons ── */}
          <div className="pt-3 border-t border-[var(--store-border)] space-y-3">
            <div className="flex items-center gap-3">
              <Link
                href={isOutOfStock ? '#' : `/checkout/${product.id}${selectedVariant ? `?variant=${selectedVariant.id}` : ''}`}
                onClick={(e) => {
                  if (activeRequiredFields.length > 0) {
                    const errors: Record<string, string> = {};
                    activeRequiredFields.forEach(f => {
                      if (f.required && !customFieldsData[f.id]?.trim()) {
                        errors[f.id] = t('product.fieldRequired');
                      }
                    });
                    if (Object.keys(errors).length > 0) {
                      e.preventDefault();
                      setFieldErrors(errors);
                      return;
                    }
                  }
                  if (typeof window !== 'undefined') {
                    sessionStorage.setItem('lokstor_game_info', JSON.stringify(customFieldsData));
                  }
                }}
                className={`flex-1 py-4 px-6 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isOutOfStock
                    ? 'bg-red-600 hover:bg-red-700 cursor-not-allowed opacity-95 shadow-red-500/20 pointer-events-none'
                    : 'chargily-btn hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                }`}
                aria-disabled={isOutOfStock}
              >
                {isOutOfStock ? <Ban className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
                <span>
                  {isOutOfStock
                    ? t('product.outOfStock')
                    : selectedVariant
                    ? `${t('product.buyAndPay')} (${selectedVariant.price.toLocaleString('en-US')} ${t('common.currency')})`
                    : `${t('product.buyAndPay')} (${product.price.toLocaleString('en-US')} ${t('common.currency')})`}
                </span>
              </Link>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all shrink-0 shadow-sm ${
                  isOutOfStock
                    ? 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-400 cursor-not-allowed opacity-60'
                    : 'border-[var(--store-border)] hover:border-emerald-500 bg-[var(--store-bg)] text-[var(--store-text)] hover:text-emerald-500 cursor-pointer'
                }`}
                title={isOutOfStock ? t('product.outOfStockTooltip') : t('product.addToCart')}
              >
                {addedToCart ? (
                  <Check className="w-6 h-6 text-emerald-500" />
                ) : (
                  <ShoppingCart className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Badges / Guarantees */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--store-text-muted)] pt-1 px-1">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {t('product.guaranteeSecure')}
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                {t('product.guaranteeInstant')}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {isImagePreviewOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-200"
          onClick={() => {
            setIsImagePreviewOpen(false);
            setZoomLevel(1);
          }}
        >
          {/* Controls Bar */}
          <div 
            className="absolute top-4 left-4 right-4 flex items-center justify-between z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-white text-xs font-semibold bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
              {product.name}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 3))}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 0.5))}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setIsImagePreviewOpen(false);
                  setZoomLevel(1);
                }}
                className="w-10 h-10 rounded-full bg-rose-500/80 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image Container with Zoom */}
          <div 
            className="w-full h-full flex items-center justify-center overflow-auto p-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              style={{ transform: `scale(${zoomLevel})` }}
              className="max-w-full max-h-[85vh] object-contain transition-transform duration-200 shadow-2xl rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* LOGIN REQUIRED FLOATING NOTIFICATION TOAST */}
      {showLoginToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-900 border border-neutral-700 text-white px-5 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
          <LogIn className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{t('product.loginToast')}</span>
          <Link
            href="/register"
            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-colors"
          >
            {t('product.loginBtn')}
          </Link>
        </div>
      )}

      {/* ── REVIEWS SECTION ── */}
      <div className="mt-12 bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-6 sm:p-8 space-y-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-[var(--store-text)] flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            تقييمات المنتج ({reviews.length})
          </h2>
        </div>

        {/* Submit Review Form */}
        {reviewSubmitted ? (
          <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 p-4 rounded-xl flex items-center gap-3 font-bold">
            <Check className="w-5 h-5" />
            شكراً لتقييمك! سيظهر تقييمك بعد مراجعته من قبل الإدارة.
          </div>
        ) : (
          <form onSubmit={submitReview} className="bg-[var(--store-bg)] border border-[var(--store-border)] p-5 rounded-2xl space-y-4">
            <h3 className="font-bold text-[var(--store-text)]">أضف تقييمك</h3>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setNewReview({ ...newReview, rating: star })}
                  className="focus:outline-none transition-transform hover:scale-110"
                >
                  <Star className={`w-6 h-6 ${star <= newReview.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--store-border)]'}`} />
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="اسمك"
                required
                value={newReview.name}
                onChange={e => setNewReview({...newReview, name: e.target.value})}
                className="w-full bg-[var(--store-card)] border border-[var(--store-border)] text-sm text-[var(--store-text)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--store-primary)]"
              />
              <input 
                type="text" 
                placeholder="شاركنا رأيك بالمنتج..."
                required
                value={newReview.comment}
                onChange={e => setNewReview({...newReview, comment: e.target.value})}
                className="w-full bg-[var(--store-card)] border border-[var(--store-border)] text-sm text-[var(--store-text)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--store-primary)]"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmittingReview}
              className="px-6 py-2.5 bg-[var(--store-primary)] text-[var(--store-bg)] font-bold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
            >
              {isSubmittingReview ? 'جاري الإرسال...' : 'نشر التقييم'}
            </button>
          </form>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {reviews.map((r, i) => (
              <div key={i} className="bg-[var(--store-bg)] border border-[var(--store-border)] p-5 rounded-2xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-emerald-500 overflow-hidden">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(r.customerName)}&background=10b981&color=fff&size=128`} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[var(--store-text)]">{r.customerName}</h4>
                      <span className="text-[10px] text-[var(--store-text-muted)]">تم التحقق من الشراء ✓</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  {[1,2,3,4,5].map(star => (
                    <Star key={star} className={`w-3.5 h-3.5 ${star <= r.rating ? 'fill-current' : 'text-[var(--store-border)]'}`} />
                  ))}
                </div>
                <p className="text-sm text-[var(--store-text-muted)] font-medium leading-relaxed">
                  "{r.comment}"
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-[var(--store-text-muted)] font-bold text-sm">لا توجد تقييمات حتى الآن. كن أول من يقيّم هذا المنتج!</p>
          </div>
        )}
      </div>
    </div>
  );
}
