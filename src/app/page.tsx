'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, Zap, ShieldCheck, FileText, ChevronDown, PackageX, Check, LogIn, Search, X } from 'lucide-react';
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
  const urlQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      if (typeof e.detail === 'string') {
        setSearchQuery(e.detail);
      }
    };
    window.addEventListener('store-search-query', handleGlobalSearch);
    return () => window.removeEventListener('store-search-query', handleGlobalSearch);
  }, []);

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
    // 1. Live Instant Search Query Match (any character typed matches name, description, or type)
    const term = searchQuery.trim().toLowerCase();
    if (term) {
      const matchName = (p.name || '').toLowerCase().includes(term);
      const matchDesc = (p.description || '').toLowerCase().includes(term);
      const matchType = (p.type || '').toLowerCase().includes(term);
      if (!matchName && !matchDesc && !matchType) return false;
    }
    // 2. Tab Match
    if (activeTab === 'all') return true;
    if (activeTab === 'games') {
      return p.type === 'games' || (p.category && (p.category.includes('لعب') || p.category.includes('شحن')));
    }
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
        
        {/* Filter Bar & Live Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--store-border)] pb-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('all')}
              className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'all' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
            >
              {t('nav.all')}
            </button>
            <button 
              onClick={() => setActiveTab('digital')}
              className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'digital' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
            >
              {t('nav.digital')}
            </button>
            <button 
              onClick={() => setActiveTab('subscription')}
              className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'subscription' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
            >
              {t('nav.subs')}
            </button>
            <button 
              onClick={() => setActiveTab('games')}
              className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'games' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
            >
              🎮 شحن ألعاب
            </button>
          </div>

          {/* In-page Live Search Input */}
          <div className="relative w-full sm:w-80">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                window.dispatchEvent(new CustomEvent('store-search-query', { detail: val }));
                const url = new URL(window.location.href);
                if (val.trim()) {
                  url.searchParams.set('q', val);
                } else {
                  url.searchParams.delete('q');
                }
                window.history.replaceState({}, '', url.toString());
              }}
              placeholder="ابحث فوراً بالاسم أو الوصف..."
              className="w-full bg-[var(--store-card)] border border-[var(--store-border)] text-sm text-[var(--store-text)] rounded-xl px-4 py-2.5 pr-10 pl-8 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--store-text-muted)] shadow-xs"
            />
            <Search className="w-4 h-4 text-[var(--store-text-muted)] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button 
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  window.dispatchEvent(new CustomEvent('store-search-query', { detail: '' }));
                  const url = new URL(window.location.href);
                  url.searchParams.delete('q');
                  window.history.replaceState({}, '', url.toString());
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--store-text-muted)] hover:text-[var(--store-text)] p-1 rounded-full hover:bg-[var(--store-border)] transition-colors"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Search Result Indicator */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between text-xs text-[var(--store-text-muted)] bg-[var(--store-card)] border border-[var(--store-border)] px-4 py-2 rounded-xl">
            <span>نتائج البحث عن: <strong className="text-[var(--store-text)]">"{searchQuery}"</strong> ({filteredProducts.length} منتج)</span>
            <button 
              type="button"
              onClick={() => {
                setSearchQuery('');
                window.dispatchEvent(new CustomEvent('store-search-query', { detail: '' }));
                const url = new URL(window.location.href);
                url.searchParams.delete('q');
                window.history.replaceState({}, '', url.toString());
              }}
              className="text-emerald-500 hover:underline font-bold"
            >
              إلغاء التصفية
            </button>
          </div>
        )}
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
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[var(--store-bg)] border border-[var(--store-border)] flex items-center justify-center mx-auto text-[var(--store-text-muted)]">
              <Search className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[var(--store-text)]">لم يتم العثور على أي نتائج</h3>
              <p className="text-sm text-[var(--store-text-muted)]">
                {searchQuery ? `لا توجد منتجات تطابق "${searchQuery}"` : 'لا توجد منتجات متوفرة حالياً في هذا القسم'}
              </p>
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveTab('all');
                  window.dispatchEvent(new CustomEvent('store-search-query', { detail: '' }));
                  const url = new URL(window.location.href);
                  url.searchParams.delete('q');
                  window.history.replaceState({}, '', url.toString());
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>مسح البحث وعرض كل المنتجات</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => {
              const outOfStock = Boolean(
    product.status === 'out_of_stock' ||
    (product.stockType === 'numeric'
      ? (!product.unlimitedStock && typeof product.stock === 'number' && product.stock <= 0)
      : (product.stockLinks && Array.isArray(product.stockLinks) ? product.stockLinks.length === 0 : typeof product.stock === 'number' && product.stock <= 0))
  );
              
              return (
                <div key={product.id} className={`group store-card rounded-xl overflow-hidden`}>
                  <Link href={`/product/${product.id}`} className="block" aria-label={product.name}>
                    <div className="aspect-[4/3] bg-[var(--store-card)] relative overflow-hidden">
                      <img src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')} alt={product.name} loading="lazy" width={400} height={300} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                        <span className="bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2.5 py-1 rounded-md">
                          {product.category === 'شحن ألعاب' || product.type === 'games' ? '🎮 شحن ألعاب' : (product.type === 'digital' ? t('badge.digital') : t('badge.sub'))}
                        </span>
                      </div>

                    </div>
                  </Link>
                  <div className="p-4 space-y-3">
                    <Link href={`/product/${product.id}`}>
                      <h2 className="font-bold text-[var(--store-text)] text-sm line-clamp-2 min-h-[2.5rem] leading-snug hover:text-[var(--store-primary)] transition-colors" title={product.name}>{product.name}</h2>
                    </Link>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {product.priceUnspecified ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-xs sm:text-sm whitespace-nowrap bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          سعر غير محدد
                        </span>
                      ) : (
                        <span className="font-bold text-[var(--store-primary)] text-base sm:text-lg whitespace-nowrap">
                          {product.price} <span className="text-xs font-normal">د.ج</span>
                        </span>
                      )}
                      
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
                            <span>{product.priceUnspecified ? 'طلب شحن' : 'الشراء'}</span>
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
