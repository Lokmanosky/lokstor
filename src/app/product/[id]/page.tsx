'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { useCart } from '@/lib/cart-context';
import { 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  Download, 
  CreditCard, 
  Lock, 
  ShoppingCart, 
  Check, 
  Share2, 
  Heart,
  Sparkles
} from 'lucide-react';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { addToCart } = useCart();
  const [addedToCart, setAddedToCart] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [liked, setLiked] = useState(false);

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

  const isOutOfStock = (product.stock !== undefined && product.stock <= 0) || 
                       (product.stockLinks && product.stockLinks.length === 0);

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
          <div className="relative bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl overflow-hidden shadow-sm">
            <img
              src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
              alt={product.name}
              className="w-full h-auto max-h-[620px] object-cover object-center"
            />
            {/* Action buttons (Share & Like) */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-[var(--store-border)] flex items-center justify-center text-[var(--store-text)] hover:text-emerald-600 shadow-md transition-all active:scale-95 cursor-pointer"
                title="مشاركة رابط المنتج"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setLiked(!liked)}
                className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur border border-[var(--store-border)] flex items-center justify-center text-[var(--store-text)] hover:text-rose-500 shadow-md transition-all active:scale-95 cursor-pointer"
                title="إضافة للمفضلة"
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              </button>
            </div>
            {copiedLink && (
              <div className="absolute top-16 left-4 bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
                تم نسخ رابط المنتج!
              </div>
            )}
          </div>
        </div>

        {/* LEFT COLUMN: Details Card (Title, Price, Description, Actions) */}
        <div className="lg:col-span-5 bg-[var(--store-card)] border border-[var(--store-border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          {/* 1. Title */}
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--store-text)] leading-snug tracking-tight">
            {product.name}
          </h1>

          {/* 2. Price in Red / Bold */}
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-red-600 dark:text-red-500">
              {product.price.toLocaleString('en-US')}
            </span>
            <span className="text-xl font-black text-red-600 dark:text-red-500">
              د.ج
            </span>
          </div>

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
                href={isOutOfStock ? '#' : `/checkout/${product.id}`}
                className={`chargily-btn flex-1 py-4 px-6 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 shadow-lg transition-all ${
                  isOutOfStock ? 'opacity-50 pointer-events-none cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99]'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>{isOutOfStock ? 'نفذ المخزون حالياً' : `الشراء والدفع (${product.price} د.ج)`}</span>
              </Link>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="w-14 h-14 flex items-center justify-center rounded-2xl border-2 border-[var(--store-border)] hover:border-emerald-500 bg-[var(--store-bg)] text-[var(--store-text)] hover:text-emerald-500 transition-all shrink-0 disabled:opacity-50 cursor-pointer shadow-sm"
                title="إضافة إلى السلة"
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
    </div>
  );
}
