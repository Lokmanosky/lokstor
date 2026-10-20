'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n-context';
import { ArrowLeft, ArrowRight, ShieldCheck, Lock, Eye, Database } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  const { lang, t } = useTranslation();

  const content = {
    ar: {
      title: 'سياسة الخصوصية',
      subtitle: 'نلتزم بحماية بياناتك الشخصية وضمان سرية وأمان معلوماتك عند الشراء',
      backHome: 'العودة للمتجر',
      lastUpdated: 'آخر تحديث: 2026',
      intro: 'نحن في متجر Lokstor نعتبر خصوصية وأمان بياناتك أولوية قصوى. توضح هذه السياسة كيف نجمع بياناتك ونستخدمها ونحميها عند استخدامك لمتجرنا.',
      pillars: [
        {
          title: 'عدم تخزين بيانات البطاقات المصرفية',
          desc: 'نحن لا نطلع ولا نخزن إطلاقاً أي أرقام بطاقات بنكية (CIB أو الذهبية) أو كلمات سر سرية. تتم كافة العمليات المالية عبر خوادم مشفرة مباشرة لدى بوابة Chargily الرسمية.',
          icon: Lock
        },
        {
          title: 'البيانات التي نجمعها فقط',
          desc: 'نجمع فقط المعلومات الضرورية لإتمام طلبك وتسليم المنتج: البريد الإلكتروني (لتسليم الكود)، والاسم، ومعرف الحساب للعبة إذا كان المنتج شحناً مباشراً.',
          icon: Database
        },
        {
          title: 'الاستخدام الآمن للمعلومات',
          desc: 'تُستخدم بياناتك فقط لإرسال التفعيلات، الفواتير، ومتابعة حالة طلبك مع الدعم الفني، ولن يتم بيع أو مشاركة بياناتك مع أي جهات خارجية لأغراض إعلانية إطلاقاً.',
          icon: Eye
        },
        {
          title: 'حماية وتشفير عالي المستوى',
          desc: 'يعتمد الموقع تقنيات التشفير الحديثة (SSL/TLS) لحماية كل جلسة تصفح ومعاملة، مع تطبيق معايير الأمان لحسابك وطلباتك المخزنة سحابياً.',
          icon: ShieldCheck
        }
      ]
    },
    en: {
      title: 'Privacy Policy',
      subtitle: 'We are committed to protecting your personal data and ensuring confidentiality throughout your shopping experience',
      backHome: 'Back to Store',
      lastUpdated: 'Last Updated: 2026',
      intro: 'At Lokstor, your privacy and data security are paramount. This policy outlines what information we collect, how it is utilized, and the safeguards in place to protect your details.',
      pillars: [
        {
          title: 'No Financial Data Storage',
          desc: 'We never store or have access to your credit or debit card numbers (Edahabia or CIB). Payments are processed securely and directly through encrypted Chargily bank servers.',
          icon: Lock
        },
        {
          title: 'Information We Collect',
          desc: 'We only collect details strictly necessary to fulfill your digital order: your email address (for key delivery), customer name, and player ID when game top-up is requested.',
          icon: Database
        },
        {
          title: 'Responsible Data Use',
          desc: 'Your contact details are used exclusively to deliver digital keys, order receipts, and customer service follow-ups. We do not sell or distribute personal data to third parties.',
          icon: Eye
        },
        {
          title: 'End-to-End Encryption',
          desc: 'Our store operates over secure HTTPS connections protected by modern SSL/TLS encryption, ensuring your interactions and account sessions remain safe.',
          icon: ShieldCheck
        }
      ]
    },
    fr: {
      title: 'Politique de Confidentialité',
      subtitle: 'Nous nous engageons à protéger vos données personnelles et à assurer la confidentialité de vos achats',
      backHome: 'Retour à la boutique',
      lastUpdated: 'Dernière mise à jour : 2026',
      intro: 'Chez Lokstor, la confidentialité et la protection de vos données sont au cœur de nos priorités. Cette charte précise comment vos informations sont collectées, traitées et sécurisées.',
      pillars: [
        {
          title: 'Aucun Stockage des Données Bancaires',
          desc: 'Nous ne collectons ni ne conservons jamais les numéros de vos cartes (Edahabia ou CIB). L’ensemble des flux financiers est chiffré et traité directement par la passerelle agréée Chargily.',
          icon: Lock
        },
        {
          title: 'Données Collectées',
          desc: 'Nous recueillons uniquement les informations requises pour la bonne délivrance de vos commandes : votre adresse e-mail (réception des clés), votre nom et l’ID de jeu pour les recharges directes.',
          icon: Database
        },
        {
          title: 'Usage Strict des Informations',
          desc: 'Vos coordonnées servent exclusivement à l’envoi des clés, des factures et au suivi après-vente. Aucune cession de données à des fins publicitaires n’est opérée.',
          icon: Eye
        },
        {
          title: 'Chiffrement & Sécurité Avancée',
          desc: 'La plateforme applique les standards de sécurité les plus récents (HTTPS, SSL/TLS), garantissant l’intégrité et la confidentialité de vos échanges et de votre compte.',
          icon: ShieldCheck
        }
      ]
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
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--store-text)] tracking-tight">
            {data.title}
          </h1>
          <span className="text-xs text-[var(--store-text-muted)] font-mono bg-[var(--store-card)] border border-[var(--store-border)] px-3 py-1 rounded-full">
            {data.lastUpdated}
          </span>
        </div>
        <p className="text-sm text-[var(--store-text-muted)]">
          {data.subtitle}
        </p>
      </div>

      {/* Intro box */}
      <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 sm:p-7 text-sm sm:text-base text-[var(--store-text)] leading-relaxed shadow-xs mb-8">
        <div className="flex items-center gap-2.5 text-[var(--store-primary)] font-bold mb-2">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>Data Protection Policy</span>
        </div>
        <p className="text-[var(--store-text-muted)]">{data.intro}</p>
      </div>

      {/* Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.pillars.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 space-y-3 hover:border-[var(--store-primary)]/40 transition-colors shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-[var(--store-primary)]/10 text-[var(--store-primary)] flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-[var(--store-text)]">{item.title}</h2>
              <p className="text-xs sm:text-sm text-[var(--store-text-muted)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
