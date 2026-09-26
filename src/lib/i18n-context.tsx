'use client';
import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

type Lang = 'ar' | 'en' | 'fr';

const translations: Record<Lang, Record<string, string>> = {
  ar: {
    'nav.all': 'الكل',
    'nav.digital': 'منتجات رقمية',
    'nav.subs': 'اشتراكات',
    'nav.search': 'البحث عن منتجات...',
    'nav.login': 'تسجيل الدخول',
    'nav.register': 'إنشاء حساب',
    'hero.badge': 'متجر المنتجات الرقمية الأول في الجزائر',
    'hero.title1': 'أفضل',
    'hero.title2': 'المنتجات الرقمية',
    'hero.title3': 'بدفع إلكتروني آمن',
    'hero.desc': 'كتب، قوالب جاهزة، واشتراكات مدفوعة مع تسليم فوري وتلقائي مباشرة بعد الدفع.',
    'feat.instant': 'تسليم تلقائي وفوري',
    'feat.secure': 'دفع عبر بوابة Chargily',
    'feat.hq': 'ملفات أصلية عالية الجودة',
    'btn.add': 'أضف للسلة',
    'badge.digital': 'رقمي',
    'badge.sub': 'اشتراك',
  },
  en: {
    'nav.all': 'All',
    'nav.digital': 'Digital',
    'nav.subs': 'Subscriptions',
    'nav.search': 'Search products...',
    'nav.login': 'Login',
    'nav.register': 'Register',
    'hero.badge': 'The #1 Digital Products Store in Algeria',
    'hero.title1': 'The Best',
    'hero.title2': 'Digital Products',
    'hero.title3': 'with Secure Payment',
    'hero.desc': 'Books, templates, and premium subscriptions with instant and automatic delivery after payment.',
    'feat.instant': 'Instant Delivery',
    'feat.secure': 'Secure via Chargily',
    'feat.hq': 'High Quality Original Files',
    'btn.add': 'Add to Cart',
    'badge.digital': 'Digital',
    'badge.sub': 'Subscription',
  },
  fr: {
    'nav.all': 'Tout',
    'nav.digital': 'Numériques',
    'nav.subs': 'Abonnements',
    'nav.search': 'Rechercher des produits...',
    'nav.login': 'Se connecter',
    'nav.register': "S'inscrire",
    'hero.badge': 'Le premier magasin de produits numériques en Algérie',
    'hero.title1': 'Les Meilleurs',
    'hero.title2': 'Produits Numériques',
    'hero.title3': 'avec Paiement Sécurisé',
    'hero.desc': 'Livres, modèles et abonnements premium avec livraison immédiate et automatique après paiement.',
    'feat.instant': 'Livraison Instantanée',
    'feat.secure': 'Sécurisé via Chargily',
    'feat.hq': 'Fichiers Originaux de Haute Qualité',
    'btn.add': 'Ajouter au Panier',
    'badge.digital': 'Numérique',
    'badge.sub': 'Abonnement',
  }
};

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'ar',
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ar');

  useEffect(() => {
    const saved = localStorage.getItem('lokstor_lang') as Lang;
    if (saved && translations[saved]) {
      setLang(saved);
      document.documentElement.lang = saved;
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const handleSetLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('lokstor_lang', newLang);
    document.documentElement.lang = newLang;
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const t = (key: string) => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
