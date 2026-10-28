'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface TickerItem {
  text: string;
  icon?: string;
}

export interface PaymentGatewaysConfig {
  chargilyEnabled?: boolean;
  oneclickEnabled?: boolean;
  binanceEnabled?: boolean;
  redotpayEnabled?: boolean;
}

export interface StoreSettings {
  storeName: string;
  storeSlug: string;
  storeSubtitle: string;
  logoLetter: string;
  logoImageUrl?: string;
  adminNotificationEmail?: string;
  tickerItems?: TickerItem[];
  tickerEnabled?: boolean;
  dollarRate?: number; // USD exchange rate in DZD (e.g. 250)
  paymentGateways?: PaymentGatewaysConfig;
  oneclickApiKey?: string;
  chargilyApiKey?: string;
  redotpayId?: string;
  redotpayAccountName?: string;
  binanceUid?: string;
  binanceAddress?: string;
}

export const DEFAULT_TICKER_ITEMS: TickerItem[] = [
  { text: "دعم متوفر 24/7", icon: "🎧" },
  { text: "أسعار تنافسية", icon: "⭐" },
  { text: "تسليم فوري وآمن", icon: "🚀" },
  { text: "مرحباً بك في متجرنا", icon: "✨" }
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
  dollarRate: 250,
  paymentGateways: {
    chargilyEnabled: true,
    oneclickEnabled: true,
    binanceEnabled: true,
    redotpayEnabled: true,
  },
  oneclickApiKey: '',
  chargilyApiKey: '',
  redotpayId: '1622725404',
  redotpayAccountName: 'Lokmanosky',
  binanceUid: '427636242',
  binanceAddress: '0xf0782cc454c9f0b273a11aba636fac62f18b24dd',
};

const StoreSettingsContext = createContext<StoreSettings>(defaultSettings);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  useEffect(() => {
    // Real-time listener for public store settings
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
        setSettings(prev => ({
          ...defaultSettings,
          ...combined,
          tickerItems: combined.tickerItems && Array.isArray(combined.tickerItems) && combined.tickerItems.length > 0
            ? combined.tickerItems
            : DEFAULT_TICKER_ITEMS,
          tickerEnabled: combined.tickerEnabled !== undefined ? combined.tickerEnabled : true,
          paymentGateways: {
            chargilyEnabled: combined.paymentGateways?.chargilyEnabled ?? true,
            oneclickEnabled: combined.paymentGateways?.oneclickEnabled ?? true,
            binanceEnabled: combined.paymentGateways?.binanceEnabled ?? true,
            redotpayEnabled: combined.paymentGateways?.redotpayEnabled ?? true,
          },
          oneclickApiKey: combined.oneclickApiKey || '',
          chargilyApiKey: combined.chargilyApiKey || '',
          redotpayId: combined.redotpayId || '1622725404',
          redotpayAccountName: combined.redotpayAccountName || 'Lokmanosky',
          binanceUid: combined.binanceUid || '427636242',
          binanceAddress: combined.binanceAddress || '0xf0782cc454c9f0b273a11aba636fac62f18b24dd',
        } as StoreSettings));
      }
    }, () => {});

    return () => unsub();
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
  
  await setDoc(doc(db, 'settings', 'store'), publicSettings, { merge: true });
  if (Object.keys(privateSettings).length > 0) {
    await setDoc(doc(db, 'settings', 'private'), privateSettings, { merge: true });
  }
}
