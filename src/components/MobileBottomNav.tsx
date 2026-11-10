'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Menu, ShoppingCart, Search, User, X } from 'lucide-react';
import { useCart } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useTranslation } from '@/lib/i18n-context';
import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { totalItems } = useCart();
  const { user } = useAuth();
  const { t, lang } = useTranslation();

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productsList, setProductsList] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Exclude from admin dashboard completely
  const isAdmin = pathname?.startsWith('/admin');

  // Load products list for the instant mobile search popup
  useEffect(() => {
    if (isAdmin) return;
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setProductsList(list);
    });
    return () => unsub();
  }, [isAdmin]);

  // Focus input automatically when search overlay opens
  useEffect(() => {
    if (searchModalOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [searchModalOpen]);

  // Close search modal when route changes
  useEffect(() => {
    setSearchModalOpen(false);
  }, [pathname]);

  if (isAdmin) return null;

  const isHome = pathname === '/';
  const isCart = pathname === '/cart';
  const isAccount = pathname === '/account';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchModalOpen(false);
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      window.dispatchEvent(new CustomEvent('store-search-query', { detail: searchQuery.trim() }));
    }
  };

  const matchingProducts = searchQuery.trim()
    ? productsList
        .filter((p) => {
          const q = searchQuery.trim().toLowerCase();
          return (
            (p.name || '').toLowerCase().includes(q) ||
            (p.description || '').toLowerCase().includes(q) ||
            (p.type || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 5)
    : [];

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. Quick Search Overlay (Mobile)
      ───────────────────────────────────────────────────────────── */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-slate-950/60 backdrop-blur-md flex flex-col justify-end transition-opacity">
          <div
            className="bg-[var(--store-card)] border-t border-[var(--store-border)] rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center justify-between border-b border-[var(--store-border)] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-[var(--store-text)]">
                  {lang === 'ar' ? 'البحث في المتجر' : 'Rechercher'}
                </h3>
              </div>
              <button
                onClick={() => setSearchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب اسم المنتج، اللعبة، أو البطاقة...' : 'Rechercher un produit...'}
                className="w-full bg-[var(--store-bg)] border border-[var(--store-border)] rounded-2xl py-3.5 pr-11 pl-4 text-xs font-semibold text-[var(--store-text)] placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </form>

            {/* Instant Search Suggestions */}
            {searchQuery.trim() && (
              <div className="overflow-y-auto max-h-60 space-y-2 py-1">
                {matchingProducts.length > 0 ? (
                  matchingProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/product/${p.id}`}
                      onClick={() => setSearchModalOpen(false)}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--store-bg)] border border-[var(--store-border)] hover:border-emerald-500/40 transition-all"
                    >
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-800"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                          {p.name?.[0] || 'P'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-xs font-bold text-[var(--store-text)] truncate">{p.name}</p>
                        <p className="text-[11px] text-emerald-500 font-extrabold">{p.price} د.ج</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-center text-slate-400 py-6">
                    {lang === 'ar' ? 'لا توجد نتائج مطابقة لبحثك' : 'Aucun résultat trouvé'}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSearchSubmit}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-colors"
            >
              {lang === 'ar' ? 'عرض جميع النتائج' : 'Voir tous les résultats'}
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          2. Bottom Navigation Bar (Fixed - Mobile Only: md:hidden)
      ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.35)] pb-[max(env(safe-area-inset-bottom),0.35rem)] transition-colors duration-200"
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="max-w-md mx-auto px-3 h-16 flex items-center justify-between relative">
          
          {/* 1. الرئيسية (Home) */}
          <Link
            href="/"
            onClick={() => {
              if (isHome && typeof window !== 'undefined') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors relative z-10 cursor-pointer active:scale-95 touch-manipulation select-none ${
              isHome
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <div className="relative">
              <Home className={`w-5 h-5 transition-transform duration-200 ${isHome ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
              {isHome && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <span className="text-[10px] leading-tight tracking-tight">
              {lang === 'ar' ? 'الرئيسية' : 'Accueil'}
            </span>
          </Link>

          {/* 2. القائمة (Menu Drawer) */}
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-mobile-menu'))}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
            aria-label={lang === 'ar' ? 'القائمة' : 'Menu'}
          >
            <Menu className="w-5 h-5 stroke-[1.8] hover:scale-110 transition-transform duration-200" />
            <span className="text-[10px] leading-tight tracking-tight">
              {lang === 'ar' ? 'القائمة' : 'Menu'}
            </span>
          </button>

          {/* 3. الزر الأوسط البارز: السلة (Floating Cart Center Button) */}
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <Link
              href="/cart"
              aria-label={t('cart.title') || 'السلة'}
              className={`relative -top-5 flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200 active:scale-95 border-4 border-white dark:border-[#0b1120] ${
                isCart
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/40 scale-105'
                  : 'bg-gradient-to-tr from-emerald-500 to-emerald-600 text-slate-950 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50'
              }`}
            >
              <ShoppingCart className="w-6 h-6 stroke-[2.2]" />

              {/* Cart Badge Count */}
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center border-2 border-white dark:border-[#0b1120] shadow-md animate-bounce">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Link>
            <span className={`text-[10px] -mt-4 font-bold tracking-tight ${isCart ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}`}>
              {lang === 'ar' ? 'السلة' : 'Panier'}
            </span>
          </div>

          {/* 4. البحث (Search) */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer"
          >
            <Search className="w-5 h-5 stroke-[1.8] hover:scale-110 transition-transform duration-200" />
            <span className="text-[10px] leading-tight tracking-tight">
              {lang === 'ar' ? 'البحث' : 'Recherche'}
            </span>
          </button>

          {/* 5. حسابي / دخول (Account / Login) */}
          {user ? (
            <Link
              href="/account"
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors relative z-10 cursor-pointer active:scale-95 touch-manipulation select-none ${
                isAccount
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <div className="relative">
                <User className={`w-5 h-5 transition-transform duration-200 ${isAccount ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {isAccount && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] leading-tight tracking-tight">
                {lang === 'ar' ? 'حسابي' : 'Compte'}
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-login-modal'));
              }}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-colors relative z-10 cursor-pointer active:scale-95 touch-manipulation select-none text-slate-500 dark:text-slate-400 hover:text-emerald-500 font-medium"
            >
              <div className="relative">
                <User className="w-5 h-5 stroke-[1.8] hover:scale-110 transition-transform duration-200" />
              </div>
              <span className="text-[10px] leading-tight tracking-tight text-emerald-600 dark:text-emerald-400 font-bold">
                {lang === 'ar' ? 'دخول' : 'Connexion'}
              </span>
            </button>
          )}

        </div>
      </nav>
    </>
  );
}

