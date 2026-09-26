'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Product } from '@/types';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';
import { ArrowRight, CheckCircle2, ShieldCheck, Download, CreditCard, Sparkles, FileText, ShoppingBag } from 'lucide-react';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: productId } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">جاري جلب تفاصيل المنتج...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center glass-card rounded-3xl p-12 my-12">
        <h2 className="text-2xl font-bold text-white mb-4">المنتج غير موجود</h2>
        <p className="text-slate-400 text-sm mb-6">عذراً، لم نتمكن من العثور على المنتج المطلوب.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        <span>العودة لجميع المنتجات</span>
      </Link>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1 rounded-full font-bold">
          {product.category || 'منتج رقمي'}
        </span>
        <span className="bg-slate-900 border border-slate-800 text-slate-400 text-xs px-3 py-1 rounded-full font-medium">
          صيغة: {product.fileType || 'ملف جاهز للتحميل'}
        </span>
        {product.category === 'منتجات رقمية' && (
          <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
            (product.stockLinks?.length || 0) > 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {(product.stockLinks?.length || 0) > 0 ? `الكمية المتوفرة: ${product.stockLinks?.length}` : 'نفذت الكمية بالكامل'}
          </span>
        )}
      </div>

      {/* 1. Title */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
        {product.name}
      </h1>

      {/* 2. Image */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-800 p-2">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full max-h-[500px] object-cover rounded-2xl"
        />
      </div>

      {/* 3. Description */}
      <p className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
        {product.description}
      </p>

      {/* 4. Features */}
      {product.features && product.features.length > 0 && (
        <div className="glass-card p-6 rounded-3xl space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>مميزات وقيمة هذا المنتج الرقمي:</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {product.features.map((feat, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Purchase Card */}
      <div className="glass-card p-8 rounded-3xl space-y-6 border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-6">
          <div>
            <span className="text-xs text-slate-400 block font-medium">السعر النهائي للمنتج:</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-white">{product.price}</span>
              <span className="text-emerald-400 font-extrabold text-lg">د.ج</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">لا توجد رسوم خفية • تسليم رقمي مباشر</p>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400 justify-end">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>رابط آمن بعد التأكيد</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 justify-end">
              <Download className="w-4 h-4 text-teal-400" />
              <span>تحميل فوري ومباشر</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>دفع إلكتروني آمن بواسطة Chargily</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            يدعم الدفع بواسطة البطاقة الذهبية (Algérie Poste) وبطاقة CIB التابعة للبنوك الجزائرية.
          </p>
        </div>

        {product.category === 'منتجات رقمية' && (product.stockLinks?.length || 0) === 0 ? (
          <div className="w-full py-4 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 font-black text-base flex items-center justify-center gap-2 cursor-not-allowed">
            <ShoppingBag className="w-5 h-5" />
            <span>نفذ المخزون</span>
          </div>
        ) : (
          <Link
            href={`/checkout/${product.id}`}
            className="chargily-btn w-full py-4 rounded-2xl text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-lg"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>متابعة الشراء والدفع الان</span>
          </Link>
        )}
      </div>
    </div>
  );
}
