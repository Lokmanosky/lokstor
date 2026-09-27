'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, Zap, ShieldCheck, FileText, ChevronDown, PackageX, Check, LogIn } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { useTranslation } from '@/lib/i18n-context';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';

import { Suspense } from 'react';

function HomePageContent() {
  const [activeTab, setActiveTab] = useState('all');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  useEffect(() => {
    async function loadProducts() {
      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setProducts(list);
      } catch (e) {
        console.error("Failed to load products:", e);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const seedProducts = async () => {
    setLoading(true);
    const MOCK_PRODUCTS = [
      { id: '1', name: 'قالب سيرة ذاتية احترافي', price: 1500, type: 'digital', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&q=80', stock: 0, description: 'قالب سيرة ذاتية مميز واحترافي', status: 'published', createdAt: Date.now() },
      { id: '2', name: 'اشتراك نتفليكس شهر واحد', price: 2500, type: 'subscription', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80', stock: 0, description: 'اشتراك نتفليكس رسمي', status: 'published', createdAt: Date.now() - 1000 },
      { id: '3', name: 'كتاب تعلم البرمجة من الصفر', price: 900, type: 'digital', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80', stock: 0, description: 'كتاب شامل لتعلم البرمجة', status: 'published', createdAt: Date.now() - 2000 },
      { id: '4', name: 'اشتراك سبوتيفاي بريميوم', price: 1200, type: 'subscription', image: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=500&q=80', stock: 0, description: 'استمع بدون إعلانات', status: 'published', createdAt: Date.now() - 3000 },
    ];
    for (const p of MOCK_PRODUCTS) {
      const { id, ...data } = p;
      await setDoc(doc(db, 'products', id), data);
    }
    setProducts(MOCK_PRODUCTS);
    setLoading(false);
  };

  const filteredProducts = products.filter(p => {
    // 1. Search Query Match
    if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !(p.description || '').toLowerCase().includes(q.toLowerCase())) {
      return false;
    }
    // 2. Tab Match
    if (activeTab === 'all') return true;
    return p.type === activeTab;
  });

  return (
    <div className="pb-24">
      {/* 1. Hero Section */}
      <section className="pt-10 pb-8 px-4 border-b border-[var(--store-border)]">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--store-border)] text-xs font-medium text-[var(--store-text-muted)] bg-[var(--store-card)] shadow-sm">
            <span>{t('hero.badge')}</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black text-[var(--store-text)] tracking-tight leading-snug">
            <span className="block">
              {t('hero.title1')} <span className="text-[var(--store-primary)]">{t('hero.title2')}</span>
            </span>
            <span className="block mt-1 sm:mt-2">
              {t('hero.title3')}
            </span>
          </h1>
          
          <p className="text-[var(--store-text-muted)] text-lg max-w-2xl mx-auto leading-relaxed">
            {t('hero.desc')}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
              <span>{t('feat.instant')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('feat.secure')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              <FileText className="w-4 h-4" />
              <span>{t('feat.hq')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* Filter Bar */}
        <div className="flex items-center gap-6 border-b border-[var(--store-border)]">
          <button 
            onClick={() => setActiveTab('all')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'all' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            {t('nav.all')}
          </button>
          <button 
            onClick={() => setActiveTab('digital')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'digital' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            {t('nav.digital')}
          </button>
          <button 
            onClick={() => setActiveTab('subscription')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'subscription' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            {t('nav.subs')}
          </button>
        </div>

        {/* Development Seed Button */}
        {!loading && products.length === 0 && (
          <div className="text-center py-10">
            <button onClick={seedProducts} className="px-4 py-2 bg-emerald-500 text-white rounded-md font-medium text-sm">
              رفع المنتجات إلى قاعدة البيانات (Firestore)
            </button>
          </div>
        )}

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-64 bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const outOfStock = Boolean(
    (product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) ||
    (product.stockLinks && Array.isArray(product.stockLinks) && product.stockLinks.length === 0) ||
    product.status === 'out_of_stock'
  );
              
              return (
                <div key={product.id} className={`group store-card rounded-xl overflow-hidden`}>
                  <Link href={`/product/${product.id}`} className="block" aria-label={product.name}>
                    <div className="aspect-[4/3] bg-[var(--store-card)] relative overflow-hidden">
                      <img src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')} alt={product.name} loading="lazy" width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <span className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                          {product.type === 'digital' ? t('badge.digital') : t('badge.sub')}
                        </span>
                      </div>

                    </div>
                  </Link>
                  <div className="p-4 space-y-3">
                    <Link href={`/product/${product.id}`}>
                      <h2 className="font-bold text-[var(--store-text)] text-sm line-clamp-2 min-h-[2.5rem] leading-snug hover:text-[var(--store-primary)] transition-colors" title={product.name}>{product.name}</h2>
                    </Link>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="font-bold text-[var(--store-primary)] text-base sm:text-lg whitespace-nowrap">
                        {product.price} <span className="text-xs font-normal">د.ج</span>
                      </span>
                      
                      {outOfStock ? (
                        <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-md font-bold text-xs bg-red-500/10 border border-red-500/30 text-red-500 cursor-not-allowed">
                          <PackageX className="w-3.5 h-3.5" />
                          <span>تم نفاذ المخزون</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {/* زر الشراء المباشر -> يوجه مباشرة لصفحة الشراء والدفع */}
                          <Link
                            href={`/checkout/${product.id}`}
                            className="flex items-center justify-center px-3 py-1.5 rounded-md font-bold text-xs bg-[var(--store-primary)] text-[var(--store-bg)] hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                            title="الشراء المباشر والدفع الآن"
                          >
                            <span>الشراء</span>
                          </Link>

                          {/* أيقونة السلة منفصلة -> تضيف للسلة وتحدث العداد بالأعلى */}
                          <button
                            type="button"
                            onClick={() => {
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
                                type: product.type
                              });
                              setAddedProductId(product.id);
                              setTimeout(() => setAddedProductId(null), 1500);
                            }}
                            className={`p-1.5 rounded-md border text-xs font-bold transition-all flex items-center justify-center ${
                              addedProductId === product.id
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 scale-105'
                                : 'border-[var(--store-border)] bg-[var(--store-bg)] text-[var(--store-text)] hover:border-[var(--store-primary)] hover:text-[var(--store-primary)] hover:bg-[var(--store-card)]'
                            }`}
                            title="إضافة إلى السلة" aria-label={addedProductId === product.id ? "تمت الإضافة إلى السلة" : `إضافة ${product.name} إلى السلة`}
                          >
                            {addedProductId === product.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <ShoppingCart className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </section>

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


export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen"></div>}>
      <HomePageContent />
    </Suspense>
  );
}
