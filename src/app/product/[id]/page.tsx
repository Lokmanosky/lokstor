'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product, ProductVariant } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { 
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

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
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

  const handleAddToCart = () => {
    if (!product) return;
    if (!user) {
      setShowLoginToast(true);
      setTimeout(() => setShowLoginToast(false), 3500);
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: (product.imageUrl || product.image || '').replace(/^"+|"+$/g, ''),
      quantity: 1,
      type: product.fileType || 'ملف رقمي',
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
    (product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) ||
    (product.stockLinks && Array.isArray(product.stockLinks) && product.stockLinks.length === 0) ||
    product.status === 'out_of_stock'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-[var(--store-text-muted)]">
        <Link href="/" className="hover:text-[var(--store-text)] transition-colors">
          الرئيسية
        </Link>
        <span>›</span>
        {product.category && (
          <>
            <span className="hover:text-[var(--store-text)] transition-colors">{product.category}</span>
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
        <div className="lg:col-span-7 space-y-4">
          <div 
            onClick={() => {
              setIsImagePreviewOpen(true);
              setZoomLevel(1);
            }}
            className="group relative bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl overflow-hidden shadow-sm cursor-zoom-in transition-all hover:shadow-md bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center min-h-[300px]"
            title="انقر لاستعراض الصورة بالحجم الكامل"
          >
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              className="w-full h-auto max-h-[700px] object-contain object-center transition-transform duration-300 group-hover:scale-[1.01]"
            />
            {/* Hover overlay hint badge */}
            <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/85 hover:bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl backdrop-blur-md shadow-lg transition-all opacity-90 group-hover:opacity-100 group-hover:scale-105 pointer-events-none">
              <Maximize2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">استعراض وتكبير الصورة</span>
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Details Card (Title, Price, Description, Actions) */}
        <div className="lg:col-span-5 bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* 1. Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--store-text)] leading-snug tracking-tight">
            {product.name}
          </h1>

          {/* 2. Price Line with Share & Favorite Actions */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-500">
                {product.price.toLocaleString('en-US')}
              </span>
              <span className="text-xl font-black text-red-600 dark:text-red-500">
                د.ج
              </span>
            </div>

            {/* Favorite & Share Buttons in Price Row */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-xl border border-[var(--store-border)] hover:border-emerald-500 bg-[var(--store-bg)] flex items-center justify-center text-[var(--store-text)] hover:text-emerald-500 shadow-sm transition-all active:scale-95 cursor-pointer relative"
                title="مشاركة رابط المنتج"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                {copiedLink && (
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] px-2 py-0.5 rounded whitespace-nowrap shadow-md z-20">
                    تم النسخ!
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
                title="إضافة للمفضلة"
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Out of stock alert banner */}
          {isOutOfStock && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-sm font-black flex items-center gap-2.5">
              <Ban className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              <span>تم نفاذ المخزون من هذا المنتج حالياً</span>
            </div>
          )}

          {/* 3. Description */}
          <div className="pt-2 border-t border-[var(--store-border)]">
            <p className="text-[var(--store-text)] text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
              {product.description}
            </p>
          </div>

          {/* 4. Features */}
          {product.features && product.features.length > 0 && (
            <div className="pt-3 border-t border-[var(--store-border)] space-y-2.5">
              <h3 className="font-bold text-xs text-[var(--store-text-muted)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>المميزات المشمولة:</span>
              </h3>
              <div className="space-y-2">
                {product.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[var(--store-text)]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Purchase CTA Buttons */}
          <div className="pt-4 border-t border-[var(--store-border)] space-y-3">
            <div className="flex items-center gap-3">
              <Link
                href={isOutOfStock ? '#' : `/checkout/${product.id}${selectedVariant ? `?variant=${selectedVariant.id}` : ''}`}
                onClick={(e) => {
                  if (product.requiredFields && product.requiredFields.length > 0) {
                    const errors: Record<string, string> = {};
                    product.requiredFields.forEach(f => {
                      if (f.required && !customFieldsData[f.id]?.trim()) {
                        errors[f.id] = 'هذا الحقل مطلوب للشحن';
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
                <span>{isOutOfStock
                  ? 'تم نفاذ المخزون'
                  : selectedVariant
                  ? `الشراء والدفع (${selectedVariant.price.toLocaleString('en-US')} د.ج)`
                  : product.priceUnspecified
                  ? 'طلب الشحن والمتابعة'
                  : `الشراء والدفع (${product.price.toLocaleString('en-US')} د.ج)`}</span>
              </Link>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all shrink-0 shadow-sm ${
                  isOutOfStock
                    ? 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 text-red-400 cursor-not-allowed opacity-60'
                    : 'border-[var(--store-border)] hover:border-emerald-500 bg-[var(--store-bg)] text-[var(--store-text)] hover:text-emerald-500 cursor-pointer'
                }`}
                title={isOutOfStock ? 'المنتج غير متوفر في المخزون' : 'إضافة إلى السلة'}
              >
                {addedToCart ? (
                  <Check className="w-6 h-6 text-emerald-500" />
                ) : (
                  <ShoppingCart className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Badges / Guarantees */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[var(--store-text-muted)] pt-2 px-1">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                دفع إلكتروني آمن 100% عبر Chargily
              </span>
              <span className="flex items-center gap-1.5 font-semibold">
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                تحميل فوري وتلقائي بعد الدفع
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
          {/* Header Controls Bar */}
          <div 
            className="w-full max-w-6xl flex items-center justify-between text-white pb-3 px-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 max-w-[60%]">
              <span className="font-bold text-sm sm:text-base truncate text-slate-200">
                {product.name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom In */}
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.min(prev + 0.25, 3))}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="تكبير"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">تكبير</span>
              </button>

              {/* Zoom Out */}
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="تصغير"
              >
                <ZoomOut className="w-4 h-4" />
                <span className="hidden sm:inline">تصغير</span>
              </button>

              {/* Zoom Percentage indicator / Reset */}
              {zoomLevel !== 1 && (
                <button
                  type="button"
                  onClick={() => setZoomLevel(1)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer font-mono font-bold"
                  title="إعادة الحجم الأصلي"
                >
                  {Math.round(zoomLevel * 100)}% (إعادة ضبط)
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setIsImagePreviewOpen(false);
                  setZoomLevel(1);
                }}
                className="p-2.5 rounded-xl bg-white/15 hover:bg-rose-600 text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-bold mr-2"
                title="إغلاق (Esc)"
              >
                <X className="w-4 h-4" />
                <span>إغلاق</span>
              </button>
            </div>
          </div>

          {/* Image Viewport */}
          <div 
            className="relative flex-1 w-full max-w-6xl max-h-[82vh] flex items-center justify-center overflow-auto p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s ease-out' }}
              className="max-h-[80vh] max-w-[95vw] w-auto h-auto object-contain rounded-xl shadow-2xl transition-transform"
            />
          </div>

          {/* Bottom Hint */}
          <p className="text-slate-400 text-xs mt-3 select-none text-center">
            💡 يمكنك استخدام أزرار التكبير والتصغير أو النقر خارج الصورة للإغلاق (Esc)
          </p>
        </div>
      )}

      {/* Toast: Login required to add to cart */}
      {showLoginToast && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
          className="flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl shadow-black/30 border border-amber-500/30 bg-[#1c1200] text-amber-300 text-sm font-bold w-max"
        >
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
            <LogIn className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-amber-200 font-bold text-sm">يجب تسجيل الدخول أولاً</span>
            <span className="text-amber-400/80 text-xs font-medium">سجّل دخولك لإضافة المنتجات إلى سلتك</span>
          </div>
        </div>
      )}
    </div>
  );
}
