'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface TickerItem {
  text: string;
  icon?: string;
  color?: string; // e.g. 'amber', 'emerald', 'purple', 'rose', 'blue', 'cyan', 'orange', 'red', 'slate'
}

export interface PaymentGatewaysConfig {
  chargilyEnabled?: boolean;
  oneclickEnabled?: boolean;
  binanceEnabled?: boolean;
  redotpayEnabled?: boolean;
}

export interface HeroPhrasesConfig {
  badge?: string;
  titleLine1?: string;
  titleLine2?: string;
  description?: string;
  feature1?: string;
  feature2?: string;
}

export const DEFAULT_HERO_PHRASES: HeroPhrasesConfig = {
  badge: 'متجر المنتجات الرقمية الأول في الجزائر',
  titleLine1: 'أفضل المنتجات الرقمية',
  titleLine2: 'بدفع إلكتروني آمن',
  description: 'كتب، قوالب جاهزة، واشتراكات مدفوعة مع تسليم فوري وتلقائي مباشرة بعد الدفع.',
  feature1: 'بوابات دفع رسمية جزائرية',
  feature2: 'دعم فني متواصل 24/7',
};

export interface StoreSettings {
  storeName: string;
  storeSlug: string;
  storeSubtitle: string;
  logoLetter: string;
  logoImageUrl?: string;
  adminNotificationEmail?: string;
  tickerItems?: TickerItem[];
  tickerEnabled?: boolean;
  tickerSpeed?: number; // duration in seconds (8s - 60s, default 25)
  dollarRate?: number; // USD exchange rate in DZD (e.g. 250)
  paymentGateways?: PaymentGatewaysConfig;
  heroPhrases?: HeroPhrasesConfig;
  oneclickApiKey?: string;
  chargilyApiKey?: string;
  redotpayId?: string;
  redotpayAccountName?: string;
  binanceUid?: string;
  binanceAddress?: string;
  forceRefreshTimestamp?: number;
  lastForcedRefreshBy?: string;
  isLoaded?: boolean;
}

export const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  { text: "دعم متوفر 24/7", icon: "🎧", color: "amber" },
  { text: "أسعار تنافسية", icon: "⭐", color: "emerald" },
  { text: "تسليم فوري وآمن", icon: "🚀", color: "purple" },
  { text: "مرحباً بك في متجرنا", icon: "✨", color: "rose" }
];

const defaultSettings: StoreSettings = {
  storeName: 'Lokstor',
  storeSlug: 'lokstor',
  storeSubtitle: 'متجر المنتجات الرقمية الجزائري',
  logoLetter: 'L',
  logoImageUrl: '/logo-round.png',
  adminNotificationEmail: 'admin@lokstor.dz',
  tickerItems: DEFAULT_TICKER_ITEMS,
  tickerEnabled: true,
  tickerSpeed: 25,
  dollarRate: 250,
  paymentGateways: {
    chargilyEnabled: true,
    oneclickEnabled: true,
    binanceEnabled: true,
    redotpayEnabled: true,
  },
  heroPhrases: DEFAULT_HERO_PHRASES,
  oneclickApiKey: '',
  chargilyApiKey: '',
  redotpayId: '1622725404',
  redotpayAccountName: 'Lokmanosky',
  binanceUid: '427636242',
  binanceAddress: '0xf0782cc454c9f0b273a11aba636fac62f18b24dd',
};

