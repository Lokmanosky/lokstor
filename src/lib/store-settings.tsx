'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface StoreSettings {
  storeName: string;
  storeSlug: string;
  storeSubtitle: string;
  logoLetter: string;
  logoImageUrl?: string;
}

const defaultSettings: StoreSettings = {
  storeName: 'Lokstor',
  storeSlug: 'lokstor',
  storeSubtitle: 'متجر المنتجات الرقمية الجزائري',
  logoLetter: 'L',
  logoImageUrl: '',
};

const StoreSettingsContext = createContext<StoreSettings>(defaultSettings);

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultSettings);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'store'));
        if (snap.exists()) {
          setSettings({ ...defaultSettings, ...snap.data() } as StoreSettings);
        }
      } catch (e) {
        // fallback to defaults
      }
    }
    load();
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
  await setDoc(doc(db, 'settings', 'store'), settings, { merge: true });
}
