'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { Product } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { Search, ShoppingBag, ArrowLeft, CheckCircle2, Sparkles, FileText, Zap, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadProducts() {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        if (!querySnapshot.empty) {
          const list: Product[] = [];
          querySnapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Product);
          });
          setProducts(list);
        }
      } catch (err) {
        console.warn('Firestore fetch products fallback to seed data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const categories = ['الكل', 'كتب إلكترونية', 'قوالب برمجية', 'كورسات فيديو'];

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'الكل' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Banner */}
      <section className="relative overflow-hidden pt-12 pb-16 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800/80">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>متجر المنتجات الرقمية الأول في الجزائر 🇩🇿</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            احصل على أفضل <span className="text-gradient">المنتجات الرقمية</span> بدفع إلكتروني محلي آمن
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            كتب PDF، قوالب جاهزة، وكورسات تخصصية مع تحميل فوري ومباشر بعد الدفع بواسطة البطاقة الذهبية أو CIB عبر بوابة Chargily.
          </p>

          {/* Feature Badges */}
          <div className="pt-4 flex flex-wrap justify-center gap-6 text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>تسليم تلقائي وفوري</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>دفع عبر بوابة Chargily الرسمية</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>ملفات أصلية عالية الجودة</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Search & Categories Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 glass-card p-4 rounded-2xl">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="text-slate-400 text-sm">جاري تحميل المنتجات...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-2xl p-8">
            <p className="text-slate-400 text-base mb-2">لم نجد منتجات تضمن هذا البحث</p>
            <button
              onClick={() => {
                setSelectedCategory('الكل');
                setSearchQuery('');
              }}
              className="text-emerald-400 text-xs font-semibold hover:underline"
            >
              إعادة ضبط الفلاتر
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="glass-card rounded-3xl overflow-hidden hover:border-emerald-500/40 transition-all duration-300 flex flex-col group"
              >
                {/* Image & Tag */}
                <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-full font-bold">
                    {product.fileType || 'ملف رقمي'}
                  </div>
                  {product.category && (
                    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-slate-300 text-xs px-3 py-1.5 rounded-full font-medium">
                      {product.category}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-6 flex-grow flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h3 className="font-bold text-lg text-white group-hover:text-emerald-400 transition-colors leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">
                      {product.description}
                    </p>

                    {/* Features Snippet */}
                    {product.features && (
                      <div className="space-y-1.5 pt-2">
                        {product.features.slice(0, 2).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Pricing & Actions */}
                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block font-medium">السعر:</span>
                      <span className="text-2xl font-black text-white">
                        {product.price}{' '}
                        <span className="text-emerald-400 text-sm font-bold">د.ج</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/product/${product.id}`}
                        className="px-4 py-2.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold hover:border-slate-700 transition-colors"
                      >
                        التفاصيل
                      </Link>
                      <Link
                        href={`/checkout/${product.id}`}
                        className="chargily-btn px-4 py-2.5 rounded-xl text-slate-950 font-extrabold text-xs flex items-center gap-1.5"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>شراء الآن</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
