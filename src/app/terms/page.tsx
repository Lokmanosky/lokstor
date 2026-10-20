'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n-context';
import { ArrowLeft, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function TermsPage() {
  const { lang, t } = useTranslation();

  const content = {
    ar: {
      title: 'الشروط والأحكام',
      subtitle: 'يرجى قراءة شروط الخدمة بعناية قبل استخدام المتجر أو إتمام أي عملية شراء',
      backHome: 'العودة للمتجر',
      lastUpdated: 'آخر تحديث: 2026',
      intro: 'باستخدامك لموقع ومتجر Lokstor أو إتمامك لأي طلب عبر المنصة، فإنك توافق بشكل صريح وكامل على الالتزام بجميع بنود وشروط هذه الاتفاقية.',
      sections: [
        {
          num: '1',
          title: 'طبيعة المنتجات الرقمية والتسليم',
          desc: 'جميع المنتجات المتوفرة على متجر Lokstor هي سلع وخدمات رقمية غير ملموسة (أكواد شحن، اشتراكات رقمية، ملفات وتراخيص برمجية). بمجرد إتمام الدفع بنجاح، يتم تسليم المنتج فوراً عبر الصفحة أو البريد الإلكتروني.'
        },
        {
          num: '2',
          title: 'شروط الدفع والمعاملات المالية',
          desc: 'تتم جميع المعاملات المالية بالدينار الجزائري (DZD) عبر بوابة Chargily Pay المعتمدة للبطاقة الذهبية وبطاقة CIB، أو عبر وسائل الدفع الرقمية المعتمدة (Binance Pay / RedotPay). يلتزم المشتري بتوفير بيانات صحيحة ومطابقة.'
        },
        {
          num: '3',
          title: 'حقوق الملكية الفكرية والاستخدام',
          desc: 'جميع التراخيص والأكواد والملفات المشتراة مخصصة للاستخدام الشخصي أو المهني المباشر للمشتري. يُحظر تماماً إعادة بيع، توزيع، أو مشاركة المفاتيح الرقمية بشكل غير مصرح به أو يخل بحقوق الناشرين.'
        },
        {
          num: '4',
          title: 'سياسة الاستبدال والضمان',
          desc: 'نضمن صحة وفعالية جميع الأكواد والتراخيص عند التسليم. في حال وجود أي خطأ تقني في الكود أو الحساب المسلم، يتم التحقق منه وتعويضه بكود بديل أو إعادة المبلغ كاملاً وفقاً لسجلات النظام.'
        },
        {
          num: '5',
          title: 'التعديلات على الخدمة والأسعار',
          desc: 'يحتفظ متجر Lokstor بالحق في تحديث الأسعار، العروض، أو بنود هذه الشروط في أي وقت لتحسين جودة الخدمة، وتكون التعديلات سارية بمجرد نشرها على الموقع.'
        }
      ]
    },
    en: {
      title: 'Terms & Conditions',
      subtitle: 'Please review our service terms carefully before using the store or making a purchase',
      backHome: 'Back to Store',
      lastUpdated: 'Last Updated: 2026',
      intro: 'By accessing or purchasing products from the Lokstor store, you acknowledge and agree to be bound by the terms and conditions outlined below.',
      sections: [
        {
          num: '1',
          title: 'Nature of Digital Products & Delivery',
          desc: 'All products sold on Lokstor are intangible digital goods and services (game credits, digital vouchers, software keys, and subscriptions). Products are delivered immediately following verified payment via the confirmation page and email.'
        },
        {
          num: '2',
          title: 'Payment Terms & Processing',
          desc: 'Transactions are processed securely in Algerian Dinars (DZD) via Chargily Pay using Edahabia and CIB cards, or via supported digital channels including Binance Pay and RedotPay. Customers must provide valid contact details for delivery.'
        },
        {
          num: '3',
          title: 'Intellectual Property & Permitted Use',
          desc: 'All license keys, accounts, and deliverables are provided for the direct personal or professional use of the purchaser. Unauthorized distribution, resale, or public sharing of delivered keys is strictly prohibited.'
        },
        {
          num: '4',
          title: 'Replacement & Warranty Policy',
          desc: 'We guarantee that all activation keys and deliverables are fully functional upon receipt. In the event of a verified technical defect, we provide prompt replacement or a full refund in accordance with order logs.'
        },
        {
          num: '5',
          title: 'Modifications & Pricing',
          desc: 'Lokstor reserves the right to modify pricing, offerings, or these terms at any time to reflect operational or regulatory updates. Continued use of the platform constitutes agreement with any revisions.'
        }
      ]
    },
    fr: {
      title: 'Conditions Générales de Vente',
      subtitle: 'Veuillez lire attentivement nos conditions avant d’utiliser la boutique ou d’effectuer un achat',
      backHome: 'Retour à la boutique',
      lastUpdated: 'Dernière mise à jour : 2026',
      intro: 'En accédant au magasin Lokstor ou en passant commande, vous acceptez sans réserve l’ensemble des présentes conditions générales.',
      sections: [
        {
          num: '1',
          title: 'Nature des Produits Numériques & Livraison',
          desc: 'Tous les articles commercialisés sur Lokstor sont des biens numériques immatériels (recharges de jeux, abonnements, clés de logiciels et cartes prépayées). La mise à disposition est immédiate dès confirmation du paiement.'
        },
        {
          num: '2',
          title: 'Modalités de Paiement & Facturation',
          desc: 'Les règlements sont sécurisés et traités en Dinars Algériens (DZD) via la passerelle certifiée Chargily Pay pour les cartes Edahabia et CIB, ou via Binance Pay et RedotPay. L’acheteur s’engage à fournir des coordonnées exactes.'
        },
        {
          num: '3',
          title: 'Propriété Intellectuelle & Usage Autorisé',
          desc: 'Les clés, fichiers et identifiants transmis sont réservés à l’usage personnel ou professionnel légitime de l’acquéreur. Toute revente ou diffusion publique non autorisée est rigoureusement interdite.'
        },
        {
          num: '4',
          title: 'Garantie de Fonctionnement & Remplacement',
          desc: 'Nous certifions la validité de chaque produit au moment de sa livraison. En cas d’anomalie technique avérée lors de l’activation, notre équipe assure le remplacement immédiat ou le remboursement intégral.'
        },
        {
          num: '5',
          title: 'Évolution des Conditions & Tarifs',
          desc: 'Lokstor se réserve le droit d’ajuster ses tarifs ou de modifier les présentes clauses pour préserver la qualité de ses services. Les modifications prennent effet dès leur parution sur la plateforme.'
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
          <FileText className="w-5 h-5 shrink-0" />
          <span>Lokstor Agreement</span>
        </div>
        <p className="text-[var(--store-text-muted)]">{data.intro}</p>
      </div>

      {/* Sections */}
      <div className="space-y-6">
        {data.sections.map((sec, idx) => (
          <div key={idx} className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 sm:p-7 space-y-2 hover:border-[var(--store-primary)]/40 transition-colors shadow-2xs">
            <h2 className="text-base sm:text-lg font-bold text-[var(--store-text)] flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-[var(--store-primary)]/10 text-[var(--store-primary)] font-mono text-sm font-black flex items-center justify-center shrink-0">
                {sec.num}
              </span>
              <span>{sec.title}</span>
            </h2>
            <p className="text-sm text-[var(--store-text-muted)] leading-relaxed ps-10">
              {sec.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
