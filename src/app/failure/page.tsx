'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, ShoppingBag } from 'lucide-react';
import { useTranslation } from '@/lib/i18n-context';

function FailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  const { t, lang } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-[var(--store-card)] p-8 sm:p-12 rounded-3xl text-center space-y-6 border border-[var(--store-border)] shadow-xl">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 text-red-500 dark:text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--store-text)]">{t('failure.title')}</h1>
          <p className="text-[var(--store-text-muted)] text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            {t('failure.desc')}
          </p>
        </div>

        {orderId && (
          <div className="bg-[var(--store-bg)] border border-[var(--store-border)] p-4 rounded-xl text-xs text-[var(--store-text-muted)]">
            <span>{t('failure.cancelledOrder')} </span>
            <span className="font-mono text-[var(--store-text)] font-bold" dir="ltr">{orderId}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[var(--store-bg)] text-[var(--store-text)] hover:bg-[var(--store-hover)] border border-[var(--store-border)] font-bold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowRight className={`w-4 h-4 ${lang !== 'ar' ? 'rotate-180' : ''}`} />
            <span>{t('failure.backToStore')}</span>
          </Link>
          <Link
            href="/"
            className="chargily-btn w-full sm:w-auto px-6 py-3.5 rounded-xl text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('failure.tryAgain')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FailurePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-[var(--store-text-muted)] text-sm">...</div>}>
      <FailureContent />
    </Suspense>
  );
}
