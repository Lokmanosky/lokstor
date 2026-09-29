'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, Zap, ShieldCheck, FileText, ChevronDown, PackageX, Check, LogIn, Search, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, onSnapshot, query, orderBy, doc, setDoc } from 'firebase/firestore';
import { useTranslation } from '@/lib/i18n-context';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';

import { Suspense } from 'react';
import { TopTicker } from './client-layout';
import { Star as StarIcon, Quote } from 'lucide-react';

function ReviewsCarousel() {
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    // Fetch approved reviews from all products
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: any[] = [];
      snap.forEach(d => {
        const r = d.data();
        if (r.status === 'approved') {
          data.push({ id: d.id, ...r });
        }
      });
      setReviews(data);
    });
    return () => unsub();
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 mb-12">
      <div className="flex items-center gap-2 mb-6">
        <h2 className="text-2xl font-black text-[var(--store-text)]">قالوا عن متجرنا</h2>
      </div>
      
      <div className="relative overflow-x-auto pb-4 group custom-scrollbar">
        <div 
          className="flex gap-4 sm:gap-6 w-max"
          
        >
          {/* Double the array to create seamless infinite scroll */}
          {reviews.map((review, i) => (
            <div key={`${review.id}-${i}`} className="w-72 sm:w-80 shrink-0 bg-[#161b22] border border-[#30363d] rounded-3xl p-6 relative flex flex-col">
              <Quote className="absolute top-4 left-4 w-10 h-10 text-slate-700/50" />
              <div className="flex flex-col items-center mb-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 border-[3px] border-emerald-500 overflow-hidden mb-3">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(review.customerName)}&background=10b981&color=fff&size=128`} alt="avatar" className="w-full h-full object-cover" />
                </div>
                <h3 className="font-bold text-white text-lg">{review.customerName}</h3>
                <div className="flex items-center gap-1 mt-1 text-amber-400">
                  {[1,2,3,4,5].map(star => (
                    <StarIcon key={star} className={`w-4 h-4 ${star <= review.rating ? 'fill-current' : 'text-slate-600'}`} />
                  ))}
                </div>
              </div>
              <p className="text-slate-300 text-center text-sm leading-relaxed font-medium">"{review.comment}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


function BannersCarousel({ banners, children }: { banners: any[], children?: React.ReactNode }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % banners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <div className="relative w-full max-w-7xl mx-auto mb-0 sm:mt-4 rounded-none sm:rounded-2xl overflow-hidden shadow-2xl sm:aspect-[24/9] md:aspect-[28/9] bg-black">
      {banners.map((b, i) => (
        <div 
          key={b.id} 
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          {/* Blurred Background */}
          <div 
            className="absolute inset-0 bg-center bg-cover blur-2xl scale-125 opacity-50" 
            style={{ backgroundImage: `url('${b.imageUrl}')` }}
          />
          {/* Main Image */}
          <Link href={b.link || '#'}>
            <img 
              src={b.imageUrl} 
              alt="Banner" 
              className="absolute inset-0 w-full h-full object-contain drop-shadow-2xl" 
            />
          </Link>
        </div>
      ))}
      
      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-black/60 z-20 pointer-events-none" />

      {/* Children Content (Hero text) - Relative on mobile to expand parent dynamically! */}
      {children && (
        <div className="relative sm:absolute sm:inset-0 z-30 flex items-center justify-center p-4 py-6 sm:py-4 w-full">
          <div className="w-full text-center">
            {children}
          </div>
        </div>
      )}
      
      {/* Navigation Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 flex gap-2 bg-black/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'storeBanners'), snap => {
      const list: any[] = [];
      snap.forEach(d => {
          const data = d.data();
          if (data.status === 'draft' || data.status === 'archived') return;
          list.push({ id: d.id, ...data });
        });
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setBanners(list);
    });
    return () => unsub();
  }, []);

  const [loading, setLoading] = useState(true);
  const [storeCategories, setStoreCategories] = useState<{id:string;name:string;slug:string;emoji?:string;sortOrder:number}[]>([]);
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const { user } = useAuth();
  const urlQuery = searchParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(urlQuery);

  // Sync tab and search query from URL search params
  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    const currentTab = searchParams.get('tab');
    if (currentTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  // Listen to custom category and search events from navbar / sidebar
  useEffect(() => {
    const handleCategorySelect = (e: any) => {
      if (typeof e.detail === 'string') {
        const tab = e.detail;
        setActiveTab(tab);
        setSearchQuery('');
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        if (tab === 'all') {
          url.searchParams.delete('tab');
        } else {
          url.searchParams.set('tab', tab);
        }
        window.history.replaceState({}, '', url.toString());
      }
    };

    const handleGlobalSearch = (e: any) => {
      if (typeof e.detail === 'string') {
        setSearchQuery(e.detail);
      }
    };

    window.addEventListener('store-category-select', handleCategorySelect);
    window.addEventListener('store-search-query', handleGlobalSearch);
    return () => {
      window.removeEventListener('store-category-select', handleCategorySelect);
      window.removeEventListener('store-search-query', handleGlobalSearch);
    };
  }, []);

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    if (tab === 'all') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Load custom categories from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'storeCategories'), snap => {
      const list: {id:string;name:string;slug:string;emoji?:string;sortOrder:number}[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as any));
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      setStoreCategories(list);
    });
    return () => unsub();
  }, []);

    useEffect(() => {
    async function loadProducts() {
      try {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => { const data = d.data(); if (data.status === 'draft' || data.status === 'archived') return; list.push({ id: d.id, ...data }); });
        // Sort by admin-set sortOrder, fallback to createdAt desc
        list.sort((a, b) => {
          const aO = typeof a.sortOrder === 'number' ? a.sortOrder : 999999;
          const bO = typeof b.sortOrder === 'number' ? b.sortOrder : 999999;
          if (aO !== bO) return aO - bO;
          const aT = typeof a.createdAt === 'number' ? a.createdAt : Number(a.createdAt || 0);
          const bT = typeof b.createdAt === 'number' ? b.createdAt : Number(b.createdAt || 0);
          return bT - aT;
        });
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
    // 2. Tab Match with smart type & category matching
    if (activeTab === 'all') return true;
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    if (activeTab === 'games') {
      return p.type === 'games' || cat.includes('لعب') || cat.includes('شحن');
    }
    if (activeTab === 'digital') {
      return p.type === 'digital' || cat.includes('رقمي') || cat.includes('كتب') || cat.includes('قوالب') || cat.includes('دورات');
    }
    if (activeTab === 'subscription') {
      return p.type === 'subscription' || cat.includes('اشتراك');
    }
    // Also match against dynamic storeCategories slugs
    const matchingCat = storeCategories.find(c => c.slug === activeTab);
    if (matchingCat) {
      return p.type === activeTab || (p.category || '').toLowerCase().includes(activeTab.toLowerCase()) || p.category === matchingCat.name;
    }
    return p.type === activeTab || p.category === activeTab;
  });

  return (
    <div className="pb-24">
      <style>{
        `
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-100% / 3)); }
        }
        `
      }</style>

      
      {/* 1. Hero Section / Banners */}
      {banners.length > 0 ? (
        <>
        <BannersCarousel banners={banners}>
          <div className="max-w-4xl mx-auto text-center space-y-3 sm:space-y-4 pointer-events-none drop-shadow-lg scale-90 sm:scale-100">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 text-xs font-medium text-white/90 bg-black/40 backdrop-blur-md shadow-sm">
              <span>{t('hero.badge')}</span>
            </div>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-snug">
              <span className="block">
                {t('hero.title1')} <span className="text-[var(--store-primary)] drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{t('hero.title2')}</span>
              </span>
              <span className="block mt-1 sm:mt-2">
                {t('hero.title3')}
              </span>
            </h1>
            
            
            <p className="text-xs sm:text-base md:text-lg text-white/80 max-w-xl sm:max-w-2xl mx-auto font-medium leading-relaxed">
              {t('hero.desc')}
            </p>
            
            {/* Feature Badges */}
            <div className="pt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base text-white/90 font-bold drop-shadow-md">
              <div className="flex items-center gap-2 text-[#fbbf24]">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>تسليم تلقائي وفوري</span>
              </div>
              <div className="flex items-center gap-2 text-[#00e676]">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>دفع عبر بوابة Chargily</span>
              </div>
              <div className="flex items-center gap-2 text-[#818cf8]">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>ملفات أصلية عالية الجودة</span>
              </div>
            </div>
          </div>
        </BannersCarousel>
        <div className="max-w-7xl mx-auto mb-8 sm:mt-2">
          <div className="sm:rounded-xl overflow-hidden border-y sm:border-[var(--store-border)]">
            <TopTicker />
          </div>
        </div>
        </>
      ) : (
        <>
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
            
            
            <p className="text-sm sm:text-lg text-[var(--store-text-muted)] max-w-2xl mx-auto font-medium leading-relaxed">
              {t('hero.desc')}
            </p>
            
            {/* Feature Badges */}
            <div className="pt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm sm:text-base text-[var(--store-text-muted)] font-bold">
              <div className="flex items-center gap-2 text-[#f59e0b]">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>تسليم تلقائي وفوري</span>
              </div>
              <div className="flex items-center gap-2 text-[#00c853]">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>دفع عبر بوابة Chargily</span>
              </div>
              <div className="flex items-center gap-2 text-[#6366f1]">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>ملفات أصلية عالية الجودة</span>
              </div>
            </div>
          </div>
        </section>
        <div className="border-b border-[var(--store-border)]">
          <TopTicker />
        </div>
        </>
      )}

      {/* 2. Products Section */}
      <section id="products-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        
        {/* Filter Bar & Live Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--store-border)] pb-3">
          {/* Category Tabs — dynamic from Firestore */}
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => selectTab('all')}
              className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'all' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
            >
              {t('nav.all')}
            </button>
            {storeCategories.length > 0 ? storeCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => selectTab(cat.slug)}
                className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === cat.slug ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
              >
                {cat.emoji && <span className="ml-1">{cat.emoji}</span>}{cat.name}
              </button>
            )) : (
              <>
                <button onClick={() => selectTab('digital')} className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'digital' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}>{t('nav.digital')}</button>
                <button onClick={() => selectTab('subscription')} className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'subscription' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}>{t('nav.subs')}</button>
                <button onClick={() => selectTab('games')} className={`pb-2 text-sm font-bold transition-colors border-b-2 whitespace-nowrap ${activeTab === 'games' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}>🎮 شحن ألعاب</button>
              </>
            )}
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

        {/* ── Product Display: Sectioned by category ──────────────────────── */}
        {loading ? (
          <div className="space-y-10">
            {[1, 2, 3].map(s => (
              <div key={s} className="space-y-3">
                <div className="h-7 w-36 bg-[var(--store-card)] border border-[var(--store-border)] rounded-lg animate-pulse" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="rounded-2xl bg-[var(--store-card)] border border-[var(--store-border)] animate-pulse" style={{aspectRatio:'1'}} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl space-y-4">
            <Search className="w-8 h-8 mx-auto text-emerald-500 opacity-60" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-[var(--store-text)]">لم يتم العثور على أي نتائج</h3>
              <p className="text-sm text-[var(--store-text-muted)]">
                {searchQuery ? `لا توجد منتجات تطابق "${searchQuery}"` : 'لا توجد منتجات في هذا القسم حالياً'}
              </p>
            </div>
            {(searchQuery || activeTab !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  selectTab('all');
                  window.dispatchEvent(new CustomEvent('store-search-query', { detail: '' }));
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>عرض كل المنتجات</span>
              </button>
            )}
          </div>
        ) : (() => {
          // ── reusable product card ──────────────────────────────────────────
          const renderCard = (product: any) => {
            const outOfStock = Boolean(
              product.status === 'out_of_stock' ||
              (product.stockType === 'numeric'
                ? (!product.unlimitedStock && typeof product.stock === 'number' && product.stock <= 0)
                : (product.stockLinks && Array.isArray(product.stockLinks)
                    ? product.stockLinks.length === 0
                    : typeof product.stock === 'number' && product.stock <= 0))
            );
            return (
              <div key={product.id} className="group store-card rounded-2xl overflow-hidden flex flex-col h-full border border-[var(--store-border)] hover:border-[var(--store-primary)]/50 transition-all duration-300">
                <Link href={`/product/${product.id}`} className="block relative bg-[var(--store-bg)]" aria-label={product.name}>
                  <div className="aspect-square w-full relative overflow-hidden flex items-center justify-center bg-[var(--store-bg)]">
                    <img
                      src={(product.imageUrl || product.image || '').replace(/^"+|"+$/g, '')}
                      alt={product.name}
                      loading="lazy"
                      width={400}
                      height={400}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
                      <span className="bg-black/75 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {product.category === 'شحن ألعاب' || product.type === 'games' ? '🎮 ألعاب' : (product.type === 'digital' ? t('badge.digital') : t('badge.sub'))}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="p-3 sm:p-4 border-t border-[var(--store-border)]/60 flex-1 flex flex-col justify-between gap-2.5 bg-[var(--store-card)]">
                  <Link href={`/product/${product.id}`}>
                    <h2 className="font-bold text-[var(--store-text)] text-[13px] sm:text-sm line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] leading-snug hover:text-[var(--store-primary)] transition-colors" title={product.name}>{product.name}</h2>
                  </Link>
                  <div className="flex items-center justify-between gap-1 sm:gap-2 pt-1 mt-auto">
                    {product.priceUnspecified ? (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-500 text-xs sm:text-sm whitespace-nowrap bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">سعر غير محدد</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[var(--store-primary)] text-base sm:text-lg leading-none whitespace-nowrap">
                          {product.price} <span className="text-[10px] font-normal">د.ج</span>
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium text-[var(--store-text-muted)] line-through decoration-red-500/50">
                              {product.originalPrice}
                            </span>
                            <span className="text-[9px] font-bold text-red-500 bg-red-500/10 px-1 py-0.5 rounded">
                              <span className="hidden sm:inline">وفر </span>{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    {outOfStock ? (
                      <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-md font-bold text-[10px] sm:text-xs bg-red-500/10 border border-red-500/30 text-red-500 cursor-not-allowed">
                        <PackageX className="w-3.5 h-3.5" />
                        <span>نفذ<span className="hidden sm:inline"> المخزون</span></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {product.hasVariants || product.priceUnspecified ? (
                          <Link href={`/product/${product.id}`}
                            className="flex-1 flex items-center justify-center px-2 py-1.5 rounded-md font-bold text-xs bg-[var(--store-primary)] text-[var(--store-bg)] hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                            title="عرض المنتج">
                            <span>{product.priceUnspecified ? 'شحن' : 'الخيارات'}</span>
                          </Link>
                        ) : (
                          <>
                            <Link href={`/checkout/${product.id}`}
                              className="flex items-center justify-center px-2 py-1.5 rounded-md font-bold text-xs bg-[var(--store-primary)] text-[var(--store-bg)] hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
                              title="الشراء المباشر">
                              <span>الشراء</span>
                            </Link>
                            <button type="button"
                              onClick={() => {
                                if (!user) { setShowLoginToast(true); setTimeout(() => setShowLoginToast(false), 3500); return; }
                                addToCart({ id: product.id, name: product.name, price: product.price, imageUrl: (product.imageUrl || product.image || '').replace(/^"+|"+$/g, ''), quantity: 1, type: product.type });
                                setAddedProductId(product.id);
                                setTimeout(() => setAddedProductId(null), 1500);
                              }}
                              className={`p-1 sm:p-1.5 rounded-md border text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center shrink-0 ${addedProductId === product.id ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 scale-105' : 'border-[var(--store-border)] bg-[var(--store-bg)] text-[var(--store-text)] hover:border-[var(--store-primary)] hover:text-[var(--store-primary)] hover:bg-[var(--store-card)]'}`}
                              title="إضافة إلى السلة"
                              aria-label={addedProductId === product.id ? "تمت الإضافة" : `إضافة ${product.name} إلى السلة`}
                            >
                              {addedProductId === product.id ? <Check className="w-4 h-4 text-emerald-400" /> : <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          // ── Section renderer ───────────────────────────────────────────────
          const renderSection = (emoji: string | undefined, title: string, slug: string, prods: any[], showViewAll: boolean) => (
            <section key={slug} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {emoji && <span className="text-2xl leading-none flex-shrink-0">{emoji}</span>}
                  <h2 className="text-xl font-black text-[var(--store-text)] tracking-tight">{title}</h2>
                  <span className="hidden sm:inline text-xs text-[var(--store-text-muted)] bg-[var(--store-card)] border border-[var(--store-border)] rounded-full px-2.5 py-0.5 font-medium flex-shrink-0">
                    {prods.length} منتج
                  </span>
                </div>
                {showViewAll && (
                  <button onClick={() => selectTab(slug)}
                    className="text-xs font-bold text-[var(--store-primary)] hover:underline flex-shrink-0 whitespace-nowrap transition-all">
                    عرض القسم كاملاً ←
                  </button>
                )}
              </div>
              {/* Divider */}
              <div className="h-px bg-gradient-to-l from-transparent via-[var(--store-border)] to-transparent" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {prods.map(p => renderCard(p))}
              </div>
            </section>
          );

          // ─────────────────────────────────────────────────────────────────
          // CASE 1: Searching → flat results with no section headers
          // ─────────────────────────────────────────────────────────────────
          if (searchQuery.trim()) {
            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {filteredProducts.map(p => renderCard(p))}
              </div>
            );
          }

          // ─────────────────────────────────────────────────────────────────
          // CASE 2: specific tab selected → show only that section
          // ─────────────────────────────────────────────────────────────────
          if (activeTab !== 'all') {
            const activeCat = storeCategories.find(c => c.slug === activeTab);
            const title = activeCat ? activeCat.name : activeTab;
            const emoji = activeCat?.emoji;
            return renderSection(emoji, title, activeTab, filteredProducts, false);
          }

          // ─────────────────────────────────────────────────────────────────
          // CASE 3: All tab → show each category as its own section
          // ─────────────────────────────────────────────────────────────────
          if (storeCategories.length > 0) {
            const assigned = new Set<string>();
            const sections = storeCategories.map(cat => {
              const catProds = products.filter(p => {
                const match =
                  p.type === cat.slug ||
                  (p.category || '').toLowerCase() === cat.name.toLowerCase() ||
                  (p.category || '') === cat.slug ||
                  (p.category || '').toLowerCase().includes(cat.slug.toLowerCase());
                if (match) assigned.add(p.id);
                return match;
              });
              return { cat, prods: catProds };
            }).filter(s => s.prods.length > 0);

            const uncategorized = products.filter(p => !assigned.has(p.id));

            return (
              <div className="space-y-14">
                {sections.map(({ cat, prods }) =>
                  renderSection(cat.emoji, cat.name, cat.slug, prods, true)
                )}
                {uncategorized.length > 0 &&
                  renderSection('📦', 'منتجات أخرى', '__other__', uncategorized, false)}
              </div>
            );
          }

          // Fallback: no categories defined → flat grid
          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map(p => renderCard(p))}
            </div>
          );
        })()}

      </section>
      <ReviewsCarousel />

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
