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
    'btn.buy': 'الشراء',
    'store.addCart': 'الشراء',
    'badge.digital': 'رقمي',
    'badge.sub': 'اشتراك',

    // Common & Breadcrumbs
    'common.home': 'الرئيسية',
    'common.currency': 'د.ج',
    'common.copied': 'تم النسخ!',
    'category.games': 'شحن ألعاب',
    'category.digital': 'منتجات رقمية',
    'category.subs': 'اشتراكات',

    // Product Details
    'product.selectedPackage': 'الباقة المحددة:',
    'product.choosePackage': 'اختر ما يناسبك:',
    'product.requiredGameInfo': 'بيانات حساب اللعبة المطلوبة للشحن:',
    'product.confidential': 'معلومات سرية ومحمية 🔒',
    'product.fieldRequired': 'هذا الحقل مطلوب للشحن',
    'product.features': 'المميزات المشمولة:',
    'product.buyAndPay': 'الشراء والدفع',
    'product.outOfStock': 'تم نفاذ المخزون',
    'product.outOfStockAlert': 'تم نفاذ المخزون من هذا المنتج حالياً',
    'product.addToCart': 'إضافة إلى السلة',
    'product.outOfStockTooltip': 'المنتج غير متوفر في المخزون',
    'product.guaranteeSecure': 'دفع إلكتروني آمن 100% عبر Chargily',
    'product.guaranteeInstant': 'تنفيذ وشحن فوري وسريع',
    'product.zoomHint': 'استعراض وتكبير الصورة',
    'product.shareTooltip': 'مشاركة رابط المنتج',
    'product.favTooltip': 'إضافة للمفضلة',
    'product.loginToast': 'يرجى تسجيل الدخول أولاً لإضافة المنتج إلى السلة',
    'product.loginBtn': 'تسجيل دخول',

    // Game fields
    'field.gameEmail': 'البريد الإلكتروني للعبة (Call Of Duty / Activision)',
    'field.gamePassword': 'كلمة المرور (Password)',
    'field.playerId': 'معرف اللاعب (Player ID)',
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
    'btn.buy': 'Buy',
    'store.addCart': 'Add to Cart',
    'badge.digital': 'Digital',
    'badge.sub': 'Subscription',

    // Common & Breadcrumbs
    'common.home': 'Home',
    'common.currency': 'DZD',
    'common.copied': 'Copied!',
    'category.games': 'Game Top-Up',
    'category.digital': 'Digital Products',
    'category.subs': 'Subscriptions',

    // Product Details
    'product.selectedPackage': 'Selected Package:',
    'product.choosePackage': 'Choose your package:',
    'product.requiredGameInfo': 'Required game account details for recharge:',
    'product.confidential': 'Confidential & Secure 🔒',
    'product.fieldRequired': 'This field is required for recharge',
    'product.features': 'Included Features:',
    'product.buyAndPay': 'Buy & Pay',
    'product.outOfStock': 'Out of Stock',
    'product.outOfStockAlert': 'This product is currently out of stock',
    'product.addToCart': 'Add to Cart',
    'product.outOfStockTooltip': 'Product is out of stock',
    'product.guaranteeSecure': '100% Secure Online Payment via Chargily',
    'product.guaranteeInstant': 'Instant & Fast Execution and Recharge',
    'product.zoomHint': 'Click to view & zoom image',
    'product.shareTooltip': 'Share product link',
    'product.favTooltip': 'Add to favorites',
    'product.loginToast': 'Please log in first to add the product to cart',
    'product.loginBtn': 'Login',

    // Game fields
    'field.gameEmail': 'Game Email (Call Of Duty / Activision)',
    'field.gamePassword': 'Password',
    'field.playerId': 'Player ID',
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
    'btn.buy': 'Acheter',
    'store.addCart': 'Ajouter au Panier',
    'badge.digital': 'Numérique',
    'badge.sub': 'Abonnement',

    // Common & Breadcrumbs
    'common.home': 'Accueil',
    'common.currency': 'DZD',
    'common.copied': 'Copié !',
    'category.games': 'Recharge de jeux',
    'category.digital': 'Produits Numériques',
    'category.subs': 'Abonnements',

    // Product Details
    'product.selectedPackage': 'Pack sélectionné :',
    'product.choosePackage': 'Choisissez votre offre :',
    'product.requiredGameInfo': 'Informations du compte de jeu requises pour la recharge :',
    'product.confidential': 'Confidentiel et sécurisé 🔒',
    'product.fieldRequired': 'Ce champ est requis pour la recharge',
    'product.features': 'Fonctionnalités incluses :',
    'product.buyAndPay': 'Acheter et Payer',
    'product.outOfStock': 'Rupture de Stock',
    'product.outOfStockAlert': 'Ce produit est actuellement en rupture de stock',
    'product.addToCart': 'Ajouter au Panier',
    'product.outOfStockTooltip': 'Produit indisponible en stock',
    'product.guaranteeSecure': 'Paiement en ligne 100% sécurisé via Chargily',
    'product.guaranteeInstant': 'Exécution et recharge instantanées',
    'product.zoomHint': "Cliquer pour agrandir l'image",
    'product.shareTooltip': 'Partager le lien du produit',
    'product.favTooltip': 'Ajouter aux favoris',
    'product.loginToast': 'Veuillez vous connecter pour ajouter au panier',
    'product.loginBtn': 'Connexion',

    // Game fields
    'field.gameEmail': 'Email du jeu (Call Of Duty / Activision)',
    'field.gamePassword': 'Mot de passe',
    'field.playerId': 'ID Joueur (Player ID)',
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
    return translations[lang]?.[key] || translations['ar']?.[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
