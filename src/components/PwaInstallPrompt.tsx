'use client';

import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Sparkles, Check } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Register service worker to ensure PWA installability criteria
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
    }

    // Check if already running as installed PWA (standalone)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      return; // Already installed, do not show prompt
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !/windows phone/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if dismissed recently (within 24 hours)
    const dismissedAt = localStorage.getItem('lokstor_pwa_dismissed');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const isDismissed = dismissedAt && (now - parseInt(dismissedAt, 10)) < oneDay;

    // 1. Android / Chromium: beforeinstallprompt listener
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);

      if (!isDismissed) {
        // Show after 1.5 seconds for smooth UX
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 2. iOS Safari auto-show if not dismissed
    if (isIosDevice && !isDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // 3. Fallback for mobile devices if beforeinstallprompt takes time or for manual triggers
    const handleManualTrigger = () => {
      setShowPrompt(true);
      if (isIosDevice) setShowIOSGuide(true);
    };
    window.addEventListener('open-pwa-install', handleManualTrigger);

    // 4. Listen when app is installed successfully
    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('lokstor_pwa_installed', 'true');
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('open-pwa-install', handleManualTrigger);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback: If beforeinstallprompt hasn't fired yet, show advice
      alert('لتثبيت التطبيق: اضغط على خيارات المتصفح (⋮) في الأعلى ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"');
      return;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowPrompt(false);
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    try {
      localStorage.setItem('lokstor_pwa_dismissed', Date.now().toString());
    } catch (_) {}
  };

  if (!showPrompt || installed) return null;

  return (
    <div 
      dir="rtl"
      className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl shadow-2xl shadow-black/30 p-4 relative backdrop-blur-xl bg-opacity-95 text-[var(--store-text)] space-y-3.5">
        
        {/* Dismiss X button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 left-3 p-1 rounded-lg text-[var(--store-text-muted)] hover:text-[var(--store-text)] hover:bg-[var(--store-hover)] transition-colors cursor-pointer"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Logo and Badges */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img 
              src="/logo-round.png" 
              alt="Lokstor App" 
              className="w-12 h-12 rounded-xl object-contain border border-[var(--store-border)] shadow-md bg-[var(--store-bg)]"
            />
            <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[var(--store-card)] flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </span>
          </div>

          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-[var(--store-text)] truncate">
                تطبيق لوكستور | Lokstor
              </h4>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 shrink-0">
                مجاني
              </span>
            </div>
            <p className="text-xs text-[var(--store-text-muted)] mt-0.5 leading-snug line-clamp-2">
              تصفح أسرع، وصول فوري لحسابك وطلباتك، وتجربة سلسة بدون متصفح.
            </p>
          </div>
        </div>

        {/* iOS Step-by-Step Guide when expanded */}
        {showIOSGuide && (
          <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--store-border)] text-xs text-[var(--store-text-muted)] space-y-2 animate-in fade-in duration-200">
            <p className="font-bold text-[var(--store-text)] text-xs flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>خطوات تثبيت التطبيق على آيفون (iOS):</span>
            </p>
            <div className="space-y-1.5 pr-2">
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[10px]">1</span>
                <span>اضغط على أيقونة المشاركة <Share className="w-3.5 h-3.5 inline text-sky-400 mx-0.5" /> في أسفل شاشة سفاري.</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[10px]">2</span>
                <span>انزل للأسفل واختر <span className="text-[var(--store-text)] font-semibold">«إضافة إلى الشاشة الرئيسية» <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" /></span>.</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-[10px]">3</span>
                <span>اضغط على <span className="text-[var(--store-text)] font-semibold">«إضافة (Add)»</span> وسيظهر التطبيق على شاشتك فوراً!</span>
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleInstallClick}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--store-primary)] text-[var(--store-bg)] font-bold text-xs sm:text-sm hover:opacity-90 active:scale-98 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isIOS ? 'طريقة التثبيت على الآيفون' : 'تثبيت التطبيق الآن'}</span>
          </button>

          <button
            onClick={handleDismiss}
            className="py-2.5 px-3 rounded-xl border border-[var(--store-border)] text-xs font-semibold text-[var(--store-text-muted)] hover:text-[var(--store-text)] hover:bg-[var(--store-hover)] transition-colors cursor-pointer"
          >
            لاحقاً
          </button>
        </div>

      </div>
    </div>
  );
}