const StoreSettingsContext = createContext<StoreSettings>(defaultSettings);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('lokstor_cached_store_settings');
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            ...defaultSettings,
            ...parsed,
            isLoaded: true
          };
        }
      } catch {}
    }
    return { ...defaultSettings, isLoaded: false };
  });

  useEffect(() => {
    // Listen for local immediate updates within the same window
    const handleLocalUpdate = (e: any) => {
      if (e.detail) {
        setSettings(prev => ({ ...prev, ...e.detail, isLoaded: true }));
      }
    };
    window.addEventListener('lokstor_settings_updated', handleLocalUpdate);

    // Real-time listener for public store settings from Firestore
    const unsub = onSnapshot(doc(db, 'settings', 'store'), async (snap) => {
      let privateData: any = {};
      try {
        const privateSnap = await getDoc(doc(db, 'settings', 'private'));
        if (privateSnap.exists()) {
          privateData = privateSnap.data();
        }
      } catch (err) {}

      if (snap.exists()) {
        const combined = { ...snap.data(), ...privateData };
        const updatedSettings: StoreSettings = {
          ...defaultSettings,
          ...combined,
          tickerItems: combined.tickerItems && Array.isArray(combined.tickerItems) && combined.tickerItems.length > 0
            ? combined.tickerItems
            : DEFAULT_TICKER_ITEMS,
          tickerEnabled: combined.tickerEnabled !== undefined ? combined.tickerEnabled : true,
          tickerSpeed: typeof combined.tickerSpeed === 'number' ? combined.tickerSpeed : 25,
          paymentGateways: {
            chargilyEnabled: combined.paymentGateways?.chargilyEnabled ?? true,
            oneclickEnabled: combined.paymentGateways?.oneclickEnabled ?? true,
            binanceEnabled: combined.paymentGateways?.binanceEnabled ?? true,
            redotpayEnabled: combined.paymentGateways?.redotpayEnabled ?? true,
          },
          heroPhrases: {
            ...DEFAULT_HERO_PHRASES,
            ...(combined.heroPhrases || {}),
          },
          oneclickApiKey: combined.oneclickApiKey || '',
          chargilyApiKey: combined.chargilyApiKey || '',
          redotpayId: combined.redotpayId || '1622725404',
          redotpayAccountName: combined.redotpayAccountName || 'Lokmanosky',
          binanceUid: combined.binanceUid || '427636242',
          binanceAddress: combined.binanceAddress || '0xf0782cc454c9f0b273a11aba636fac62f18b24dd',
          forceRefreshTimestamp: combined.forceRefreshTimestamp,
          lastForcedRefreshBy: combined.lastForcedRefreshBy,
          isLoaded: true,
        };

        setSettings(updatedSettings);

        // Cache publicly needed settings to localStorage for 0ms flash-free initial render
        try {
          localStorage.setItem('lokstor_cached_store_settings', JSON.stringify({
            tickerItems: updatedSettings.tickerItems,
            tickerEnabled: updatedSettings.tickerEnabled,
            tickerSpeed: updatedSettings.tickerSpeed,
            heroPhrases: updatedSettings.heroPhrases,
            paymentGateways: updatedSettings.paymentGateways,
            dollarRate: updatedSettings.dollarRate,
            forceRefreshTimestamp: updatedSettings.forceRefreshTimestamp,
          }));
        } catch {}
      }
    }, () => {});

    return () => {
      unsub();
      window.removeEventListener('lokstor_settings_updated', handleLocalUpdate);
    };
  }, []);

  return (
    <StoreSettingsContext.Provider value={settings}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  return useContext(StoreSettingsContext);
}

export async function saveStoreSettings(settings: Partial<StoreSettings>) {
  const publicSettings = { ...settings };
  const privateSettings: any = {};
  
  if ('adminNotificationEmail' in publicSettings) {
    privateSettings.adminNotificationEmail = publicSettings.adminNotificationEmail;
    delete publicSettings.adminNotificationEmail;
  }

  if ('oneclickApiKey' in publicSettings) {
    privateSettings.oneclickApiKey = publicSettings.oneclickApiKey;
    delete publicSettings.oneclickApiKey;
  }

  if ('chargilyApiKey' in publicSettings) {
    privateSettings.chargilyApiKey = publicSettings.chargilyApiKey;
    delete publicSettings.chargilyApiKey;
  }

  // 1. Immediately update local cache to eliminate any lag or stale flash on refresh
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem('lokstor_cached_store_settings');
      const current = cached ? JSON.parse(cached) : {};
      const merged = { ...current, ...publicSettings };
      localStorage.setItem('lokstor_cached_store_settings', JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('lokstor_settings_updated', { detail: merged }));
    } catch {}
  }
  
  await setDoc(doc(db, 'settings', 'store'), publicSettings, { merge: true });
  if (Object.keys(privateSettings).length > 0) {
    await setDoc(doc(db, 'settings', 'private'), privateSettings, { merge: true });
  }
}
