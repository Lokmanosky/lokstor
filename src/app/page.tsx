'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingCart, Zap, ShieldCheck, FileText, ChevronDown } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'; // Wait, it's firestore
import { getFirestore } from 'firebase/firestore';
import { useTranslation } from '@/lib/i18n-context';

// Mock data until Firestore is fully linked for products
const MOCK_PRODUCTS = [
  { id: '1', name: 'قالب سيرة ذاتية احترافي', price: 1500, type: 'digital', image: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&q=80' },
  { id: '2', name: 'اشتراك نتفليكس شهر واحد', price: 2500, type: 'subscription', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&q=80' },
  { id: '3', name: 'كتاب تعلم البرمجة من الصفر', price: 900, type: 'digital', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80' },
  { id: '4', name: 'اشتراك سبوتيفاي بريميوم', price: 1200, type: 'subscription', image: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=500&q=80' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('all');
  const { t } = useTranslation();

  const filteredProducts = MOCK_PRODUCTS.filter(p => {
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
          
          <h1 className="text-4xl sm:text-5xl font-black text-[var(--store-text)] tracking-tight leading-tight">
            {t('hero.title1')} <span className="text-[var(--store-primary)]">{t('hero.title2')}</span> {t('hero.title3')}
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
            الكل
          </button>
          <button 
            onClick={() => setActiveTab('digital')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'digital' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            منتجات رقمية
          </button>
          <button 
            onClick={() => setActiveTab('subscription')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'subscription' ? 'border-emerald-500 text-[var(--store-text)]' : 'border-transparent text-[var(--store-text-muted)] hover:text-[var(--store-text)]'}`}
          >
            اشتراكات
          </button>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="group store-card rounded-xl overflow-hidden">
              <div className="aspect-[4/3] bg-[var(--store-card)] relative overflow-hidden">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 right-3">
                  <span className="bg-black/60 backdrop-blur-md border border-white/10 text-[var(--store-text)] text-[10px] font-bold px-2.5 py-1 rounded-md">
                    {product.type === 'digital' ? t('badge.digital') : t('badge.sub')}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <h3 className="font-bold text-[var(--store-text)] text-sm line-clamp-1">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-emerald-400 font-bold text-lg">{product.price}</span>
                    <span className="text-[var(--store-text-muted)] text-xs font-medium">د.ج</span>
                  </div>
                </div>
                <button className="w-full py-2 bg-[var(--store-card)] border border-[var(--store-border)] text-[var(--store-text)] text-xs font-bold rounded-lg hover:bg-[var(--store-hover)] transition-colors flex items-center justify-center gap-2">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{t('btn.add')}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

      </section>
    </div>
  );
}
