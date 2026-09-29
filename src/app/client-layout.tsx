'use client';
import { usePathname, useRouter } from 'next/navigation';

import Link from 'next/link';
import { ShieldCheck, Lock, Sparkles, CreditCard, ShoppingCart, Search, Eye, EyeOff, X, UserPlus, LogOut, User, Globe, Moon, Sun, Settings, Menu } from 'lucide-react';
import { useStoreSettings, StoreSettingsProvider } from '@/lib/store-settings';
import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useTranslation } from '@/lib/i18n-context';
import { auth, db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, sendPasswordResetEmail } from 'firebase/auth';

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

function NavBar() {
  const s = useStoreSettings();
  const { user, signOut, isAdmin } = useAuth();
  const { totalItems } = useCart();
  const { t, lang, setLang } = useTranslation();
  const router = useRouter();

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [productsList, setProductsList] = useState<any[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setProductsList(list);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleGlobalSearch = (e: any) => {
      if (typeof e.detail === 'string') {
        setSearchQuery(e.detail);
      }
    };
    window.addEventListener('store-search-query', handleGlobalSearch);
    return () => window.removeEventListener('store-search-query', handleGlobalSearch);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    window.dispatchEvent(new CustomEvent('store-search-query', { detail: val }));
    if (window.location.pathname === '/') {
      const url = new URL(window.location.href);
      if (val.trim()) {
        url.searchParams.set('q', val);
      } else {
        url.searchParams.delete('q');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const matchingProducts = searchQuery.trim()
    ? productsList.filter(p => {
        const q = searchQuery.trim().toLowerCase();
        return (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.type || '').toLowerCase().includes(q);
      }).slice(0, 6)
    : [];

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Open login modal with fresh, clean state
  const openLoginModal = () => {
    setError('');
    setSuccess('');
    setLoading(false);
    setGoogleLoading(false);
    setIsLoginModalOpen(true);
  };

  // Safe signOut with complete state reset
  const handleSignOut = async () => {
    try {
      await signOut();
      setMobileMenuOpen(false);
      setIsLoginModalOpen(false);
      setError('');
      setSuccess('');
      setEmail('');
      setPassword('');
      setLoading(false);
      setGoogleLoading(false);
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  // Auto-close login modal when user changes/logs in
  useEffect(() => {
    if (user && isLoginModalOpen) {
      setIsLoginModalOpen(false);
      setError('');
      setSuccess('');
      setEmail('');
      setPassword('');
      setLoading(false);
    }
  }, [user, isLoginModalOpen]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('store-theme') as 'light' | 'dark' | null;
      const isDark = savedTheme ? savedTheme === 'dark' : document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', isDark);
    } catch {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    try {
      localStorage.setItem('store-theme', nextTheme);
    } catch {}
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
      setIsSearchFocused(false);
    }
  };

  const handleNavCategory = (tab: string) => {
    setMobileMenuOpen(false);
    window.dispatchEvent(new CustomEvent('store-category-select', { detail: tab }));
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/') {
        const section = document.getElementById('products-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        router.push(`/?tab=${tab}`);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setSuccess('تم تسجيل الدخول بنجاح!');
      setTimeout(() => {
        setIsLoginModalOpen(false);
        setSuccess('');
        setLoading(false);
      }, 800);
    } catch (err: any) {
      setLoading(false);
      setError(err?.message?.includes('auth/invalid-credential') ? 'البريد أو كلمة المرور غير صحيحة' : 'حدث خطأ أثناء الدخول');
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('يرجى إدخال بريدك الإلكتروني أولاً لإرسال رابط الاستعادة');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('تم إرسال رابط استعادة كلمة المرور لبريدك');
    } catch (err: any) {
      setError('فشل إرسال رابط الاستعادة، تأكد من صحة البريد');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      setIsLoginModalOpen(false);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch {
          setError('تم حظر النافذة المنبثقة من المتصفح (Brave/Chrome). يرجى الضغط على أيقونة الدرع أو القفل في شريط العنوان والسماح بالنوافذ.');
        }
      } else if (err?.code === 'auth/unauthorized-domain') {
        setError('هذا النطاق غير مصرح به في Firebase Auth. يرجى إضافة lokstor.vercel.app في إعدادات Firebase.');
      } else {
        setError(err?.message || 'تعذّر تسجيل الدخول عبر Google، حاول مجدداً');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[var(--store-border)] text-[var(--store-text)] store-header bg-[var(--store-bg)]">
      <div className="max-w-7xl mx-auto px-1 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1 sm:gap-4">
        
        {/* Right (Menu Toggle & Logo & Links) */}
        <div className="flex items-center gap-1 sm:gap-4 min-w-0 flex-shrink">
          {/* Mobile Menu Toggle Button (في الزاوية قبل صورة اللوغو) */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="فتح القائمة الرئيسية"
            className="md:hidden w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-[var(--store-border)] rounded-xl text-[var(--store-text)] hover:text-emerald-500 hover:border-emerald-500/50 hover:bg-[var(--store-card)] transition-all flex-shrink-0 cursor-pointer shadow-2xs active:scale-95"
            title="القائمة"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--store-text)]" />
          </button>

          <Link href="/" className="flex items-center gap-1 sm:gap-2.5 group min-w-0">
            {s.logoImageUrl ? (
              <img src={s.logoImageUrl} alt="logo" className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-cover border border-[var(--store-border)] flex-shrink-0 shadow-2xs" />
            ) : (
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white flex items-center justify-center text-black font-black text-lg sm:text-xl border border-[var(--store-border)] flex-shrink-0">
                {s.logoLetter}
              </div>
            )}
            <span className="font-black text-xs sm:text-sm tracking-wide text-[var(--store-text)] uppercase truncate select-none max-w-[85px] xs:max-w-[130px] sm:max-w-none">
              {s.storeName}
            </span>
          </Link>
          
          {/* Menu Links with Category Filter */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[var(--store-text-muted)]">
            <Link href="/?tab=all" onClick={() => handleNavCategory('all')} className="hover:text-neutral-100 transition-colors">{t('nav.all')}</Link>
            <Link href="/?tab=digital" onClick={() => handleNavCategory('digital')} className="hover:text-neutral-100 transition-colors">{t('nav.digital')}</Link>
            <Link href="/?tab=subscription" onClick={() => handleNavCategory('subscription')} className="hover:text-neutral-100 transition-colors">{t('nav.subs')}</Link>
            <Link href="/?tab=games" onClick={() => handleNavCategory('games')} className="hover:text-neutral-100 transition-colors">🎮 شحن ألعاب</Link>
          </nav>
        </div>

        {/* Middle (Search Bar) */}
        <div className="flex-1 max-w-md hidden md:block relative">
          <form onSubmit={handleSearch} className="relative group">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => handleSearchChange(e.target.value)} 
              onFocus={() => setIsSearchFocused(true)}
              placeholder={t("nav.search")} 
              className="w-full bg-transparent border border-[var(--store-border)] text-sm text-[var(--store-text)] rounded-xl px-4 py-2 pl-9 pr-9 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--store-text-muted)] shadow-2xs"
            />
            <Search className="w-4 h-4 text-[var(--store-text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => handleSearchChange('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--store-text-muted)] hover:text-[var(--store-text)] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Live Search Instant Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsSearchFocused(false)} />
              <div className="absolute top-12 left-0 right-0 bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl shadow-2xl overflow-hidden z-50 p-2 space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[var(--store-text-muted)] border-b border-[var(--store-border)] flex justify-between">
                  <span>المنتجات المطابقة</span>
                  <span>{matchingProducts.length} نتائج</span>
                </div>
                {matchingProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--store-text-muted)]">
                    لا توجد منتجات مطابقة لـ "{searchQuery}"
                  </div>
                ) : (
                  matchingProducts.map(p => (
                    <Link
                      key={p.id}
                      href={`/product/${p.id}`}
                      onClick={() => setIsSearchFocused(false)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--store-hover)] transition-colors group"
                    >
                      <img 
                        src={(p.imageUrl || p.image || '').replace(/^"+|"+$/g, '')} 
                        alt={p.name} 
                        className="w-10 h-10 rounded-lg object-cover border border-[var(--store-border)] flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[var(--store-text)] truncate group-hover:text-emerald-500 transition-colors">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-[var(--store-primary)] font-bold">
                          {p.price} د.ج
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                {matchingProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => handleSearch(e)}
                    className="w-full text-center py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors border-t border-[var(--store-border)] mt-1"
                  >
                    عرض كل النتائج على الصفحة الرئيسية ←
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Left (Theme, Lang, Auth, Cart) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          
          {/* Theme & Language Toggles */}
          <div className="flex items-center gap-1 border-l border-[var(--store-border)] pl-1 sm:pl-2 ml-0.5 sm:ml-1 relative">
            <button 
              onClick={handleToggleTheme}
              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-[var(--store-border)] text-[var(--store-text-muted)] hover:text-amber-400 hover:border-amber-400/40 hover:bg-[var(--store-card)] transition-all flex-shrink-0 cursor-pointer shadow-2xs active:scale-95"
              title="تغيير المظهر" aria-label="تبديل المظهر النهاري والليلي"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />}
            </button>
            
            <div className="relative flex-shrink-0">
              <button 
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-[var(--store-border)] text-[var(--store-text-muted)] hover:text-blue-500 hover:border-blue-500/40 hover:bg-[var(--store-card)] transition-all flex-shrink-0 cursor-pointer shadow-2xs active:scale-95"
                title="تغيير اللغة" aria-label="تغيير لغة الموقع"
              >
                <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              </button>
              
              {langDropdownOpen && (
                <div className="absolute top-11 left-0 w-32 bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="flex flex-col text-sm">
                    <button onClick={() => {setLang('ar'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2.5 hover:bg-[var(--store-card)] transition-colors ${lang === 'ar' ? 'text-emerald-400 font-bold' : 'text-[var(--store-text)]'}`}>العربية</button>
                    <button onClick={() => {setLang('en'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2.5 hover:bg-[var(--store-card)] transition-colors ${lang === 'en' ? 'text-emerald-400 font-bold' : 'text-[var(--store-text)]'}`}>English</button>
                    <button onClick={() => {setLang('fr'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2.5 hover:bg-[var(--store-card)] transition-colors ${lang === 'fr' ? 'text-emerald-400 font-bold' : 'text-[var(--store-text)]'}`}>Français</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Auth section */}
          <div className="flex items-center gap-1 sm:gap-2 border-l border-[var(--store-border)] pl-1 sm:pl-2 ml-0.5 sm:ml-1">
            {user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link 
                  href="/account"
                  className="hidden sm:flex items-center gap-2 text-xs font-bold text-[var(--store-text)] hover:text-[var(--store-primary)] transition-colors px-2 py-1.5 rounded-xl hover:bg-[var(--store-card)]"
                  title="حسابي وسجل طلباتي"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--store-primary)]/10 border border-[var(--store-primary)]/20 flex items-center justify-center text-[var(--store-primary)]">
                    <User className="w-4.5 h-4.5" />
                  </div>
                  <span className="truncate max-w-[100px]">{user.displayName || user.email?.split('@')[0]}</span>
                </Link>

                {isAdmin && (
                  <Link 
                    href="/admin"
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all flex-shrink-0 cursor-pointer shadow-2xs active:scale-95"
                    title="لوحة تحكم المسؤول (Admin)"
                  >
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </Link>
                )}

                <button 
                  onClick={handleSignOut}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border border-red-500/20 text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 cursor-pointer shadow-2xs active:scale-95"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={openLoginModal}
                  className="w-8 h-8 sm:w-auto sm:px-3 sm:py-2 flex items-center justify-center rounded-xl border border-[var(--store-border)] text-xs font-bold text-[var(--store-text)] hover:bg-[var(--store-card)] hover:border-emerald-500/40 transition-all flex-shrink-0 cursor-pointer shadow-2xs"
                  title="تسجيل الدخول"
                >
                  <User className="w-4 h-4 sm:hidden text-[var(--store-text-muted)]" />
                  <span className="hidden sm:inline">تسجيل الدخول</span>
                </button>
                <Link 
                  href="/register" 
                  className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-[var(--store-text)] text-[var(--store-bg)] rounded-xl hover:opacity-90 transition-opacity shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{t('nav.register')}</span>
                </Link>
              </div>
            )}
          </div>
          
          {/* Cart Icon */}
          <Link 
            href="/cart" 
            onClick={(e) => {
              if (!user) {
                e.preventDefault();
                openLoginModal();
                setError('سجّل أولاً لتستطيع وضع منتجاتك في السلة ومتابعة الشراء');
              }
            }}
            aria-label="سلة المشتريات" 
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-[var(--store-border)] rounded-xl text-[var(--store-text-muted)] hover:text-amber-500 hover:border-amber-500/40 hover:bg-[var(--store-card)] transition-all relative flex-shrink-0 cursor-pointer shadow-2xs active:scale-95"
            title="سلة المشتريات"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full ring-2 ring-[var(--store-bg)] shadow-xs">
                {totalItems > 9 ? '+9' : totalItems}
              </span>
            )}
          </Link>
        </div>

      </div>
    </header>


    {/* Mobile Menu Sidebar */}
    {mobileMenuOpen && (
      <div 
        className="md:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm cursor-pointer animate-in fade-in duration-200"
        onClick={() => setMobileMenuOpen(false)}
      >
        <div 
          className="absolute top-0 right-0 h-full w-72 sm:w-80 bg-[var(--store-bg)] border-l border-[var(--store-border)] shadow-2xl flex flex-col cursor-default animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--store-border)]">
            <span className="font-black text-base text-[var(--store-text)]">القائمة</span>
            <button 
              onClick={() => setMobileMenuOpen(false)} 
              aria-label="إغلاق القائمة" 
              className="p-2 rounded-lg text-[var(--store-text-muted)] hover:text-[var(--store-text)] hover:bg-[var(--store-card)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-5 overflow-y-auto">
            {/* Search */}
            <div className="relative">
              <form onSubmit={handleSearch} className="relative">
                <input 
                  type="text" 
                  value={searchQuery} 
                  onChange={(e) => handleSearchChange(e.target.value)} 
                  placeholder={t("nav.search")} 
                  className="w-full bg-[var(--store-card)] border border-[var(--store-border)] text-sm rounded-xl px-4 py-3 pr-10 pl-8 focus:outline-none focus:border-emerald-500 transition-colors text-[var(--store-text)]" 
                />
                <Search className="w-4 h-4 text-[var(--store-text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => handleSearchChange('')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--store-text-muted)] p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {/* Mobile instant live results list */}
              {searchQuery.trim().length > 0 && (
                <div className="mt-2 bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-2 space-y-1 max-h-56 overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-bold text-[var(--store-text-muted)] border-b border-[var(--store-border)] flex justify-between">
                    <span>نتائج فورية</span>
                    <span>{matchingProducts.length} نتائج</span>
                  </div>
                  {matchingProducts.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[var(--store-text-muted)]">
                      لا توجد منتجات مطابقة
                    </div>
                  ) : (
                    matchingProducts.map(p => (
                      <Link
                        key={p.id}
                        href={`/product/${p.id}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--store-hover)] transition-colors"
                      >
                        <img 
                          src={(p.imageUrl || p.image || '').replace(/^"+|"+$/g, '')} 
                          alt={p.name} 
                          className="w-8 h-8 rounded object-cover border border-[var(--store-border)] flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-xs font-bold text-[var(--store-text)] truncate">{p.name}</div>
                          <div className="text-[10px] text-emerald-500 font-bold">{p.price} د.ج</div>
                        </div>
                      </Link>
                    ))
                  )}
                  {matchingProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => handleSearch(e)}
                      className="w-full text-center py-1.5 text-xs font-bold text-emerald-500 border-t border-[var(--store-border)] mt-1 cursor-pointer"
                    >
                      عرض النتائج بالصفحة ←
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {/* الأقسام الرئيسية (Larger, comfortable touch targets with real filtering) */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-[var(--store-text-muted)] px-1">الأقسام الرئيسية</span>
              <nav className="flex flex-col gap-2">
                <Link 
                  href="/?tab=all" 
                  onClick={() => handleNavCategory('all')}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--store-card)] border border-[var(--store-border)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm sm:text-base font-bold text-[var(--store-text)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>{t('nav.all')}</span>
                  </div>
                  <span className="text-xs text-[var(--store-text-muted)] opacity-60">←</span>
                </Link>

                <Link 
                  href="/?tab=digital" 
                  onClick={() => handleNavCategory('digital')}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--store-card)] border border-[var(--store-border)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm sm:text-base font-bold text-[var(--store-text)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                    <span>{t('nav.digital')}</span>
                  </div>
                  <span className="text-xs text-[var(--store-text-muted)] opacity-60">←</span>
                </Link>

                <Link 
                  href="/?tab=subscription" 
                  onClick={() => handleNavCategory('subscription')}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--store-card)] border border-[var(--store-border)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm sm:text-base font-bold text-[var(--store-text)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                    <span>{t('nav.subs')}</span>
                  </div>
                  <span className="text-xs text-[var(--store-text-muted)] opacity-60">←</span>
                </Link>

                <Link 
                  href="/?tab=games" 
                  onClick={() => handleNavCategory('games')}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-[var(--store-card)] border border-[var(--store-border)] hover:border-emerald-500/50 hover:bg-emerald-500/5 text-sm sm:text-base font-bold text-[var(--store-text)] transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>🎮 شحن ألعاب</span>
                  </div>
                  <span className="text-xs text-[var(--store-text-muted)] opacity-60">←</span>
                </Link>
              </nav>
            </div>

            {/* الحساب الشخصي (Account & Admin Navigation) */}
            {user ? (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-[var(--store-text-muted)] px-1">الحساب الشخصي</span>
                <div className="flex flex-col gap-2">
                  <Link 
                    href="/account" 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--store-card)] border border-[var(--store-border)] hover:border-emerald-500/50 text-sm sm:text-base font-bold text-[var(--store-text)] transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <span>حسابي وطلباتي</span>
                  </Link>

                  {isAdmin && (
                    <Link 
                      href="/admin" 
                      onClick={() => setMobileMenuOpen(false)} 
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/15 text-sm sm:text-base font-bold text-amber-500 transition-all active:scale-[0.98] cursor-pointer shadow-xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <Settings className="w-4 h-4" />
                      </div>
                      <span>لوحة التحكم (Admin)</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pt-2">
                <button 
                  onClick={() => { setMobileMenuOpen(false); openLoginModal(); }} 
                  className="w-full text-center py-3 px-4 border border-[var(--store-border)] hover:bg-[var(--store-card)] rounded-xl text-sm font-bold text-[var(--store-text)] transition-all cursor-pointer"
                >
                  {t('nav.login')}
                </button>
                <Link 
                  href="/register" 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="w-full text-center py-3 px-4 bg-[var(--store-text)] text-[var(--store-bg)] rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}

            {/* Bottom Section (أسفل شيء: تسجيل الخروج + المظهر واللغة) */}
            <div className="mt-auto pt-4 border-t border-[var(--store-border)] flex flex-col gap-3">
              {user && (
                <button 
                  onClick={handleSignOut} 
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-sm font-bold text-red-500 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                >
                  <LogOut className="w-4 h-4" /> 
                  <span>تسجيل الخروج</span>
                </button>
              )}

              <div className="flex justify-between items-center pt-1">
                <button 
                  onClick={handleToggleTheme} 
                  className="p-2.5 border border-[var(--store-border)] rounded-xl text-[var(--store-text)] hover:bg-[var(--store-card)] transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                  <span className="text-[11px] text-[var(--store-text-muted)]">{theme === 'dark' ? 'نهاري' : 'ليلي'}</span>
                </button>
                
                <div className="flex gap-1.5 text-xs">
                  <button onClick={() => setLang('ar')} className={`px-2.5 py-1.5 border rounded-lg font-bold cursor-pointer ${lang === 'ar' ? 'bg-[var(--store-text)] text-[var(--store-bg)] border-[var(--store-text)]' : 'border-[var(--store-border)] text-[var(--store-text)] hover:bg-[var(--store-card)]'}`}>AR</button>
                  <button onClick={() => setLang('en')} className={`px-2.5 py-1.5 border rounded-lg font-bold cursor-pointer ${lang === 'en' ? 'bg-[var(--store-text)] text-[var(--store-bg)] border-[var(--store-text)]' : 'border-[var(--store-border)] text-[var(--store-text)] hover:bg-[var(--store-card)]'}`}>EN</button>
                  <button onClick={() => setLang('fr')} className={`px-2.5 py-1.5 border rounded-lg font-bold cursor-pointer ${lang === 'fr' ? 'bg-[var(--store-text)] text-[var(--store-bg)] border-[var(--store-text)]' : 'border-[var(--store-border)] text-[var(--store-text)] hover:bg-[var(--store-card)]'}`}>FR</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    )}

    {/* Login Modal */}
    {isLoginModalOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md bg-[var(--store-bg)] border border-[var(--store-border)] rounded-xl shadow-2xl overflow-hidden relative">
          <button 
            onClick={() => setIsLoginModalOpen(false)}
            aria-label="إغلاق نافذة تسجيل الدخول" className="absolute top-4 left-4 text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-[var(--store-card)] border border-[var(--store-border)] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-5 h-5 text-[var(--store-text)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--store-text)] mb-1">مرحباً بعودتك</h2>
              <p className="text-sm text-[var(--store-text-muted)]">قم بتسجيل الدخول للمتابعة</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--store-text-muted)] mb-1.5">البريد الإلكتروني</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--store-card)] border border-[var(--store-border)] text-[var(--store-text)] text-sm rounded-md px-4 py-2.5 focus:outline-none focus:border-neutral-600 transition-colors"
                  placeholder="name@example.com"
                  dir="ltr"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-[var(--store-text-muted)]">كلمة المرور</label>
                  <button type="button" onClick={handleResetPassword} className="text-xs text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">نسيت كلمة المرور؟</button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[var(--store-card)] border border-[var(--store-border)] text-[var(--store-text)] text-sm rounded-md pr-4 pl-10 py-2.5 focus:outline-none focus:border-neutral-600 transition-colors"
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              {success && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center py-2.5 rounded-md font-medium">
                  {success}
                </div>
              )}
              <button 
                type="submit"
                disabled={loading}
                className="chargily-btn w-full py-3 text-white font-black text-sm rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all mt-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-2">
              <div className="flex-1 h-px bg-[var(--store-border)]"></div>
              <span className="text-xs text-[var(--store-text-muted)]">أو</span>
              <div className="flex-1 h-px bg-[var(--store-border)]"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="w-full py-3 px-4 bg-[var(--store-bg)] border-2 border-[var(--store-border)] hover:border-emerald-500 text-[var(--store-text)] font-bold text-sm rounded-xl hover:bg-[var(--store-hover)] transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
            >
              {googleLoading ? (
                <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              <span>{googleLoading ? 'جاري الفتح...' : 'المتابعة باستخدام Google'}</span>
            </button>
            
            <div className="mt-6 text-center text-xs text-[var(--store-text-muted)]">
              ليس لديك حساب؟ <Link href="/register" onClick={() => setIsLoginModalOpen(false)} className="text-[var(--store-text)] font-medium hover:underline">إنشاء حساب جديد</Link>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function Footer() {
  const s = useStoreSettings();
  const { t, lang } = useTranslation();
  return (
    <footer className="border-t border-[var(--store-border)] bg-[var(--store-bg)] mt-20" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-[var(--store-border)]">
          <div>
            <div className="flex items-center gap-2 mb-4">
              {s.logoImageUrl ? (
                <img src={s.logoImageUrl} alt="logo" className="w-8 h-8 rounded-lg object-cover border border-[var(--store-border)]" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black text-lg border border-[var(--store-border)]">
                  {s.logoLetter}
                </div>
              )}
              <span className="font-bold text-sm tracking-wide text-[var(--store-text)] uppercase">{s.storeName}</span>
            </div>
            <p className="text-sm text-[var(--store-text-muted)] leading-relaxed mb-4">
              {lang === 'ar' ? s.storeSubtitle : t('footer.subtitle')}
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <Link href="/" className="text-sm text-[var(--store-text-muted)] hover:text-emerald-500 font-medium transition-colors w-fit">{t('common.home')}</Link>
            <Link href="/about" className="text-sm text-[var(--store-text-muted)] hover:text-emerald-500 font-medium transition-colors w-fit">{t('footer.about')}</Link>
            <Link href="/terms" className="text-sm text-[var(--store-text-muted)] hover:text-emerald-500 font-medium transition-colors w-fit">{t('footer.terms')}</Link>
            <Link href="/shipping-returns" className="text-sm text-[var(--store-text-muted)] hover:text-emerald-500 font-medium transition-colors w-fit">{t('footer.shippingReturns')}</Link>
            <Link href="/privacy" className="text-sm text-[var(--store-text-muted)] hover:text-emerald-500 font-medium transition-colors w-fit">{t('footer.privacy')}</Link>
            <Link href="/faq" className="text-sm text-[var(--store-text-muted)] hover:text-emerald-500 font-medium transition-colors w-fit">{t('footer.faq')}</Link>
          </div>

          <div>
            <h4 className="font-bold text-[var(--store-text)] mb-4 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>{t('footer.paymentMethods')}</span>
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-transparent border border-emerald-700/40 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-md font-semibold">💳 {t('footer.edahabia')}</span>
              <span className="bg-transparent border border-teal-700/40 dark:border-teal-900/50 text-teal-700 dark:text-teal-400 px-3 py-1.5 rounded-md font-semibold">💳 {t('footer.cib')}</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[var(--store-text)] mb-4 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>{t('footer.security')}</span>
            </h4>
            <p className="text-xs text-[var(--store-text-muted)] leading-relaxed">
              {t('footer.securityDesc')}
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[var(--store-text-muted)] gap-4">
          <p>© {new Date().getFullYear()} {s.storeSlug}. {t('footer.rights')}</p>
          <div className="flex items-center gap-4">
            <span>{t('footer.country')}</span>
            <span>•</span>
            <span>{t('footer.powered')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function TelegramFloat() {
  return (
    <a
      href="https://t.me/Loktech"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل معنا عبر تلغرام"
      title="تواصل معنا عبر تلغرام (LokTech)"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#229ED9] hover:bg-[#1b8bc2] text-white shadow-lg shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all duration-200 group"
    >
      <svg
        className="w-5 h-5 sm:w-6 sm:h-6 text-white translate-x-[-1px] group-hover:rotate-12 transition-transform duration-200"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18.19.19 0 0 0-.21-.02c-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
    </a>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();


  const isAdmin = pathname?.startsWith('/admin');

  return (
    <StoreSettingsProvider>
      {!isAdmin && <NavBar />}
      <main className={!isAdmin ? "flex-grow" : "flex-grow w-full"}>{children}</main>
      {!isAdmin && <Footer />}
      {!isAdmin && <TelegramFloat />}
    </StoreSettingsProvider>
  );
}
