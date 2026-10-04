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
    'product.requiredGameInfo': 'البيانات المطلوبة لتنفيذ الطلب:',
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
    // Footer translations
    'footer.subtitle': 'متجر المنتجات الرقمية الجزائري',
    'footer.about': 'من نحن',
    'footer.terms': 'الشروط والأحكام',
    'footer.shippingReturns': 'سياسة الشحن والإرجاع',
    'footer.privacy': 'سياسة الخصوصية',
    'footer.faq': 'الأسئلة الشائعة',
    'footer.paymentMethods': 'طرق الدفع المدعومة',
    'footer.edahabia': 'البطاقة الذهبية',
    'footer.cib': 'بطاقة CIB',
    'footer.security': 'الضمان والأمان',
    'footer.securityDesc': 'جميع العمليات محمية بتشفير عالي الأمان عبر بوابة Chargily الرسمية.',
    'footer.rights': 'جميع الحقوق محفوظة.',
    'footer.country': 'الجزائر 🇩🇿',
    'footer.powered': 'مدعوم بـ Chargily',

    // Checkout Page translations
    'checkout.back': 'العودة لصفحة تفاصيل المنتج',
    'checkout.title': 'تأكيد الطلب وإتمام الدفع',
    'checkout.subtitle': 'اختر وسيلة الدفع المناسبة لك، وسيصلك رابط التفعيل والتحميل فوراً',
    'checkout.orderSummary': 'ملخص الفاتورة',
    'checkout.defaultType': 'اشتراك / ملف رقمي',
    'checkout.productPrice': 'سعر المنتج:',
    'checkout.deliveryMethod': 'طريقة التسليم:',
    'checkout.instantDelivery': 'تفعيل وتسليم فوري',
    'checkout.totalAmount': 'المبلغ الإجمالي:',
    'checkout.cryptoEq': '(أو ما يعادله بـ USDT / RedotPay)',
    'checkout.guaranteeBadge': 'معاملاتك مؤمنة بالكامل مع تسليم فوري وتوثيق رسمي للطلب.',
    'checkout.selectMethod': 'اختر وسيلة الدفع',
    'checkout.edahabiaCib': 'البطاقة الذهبية / CIB',
    'checkout.chargilyDesc': 'دفع إلكتروني آمن وفوري عبر Chargily',
    'checkout.redotpay': 'محفظة RedotPay',
    'checkout.redotpayDesc': 'تحويل بالـ ID فوري بدون رسوم (0% عمولة)',
    'checkout.binance': 'بايننس (Binance)',
    'checkout.binanceFee': '0% رسوم Pay',
    'checkout.binanceDesc': 'تحويل داخلي بالـ UID (مجاني 0%) أو إيداع USDT (BEP20)',
    'checkout.accountRecognized': 'تم التعرف على حسابك',
    'checkout.autoFilled': 'تم ملء بيانات الدفع والتسليم تلقائياً بحسابك',
    'checkout.autoBadge': 'ملء آلي',
    'checkout.fullName': 'الاسم الكامل',
    'checkout.namePlaceholder': 'مثال: محمد الأمين',
    'checkout.email': 'البريد الإلكتروني',
    'checkout.emailPlaceholder': 'name@example.com',
    'checkout.emailNotice': 'ملاحظة: تأكد من صحة البريد لتلقي تفاصيل الشراء وإشعار التفعيل.',
    'checkout.chargilyNoticeTitle': 'الدفع محمي بواسطة Chargily Pay',
    'checkout.chargilyNoticeDesc': 'عند النقر على الزر أدناه، سيتم توجيهك إلى صفحة الدفع الآمنة الخاصة بـ Chargily لإتمام العملية باستخدام البطاقة الذهبية أو بطاقة CIB.',
    'checkout.payBtn': 'متابعة لصفحة الدفع',
    'checkout.preparing': 'جاري تجهيز وتوجيه الدفع...',
    'checkout.outOfStock': 'عذراً، لقد نفذت جميع الكميات المتاحة من هذا المنتج حالياً.',
    'checkout.outOfStockTitle': 'عذراً، المنتج غير متوفر',
    'checkout.backToStore': 'العودة للمتجر',
    'checkout.loading': 'جاري تحميل بيانات الشراء...',
    // Admin translations
    'nav.adminDashboard': 'الرئيسية',
    'nav.adminOrders': 'الطلبات',
    'nav.adminAbandoned': 'المتروكة',
    'nav.adminProducts': 'المنتجات',
    'nav.adminInventory': 'المخزون',
    'nav.adminSettings': 'الإعدادات',
    'nav.backToStore': 'العودة للمتجر',
    'admin.dashboardTitle': 'لوحة التحكم',
    'admin.store': 'المتجر',
    'admin.logout': 'خروج',
    'admin.darkMode': 'الوضع الليلي',
    'admin.lightMode': 'الوضع النهاري',
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
    'product.requiredGameInfo': 'Required details for processing:',
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
    // Footer translations
    'footer.subtitle': 'The Algerian Digital Products Store',
    'footer.about': 'About Us',
    'footer.terms': 'Terms & Conditions',
    'footer.shippingReturns': 'Shipping & Returns',
    'footer.privacy': 'Privacy Policy',
    'footer.faq': 'FAQ',
    'footer.paymentMethods': 'Supported Payment Methods',
    'footer.edahabia': 'Edahabia Card',
    'footer.cib': 'CIB Card',
    'footer.security': 'Security & Guarantee',
    'footer.securityDesc': 'All transactions are protected with high-level encryption via official Chargily gateway.',
    'footer.rights': 'All rights reserved.',
    'footer.country': 'Algeria 🇩🇿',
    'footer.powered': 'Powered by Chargily',

    // Checkout Page translations
    'checkout.back': 'Back to product details',
    'checkout.title': 'Confirm Order & Complete Payment',
    'checkout.subtitle': 'Choose your preferred payment method, and you will receive your activation link instantly',
    'checkout.orderSummary': 'Order Summary',
    'checkout.defaultType': 'Subscription / Digital File',
    'checkout.productPrice': 'Product Price:',
    'checkout.deliveryMethod': 'Delivery Method:',
    'checkout.instantDelivery': 'Instant Activation & Delivery',
    'checkout.totalAmount': 'Total Amount:',
    'checkout.cryptoEq': '(or equivalent in USDT / RedotPay)',
    'checkout.guaranteeBadge': 'Your transactions are fully secured with instant delivery and official order documentation.',
    'checkout.selectMethod': 'Choose Payment Method',
    'checkout.edahabiaCib': 'Edahabia Card / CIB',
    'checkout.chargilyDesc': 'Secure & instant online payment via Chargily',
    'checkout.redotpay': 'RedotPay Wallet',
    'checkout.redotpayDesc': 'Instant ID transfer without fees (0% fee)',
    'checkout.binance': 'Binance Pay',
    'checkout.binanceFee': '0% Pay Fee',
    'checkout.binanceDesc': 'Internal UID transfer (Free 0%) or USDT (BEP20) deposit',
    'checkout.accountRecognized': 'Account recognized',
    'checkout.autoFilled': 'Your payment and delivery details were auto-filled',
    'checkout.autoBadge': 'Auto-filled',
    'checkout.fullName': 'Full Name',
    'checkout.namePlaceholder': 'e.g. John Doe',
    'checkout.email': 'Email Address',
    'checkout.emailPlaceholder': 'name@example.com',
    'checkout.emailNotice': 'Note: Make sure your email is correct to receive purchase details and activation notice.',
    'checkout.chargilyNoticeTitle': 'Payment Secured by Chargily Pay',
    'checkout.chargilyNoticeDesc': 'Clicking below redirects you to Chargily secure payment gateway to pay with Edahabia or CIB card.',
    'checkout.payBtn': 'Proceed to Payment',
    'checkout.preparing': 'Preparing checkout redirect...',
    'checkout.outOfStock': 'Sorry, this product is currently out of stock.',
    'checkout.outOfStockTitle': 'Sorry, product unavailable',
    'checkout.backToStore': 'Back to store',
    'checkout.loading': 'Loading checkout data...',
    // Admin translations
    'nav.adminDashboard': 'Dashboard',
    'nav.adminOrders': 'Orders',
    'nav.adminAbandoned': 'Abandoned Carts',
    'nav.adminProducts': 'Products',
    'nav.adminInventory': 'Inventory',
    'nav.adminSettings': 'Settings',
    'nav.backToStore': 'Back to Store',
    'admin.dashboardTitle': 'Dashboard',
    'admin.store': 'Store',
    'admin.logout': 'Logout',
    'admin.darkMode': 'Dark Mode',
    'admin.lightMode': 'Light Mode',
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
    'product.requiredGameInfo': 'Informations requises pour le traitement :',
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
    // Footer translations
    'footer.subtitle': 'La boutique algérienne de produits numériques',
    'footer.about': 'À propos',
    'footer.terms': 'Conditions Générales',
    'footer.shippingReturns': 'Livraison & Retours',
    'footer.privacy': 'Politique de Confidentialité',
    'footer.faq': 'FAQ',
    'footer.paymentMethods': 'Moyens de Paiement Acceptés',
    'footer.edahabia': 'Carte Edahabia',
    'footer.cib': 'Carte CIB',
    'footer.security': 'Sécurité & Garantie',
    'footer.securityDesc': 'Toutes les transactions sont protégées par un cryptage hautement sécurisé via Chargily.',
    'footer.rights': 'Tous droits réservés.',
    'footer.country': 'Algérie 🇩🇿',
    'footer.powered': 'Propulsé par Chargily',

    // Checkout Page translations
    'checkout.back': 'Retour aux détails du produit',
    'checkout.title': 'Confirmer la commande et payer',
    'checkout.subtitle': 'Choisissez votre moyen de paiement, et recevez votre lien d’activation instantanément',
    'checkout.orderSummary': 'Récapitulatif de la commande',
    'checkout.defaultType': 'Abonnement / Fichier numérique',
    'checkout.productPrice': 'Prix du produit :',
    'checkout.deliveryMethod': 'Mode de livraison :',
    'checkout.instantDelivery': 'Activation et livraison instantanées',
    'checkout.totalAmount': 'Montant Total :',
    'checkout.cryptoEq': '(ou équivalent en USDT / RedotPay)',
    'checkout.guaranteeBadge': 'Vos transactions sont entièrement sécurisées avec livraison instantanée et reçu officiel.',
    'checkout.selectMethod': 'Choisir le mode de paiement',
    'checkout.edahabiaCib': 'Carte Edahabia / CIB',
    'checkout.chargilyDesc': 'Paiement en ligne sécurisé et instantané via Chargily',
    'checkout.redotpay': 'Portefeuille RedotPay',
    'checkout.redotpayDesc': 'Transfert par ID instantané sans frais (0% commission)',
    'checkout.binance': 'Binance Pay',
    'checkout.binanceFee': '0% frais Pay',
    'checkout.binanceDesc': 'Transfert interne par UID (0% gratuit) ou dépôt USDT (BEP20)',
    'checkout.accountRecognized': 'Compte reconnu',
    'checkout.autoFilled': 'Vos coordonnées de paiement ont été remplies automatiquement',
    'checkout.autoBadge': 'Auto-rempli',
    'checkout.fullName': 'Nom complet',
    'checkout.namePlaceholder': 'Ex: Jean Dupont',
    'checkout.email': 'Adresse e-mail',
    'checkout.emailPlaceholder': 'nom@exemple.com',
    'checkout.emailNotice': "Remarque : Vérifiez bien votre e-mail pour recevoir les détails de l'achat et du téléchargement.",
    'checkout.chargilyNoticeTitle': 'Paiement sécurisé par Chargily Pay',
    'checkout.chargilyNoticeDesc': 'En cliquant ci-dessous, vous serez redirigé vers la page sécurisée de Chargily pour payer par Edahabia ou CIB.',
    'checkout.payBtn': 'Procéder au paiement',
    'checkout.preparing': 'Préparation du paiement...',
    'checkout.outOfStock': 'Désolé, ce produit est actuellement en rupture de stock.',
    'checkout.outOfStockTitle': 'Désolé, produit non disponible',
    'checkout.backToStore': 'Retour à la boutique',
    'checkout.loading': 'Chargement des données de paiement...',
    // Admin translations
    'nav.adminDashboard': 'Tableau de bord',
    'nav.adminOrders': 'Commandes',
    'nav.adminAbandoned': 'Paniers abandonnés',
    'nav.adminProducts': 'Produits',
    'nav.adminInventory': 'Stock',
    'nav.adminSettings': 'Paramètres',
    'nav.backToStore': 'Retour au magasin',
    'admin.dashboardTitle': 'Tableau de bord',
    'admin.store': 'Boutique',
    'admin.logout': 'Déconnexion',
    'admin.darkMode': 'Mode sombre',
    'admin.lightMode': 'Mode clair',
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
