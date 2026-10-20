'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n-context';
import { ShieldCheck, Zap, Award, Headphones, ArrowLeft, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const { lang, t } = useTranslation();

  const content = {
    ar: {
      title: 'من نحن',
      subtitle: 'وجهتكم الموثوقة للمنتجات الرقمية وخدمات الألعاب في الجزائر',
      welcome: 'مرحباً بكم في Lokstor',
      intro1: 'تأسس متجر Lokstor بهدف توفير أفضل المنتجات الرقمية (شحن الألعاب، الاشتراكات الترفيهية والإنتاجية، البرمجيات والبطاقات الرقمية) بأسعار تنافسية وطرق دفع محلية آمنة وموثوقة.',
      intro2: 'نقدم حلول دفع ميسرة تناسب جميع عملائنا في الجزائر عبر البطاقة الذهبية، بطاقة CIB، بالإضافة إلى المحافظ الرقمية مثل Binance و RedotPay.',
      visionTitle: 'رؤيتنا',
      visionText: 'نسعى لأن نكون المنصة الرقمية الرائدة في الجزائر وشمال أفريقيا في تقديم الخدمات والمنتجات الرقمية الموثوقة مع تسليم فوري وتجربة تسوق سلسة تحترم أعلى معايير الأمان والخصوصية.',
      whyTitle: 'لماذا تختار Lokstor؟',
      features: [
        { title: 'تسليم فوري وتلقائي', desc: 'يصلك كود التفعيل أو رابط التحميل فوراً بعد إتمام الدفع بنجاح.', icon: Zap },
        { title: 'دفع إلكتروني آمن 100%', desc: 'تشفير عالي ومعالجة رسمية بالتعاون مع بوابة Chargily المعتمدة.', icon: ShieldCheck },
        { title: 'منتجات رسمية وأصلية', desc: 'جميع الأكواد والاشتراكات أصلية ومضمونة بدون أي مخاطر.', icon: Award },
        { title: 'دعم فني متواصل', desc: 'فريقنا جاهز لمساعدتك عبر تلغرام والبريد الإلكتروني في أي وقت.', icon: Headphones },
      ],
      backHome: 'العودة للمتجر',
    },
    en: {
      title: 'About Us',
      subtitle: 'Your trusted destination for digital goods and gaming services in Algeria',
      welcome: 'Welcome to Lokstor',
      intro1: 'Lokstor was created to provide the best digital products (game top-ups, streaming and productivity subscriptions, software, and digital gift cards) at competitive prices and with secure local payment options.',
      intro2: 'We offer accessible payment methods tailored for our customers in Algeria, including Edahabia, CIB cards, as well as digital options like Binance Pay and RedotPay.',
      visionTitle: 'Our Vision',
      visionText: 'We strive to be the leading digital marketplace across Algeria and North Africa, empowering customers with instant access to authentic digital goods backed by world-class security and customer-first support.',
      whyTitle: 'Why Choose Lokstor?',
      features: [
        { title: 'Instant Automated Delivery', desc: 'Receive your activation key or download link immediately upon payment.', icon: Zap },
        { title: '100% Secure Payments', desc: 'Bank-grade encryption powered by the certified Chargily payment gateway.', icon: ShieldCheck },
        { title: 'Genuine & Official Products', desc: 'All keys, subscriptions, and digital assets are fully licensed and guaranteed.', icon: Award },
        { title: 'Dedicated Customer Support', desc: 'Our responsive team is available on Telegram and email whenever you need help.', icon: Headphones },
      ],
      backHome: 'Back to Store',
    },
    fr: {
      title: 'À Propos de Nous',
      subtitle: 'Votre référence pour les produits numériques et recharges de jeux en Algérie',
      welcome: 'Bienvenue chez Lokstor',
      intro1: 'Lokstor a été créé afin d’offrir les meilleurs produits numériques (recharges de jeux, abonnements de streaming et de travail, logiciels et cartes cadeaux) à des tarifs compétitifs avec des modes de paiement locaux et fiables.',
      intro2: 'Nous proposons des moyens de paiement simples et sécurisés pour tous nos clients en Algérie : cartes Edahabia, CIB, ainsi que des solutions internationales comme Binance Pay et RedotPay.',
      visionTitle: 'Notre Vision',
      visionText: 'Devenir la plateforme numérique de référence en Algérie et au Maghreb, garantissant une livraison instantanée, une sécurité maximale et une expérience d’achat moderne et fluide.',
      whyTitle: 'Pourquoi Choisir Lokstor ?',
      features: [
        { title: 'Livraison Immédiate & Automatisée', desc: 'Recevez votre clé d’activation ou lien de téléchargement aussitôt le paiement validé.', icon: Zap },
        { title: 'Paiement 100% Sécurisé', desc: 'Transactions cryptées et protégées via la passerelle officielle Chargily.', icon: ShieldCheck },
        { title: 'Produits Officiels & Authentiques', desc: 'Toutes nos licences et tous nos abonnements sont d’origine et pleinement garantis.', icon: Award },
        { title: 'Support Client Réactif', desc: 'Une assistance humaine disponible sur Telegram et par e-mail pour vous accompagner.', icon: Headphones },
      ],
      backHome: 'Retour à la boutique',
    }
  };

  const data = content[lang] || content.ar;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 min-h-[75vh]" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-10 space-y-2 border-b border-[var(--store-border)] pb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--store-text-muted)] hover:text-[var(--store-primary)] font-semibold mb-3 transition-colors">
          <BackArrow className="w-3.5 h-3.5" />
          <span>{data.backHome}</span>
        </Link>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--store-text)] tracking-tight">
          {data.title}
        </h1>
        <p className="text-sm text-[var(--store-text-muted)]">
          {data.subtitle}
        </p>
      </div>

      {/* Main Body */}
      <div className="space-y-8 text-[var(--store-text)] leading-relaxed">
        <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-xl font-bold text-[var(--store-primary)]">{data.welcome}</h2>
          <p className="text-sm sm:text-base text-[var(--store-text-muted)]">{data.intro1}</p>
          <p className="text-sm sm:text-base text-[var(--store-text-muted)]">{data.intro2}</p>
        </div>

        <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 sm:p-8 space-y-3 shadow-xs">
          <h2 className="text-xl font-bold text-[var(--store-text)]">{data.visionTitle}</h2>
          <p className="text-sm sm:text-base text-[var(--store-text-muted)]">{data.visionText}</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--store-text)]">{data.whyTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.features.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div key={idx} className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-xl p-5 space-y-2 hover:border-[var(--store-primary)]/40 transition-colors shadow-2xs">
                  <div className="w-9 h-9 rounded-lg bg-[var(--store-primary)]/10 text-[var(--store-primary)] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-sm text-[var(--store-text)]">{feat.title}</h3>
                  <p className="text-xs text-[var(--store-text-muted)] leading-normal">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
