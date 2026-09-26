'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, RefreshCw, ShoppingBag } from 'lucide-react';

function FailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-8">
      <div className="glass-card p-8 sm:p-12 rounded-3xl text-center space-y-6 border border-slate-800 shadow-2xl">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white">عذراً، لم تكتمل عملية الدفع</h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            يبدو أنه تم إلغاء العملية أو فشل التحويل من طرف البنك/بوابة Chargily. لم يتم خصم أي رصيد خطأ.
          </p>
        </div>

        {orderId && (
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl text-xs text-slate-400">
            <span>رقم العملية الملغاة: </span>
            <span className="font-mono text-white font-bold">{orderId}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white border border-slate-800 font-bold text-xs flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للمتجر الرئيسي</span>
          </Link>
          <Link
            href="/"
            className="chargily-btn w-full sm:w-auto px-6 py-3.5 rounded-xl text-slate-950 font-black text-xs flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>محاولة شراء منتج آخر</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function FailurePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">جاري التحميل...</div>}>
      <FailureContent />
    </Suspense>
  );
}
