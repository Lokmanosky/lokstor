import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { ShoppingBag, ShieldCheck, Download, Lock, Sparkles, CreditCard } from 'lucide-react';

export const metadata: Metadata = {
  title: 'lokstor | لوقستور - متجر المنتجات الرقمية في الجزائر',
  description: 'منصة بيع المنتجات الرقمية، الكتب الإلكترونية، والقوالب مع خدمة الدفع الإلكتروني شارجيلي Chargily عبر بطاقات الذهبية و CIB.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        {/* Header / Navigation */}
        <header className="sticky top-0 z-50 glass-nav border-b border-slate-800/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
                L
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl tracking-tight text-white flex items-center gap-1.5">
                  لوقستور <span className="text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">lokstor</span>
                </span>
                <span className="text-xs text-slate-400">متجر المنتجات الرقمية الجزائري</span>
              </div>
            </Link>

            {/* Nav badges */}
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
              <div className="flex items-center gap-2 text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>دفع إلكتروني آمن 100%</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
                <Download className="w-4 h-4 text-teal-400" />
                <span>تحميل فوري ومباشر</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl text-slate-300 bg-slate-900/80 hover:bg-slate-800 hover:text-white border border-slate-700/60 transition-all duration-200"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>لوحة التحكم</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow">{children}</main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950 mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-slate-800/60">
              {/* Brand Col */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg">
                    L
                  </div>
                  <span className="font-extrabold text-lg text-white">لوقستور lokstor</span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed mb-4">
                  منصتكم الموثوقة لشراء الكتب الرقمية، قوالب المواقع، والكورسات التعليمية بالدينار الجزائري مع التسليم الفوري.
                </p>
              </div>

              {/* Payment Methods */}
              <div>
                <h4 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>طرق الدفع المدعومة عبر Chargily</span>
                </h4>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-slate-900 border border-slate-800 text-emerald-400 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    💳 البطاقة الذهبية (Algérie Poste)
                  </span>
                  <span className="bg-slate-900 border border-slate-800 text-blue-400 font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    💳 بطاقة CIB البنكية
                  </span>
                </div>
              </div>

              {/* Security & Support */}
              <div>
                <h4 className="font-bold text-white mb-4 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>الضمان والأمان</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  جميع العمليات محمية بتشفير عالي الأمان عبر بوابة Chargily الرسمية. تتلقى رابط التحميل فور تأكيد العملية.
                </p>
              </div>
            </div>

            <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
              <p>© {new Date().getFullYear()} lokstor. جميع الحقوق محفوظة.</p>
              <div className="flex items-center gap-4">
                <span>الجزائر 🇩🇿</span>
                <span>•</span>
                <span>مدعوم بـ Chargily Pay v2</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
