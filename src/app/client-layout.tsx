'use client';
import { usePathname, useRouter } from 'next/navigation';

import Link from 'next/link';
import { ShieldCheck, Lock, Sparkles, CreditCard, ShoppingCart, Search, Eye, EyeOff, X, UserPlus, LogOut, User, Globe, Moon, Sun, Settings, Menu } from 'lucide-react';
import { useStoreSettings, StoreSettingsProvider } from '@/lib/store-settings';
import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useTranslation } from '@/lib/i18n-context';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signInWithRedirect, sendPasswordResetEmail } from 'firebase/auth';

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
      router.push(`/?q=${encodeURIComponent(searchQuery)}`);
      setMobileMenuOpen(false);
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
          setError('تم حظر النافذة المنبثقة من المتصفح، يرجى السماح بها');
        }
      } else {
        setError('تعذّر تسجيل الدخول عبر Google، حاول مجدداً');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[var(--store-border)] text-[var(--store-text)] store-header bg-[var(--store-bg)]">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Right (Logo & Links) */}
        <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-shrink">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-3 group min-w-0">
            {s.logoImageUrl ? (
              <img src={s.logoImageUrl} alt="logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover border border-[var(--store-border)] flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white flex items-center justify-center text-black font-black text-lg sm:text-xl border border-[var(--store-border)] flex-shrink-0">
                {s.logoLetter}
              </div>
            )}
            <span className="font-bold text-xs sm:text-sm tracking-wide text-[var(--store-text)] uppercase truncate select-none max-w-[80px] xs:max-w-[120px] sm:max-w-none">
              {s.storeName}
            </span>
          </Link>
          
          {/* Menu Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm font-medium text-[var(--store-text-muted)]">
            <Link href="/" className="hover:text-neutral-100 transition-colors">{t('nav.all')}</Link>
            <Link href="/" className="hover:text-neutral-100 transition-colors">{t('nav.digital')}</Link>
            <Link href="/" className="hover:text-neutral-100 transition-colors">{t('nav.subs')}</Link>
          </nav>
        </div>

        {/* Middle (Search Bar) */}
        <div className="flex-1 max-w-md hidden md:block">
          <form onSubmit={handleSearch} className="relative group">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder={t("nav.search")} 
              className="w-full bg-transparent border border-[var(--store-border)] text-sm text-[var(--store-text)] rounded-md px-4 py-2 focus:outline-none focus:border-[var(--store-primary)] transition-colors placeholder:text-[var(--store-text-muted)]"
            />
            <Search className="w-4 h-4 text-[var(--store-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          </form>
        </div>

        {/* Left (Auth, Cart, Settings) */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          
          {/* Theme & Language Toggles */}
          <div className="flex items-center gap-1 sm:gap-1.5 border-l border-[var(--store-border)] pl-1 sm:pl-2 ml-0.5 sm:ml-1 relative">
            <button 
              onClick={handleToggleTheme}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium hover:bg-[var(--store-card)] transition-colors flex-shrink-0"
              title="تغيير المظهر" aria-label="تبديل المظهر النهاري والليلي"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />}
            </button>
            
            <div className="relative flex-shrink-0">
              <button 
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium hover:bg-[var(--store-card)] transition-colors flex-shrink-0"
                title="تغيير اللغة" aria-label="تغيير لغة الموقع"
              >
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
              </button>
              
              {langDropdownOpen && (
                <div className="absolute top-9 left-0 w-32 bg-[var(--store-bg)] border border-[var(--store-border)] rounded-md shadow-2xl overflow-hidden z-50">
                  <div className="flex flex-col text-sm">
                    <button onClick={() => {setLang('ar'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--store-card)] transition-colors ${lang === 'ar' ? 'text-emerald-400 font-bold' : 'text-[var(--store-text)]'}`}>العربية</button>
                    <button onClick={() => {setLang('en'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--store-card)] transition-colors ${lang === 'en' ? 'text-emerald-400 font-bold' : 'text-[var(--store-text)]'}`}>English</button>
                    <button onClick={() => {setLang('fr'); setLangDropdownOpen(false)}} className={`text-right px-4 py-2 hover:bg-[var(--store-card)] transition-colors ${lang === 'fr' ? 'text-emerald-400 font-bold' : 'text-[var(--store-text)]'}`}>Français</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 border-l border-[var(--store-border)] pl-1 sm:pl-2 ml-0.5 sm:ml-1">
            {user ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link 
                  href="/account"
                  className="hidden sm:flex items-center gap-2 text-xs font-medium text-[var(--store-text)] hover:text-[var(--store-primary)] transition-colors"
                  title="حسابي وسجل طلباتي"
                >
                  <div className="w-7 h-7 rounded-full bg-[var(--store-primary)]/10 border border-[var(--store-primary)]/20 flex items-center justify-center text-[var(--store-primary)]">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="truncate max-w-[100px]">{user.displayName || user.email?.split('@')[0]}</span>
                </Link>
                {isAdmin && (
                  <Link 
                    href="/admin"
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-amber-400 hover:bg-amber-500/10 transition-colors flex-shrink-0"
                    title="لوحة تحكم المسؤول (Admin)"
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Link>
                )}
                <button 
                  onClick={handleSignOut}
                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button 
                  onClick={openLoginModal}
                  className="text-xs font-medium text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors px-2 py-1.5"
                >
                  تسجيل الدخول
                </button>
                <Link href="/register" className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-[var(--store-text)] text-[var(--store-bg)] rounded-md hover:opacity-80 transition-opacity">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('nav.register')}</span>
                </Link>
              </div>
            )}
          </div>

          <button 
            onClick={() => setMobileMenuOpen(true)}
            aria-label="فتح القائمة الرئيسية"
            className="md:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-[var(--store-border)] rounded-md text-[var(--store-text-muted)] hover:text-[var(--store-text)] transition-colors flex-shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>
          
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
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center border border-[var(--store-border)] rounded-md text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium hover:border-[var(--store-border)] transition-colors relative flex-shrink-0"
          >
            <ShoppingCart className="w-4 h-4 text-amber-500" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                {totalItems > 9 ? '+9' : totalItems}
              </span>
            )}
          </Link>
        </div>

      </div>
    </header>


    {/* Mobile Menu Sidebar */}
    {mobileMenuOpen && (
      <div className="md:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm">
        <div className="absolute top-0 right-0 h-full w-64 bg-[var(--store-bg)] border-l border-[var(--store-border)] shadow-2xl flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--store-border)]">
            <span className="font-bold text-[var(--store-text)]">القائمة</span>
            <button onClick={() => setMobileMenuOpen(false)} aria-label="إغلاق القائمة" className="p-2 text-[var(--store-text-muted)] hover:text-[var(--store-text)]">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 flex-1 flex flex-col gap-6 overflow-y-auto">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("nav.search")} className="w-full bg-[var(--store-card)] border border-[var(--store-border)] text-sm rounded-md px-4 py-2.5 pr-10 focus:outline-none focus:border-[var(--store-primary)] transition-colors" />
              <Search className="w-4 h-4 text-[var(--store-text-muted)] absolute right-3 top-1/2 -translate-y-1/2" />
            </form>
            
            {/* Links */}
            <nav className="flex flex-col gap-4 text-sm font-medium text-[var(--store-text)]">
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>{t('nav.all')}</Link>
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>{t('nav.digital')}</Link>
              <Link href="/" onClick={() => setMobileMenuOpen(false)}>{t('nav.subs')}</Link>
            </nav>

            <div className="h-px bg-[var(--store-border)] w-full my-2"></div>

            {/* Auth */}
            {!user ? (
              <div className="flex flex-col gap-3">
                <button onClick={() => { setMobileMenuOpen(false); openLoginModal(); }} className="w-full text-center py-2.5 border border-[var(--store-border)] rounded-md text-sm font-medium text-[var(--store-text)]">
                  {t('nav.login')}
                </button>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="w-full text-center py-2.5 bg-[var(--store-text)] text-[var(--store-bg)] rounded-md text-sm font-medium">
                  {t('nav.register')}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-[var(--store-text)]">
                  <User className="w-4 h-4" /> حسابي وطلباتي
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-sm font-medium text-amber-400">
                    <Settings className="w-4 h-4" /> لوحة التحكم (Admin)
                  </Link>
                )}
                <button onClick={handleSignOut} className="flex items-center gap-2 text-sm font-medium text-red-500 text-right">
                  <LogOut className="w-4 h-4" /> تسجيل الخروج
                </button>
              </div>
            )}

            <div className="mt-auto flex justify-between items-center pt-4 border-t border-[var(--store-border)]">
              <button onClick={handleToggleTheme} className="p-2 border border-[var(--store-border)] rounded-md text-[var(--store-text)]">
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              
              <div className="flex gap-2 text-xs">
                <button onClick={() => setLang('ar')} className={`px-2 py-1 border rounded-md ${lang === 'ar' ? 'bg-[var(--store-text)] text-[var(--store-bg)]' : 'border-[var(--store-border)] text-[var(--store-text)]'}`}>AR</button>
                <button onClick={() => setLang('en')} className={`px-2 py-1 border rounded-md ${lang === 'en' ? 'bg-[var(--store-text)] text-[var(--store-bg)]' : 'border-[var(--store-border)] text-[var(--store-text)]'}`}>EN</button>
                <button onClick={() => setLang('fr')} className={`px-2 py-1 border rounded-md ${lang === 'fr' ? 'bg-[var(--store-text)] text-[var(--store-bg)]' : 'border-[var(--store-border)] text-[var(--store-text)]'}`}>FR</button>
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
  return (
    <footer className="border-t border-[var(--store-border)] bg-[var(--store-bg)] mt-20">
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
              {s.storeSubtitle}
            </p>
          </div>

          <div className="flex flex-col space-y-4">
            <Link href="/" className="text-sm text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors w-fit">الرئيسية</Link>
            <Link href="/about" className="text-sm text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors w-fit">من نحن</Link>
            <Link href="/terms" className="text-sm text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors w-fit">الشروط والأحكام</Link>
            <Link href="/shipping-returns" className="text-sm text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors w-fit">سياسة الشحن والإرجاع</Link>
            <Link href="/privacy" className="text-sm text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors w-fit">سياسة الخصوصية</Link>
            <Link href="/faq" className="text-sm text-[var(--store-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors w-fit">الأسئلة الشائعة</Link>
          </div>

          <div>
            <h4 className="font-bold text-[var(--store-text)] mb-4 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>طرق الدفع المدعومة</span>
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="bg-transparent border border-emerald-700/40 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-md font-semibold">💳 البطاقة الذهبية</span>
              <span className="bg-transparent border border-teal-700/40 dark:border-teal-900/50 text-teal-700 dark:text-teal-400 px-3 py-1.5 rounded-md font-semibold">💳 بطاقة CIB</span>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-[var(--store-text)] mb-4 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>الضمان والأمان</span>
            </h4>
            <p className="text-xs text-[var(--store-text-muted)] leading-relaxed">
              جميع العمليات محمية بتشفير عالي الأمان عبر بوابة Chargily الرسمية.
            </p>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-[var(--store-text-muted)] gap-4">
          <p>© {new Date().getFullYear()} {s.storeSlug}. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <span>الجزائر 🇩🇿</span>
            <span>•</span>
            <span>مدعوم بـ Chargily</span>
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
