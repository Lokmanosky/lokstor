'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n-context';
import { ArrowLeft, ArrowRight, Zap, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ShippingReturnsPage() {
  const { lang, t } = useTranslation();

  const content = {
    ar: {
      title: 'سياسة الشحن والإرجاع',
      subtitle: 'تفاصيل التسليم الرقمي الفوري وسياسة الاستبدال والاسترجاع للمنتجات الرقمية',
      backHome: 'العودة للمتجر',
      lastUpdated: 'آخر تحديث: 2026',
      intro: 'نظراً لأن متجر Lokstor متخصص حصرياً في بيع السلع والخدمات الرقمية، فإن آلية الشحن والتسليم فورية وتتم إلكترونياً بالكامل.',
      deliveryTitle: 'سياسة التسليم (الشحن الرقمي الفوري)',
      deliveryPoints: [
        'لا يوجد أي شحن مادي أو طرود بريدية ملموسة.',
        'فور تأكيد عملية الدفع بنجاح، تظهر بيانات التفعيل أو رابط التحميل فوراً على شاشة التأكيد.',
        'يتم إرسال نسخة احتياطية من كود التفعيل وفاتورة الشراء تلقائياً إلى بريدك الإلكتروني.',
        'جميع روابطك وملفاتك السابقة تبقى محفوظة في حسابك تحت قسم "سجل الطلبات" للوصول إليها في أي وقت.'
      ],
      returnsTitle: 'سياسة الاسترجاع والاسترداد المالي',
      returnsDesc: 'نظراً للطبيعة الفورية وغير القابلة للإرجاع للأكواد الرقمية والتراخيص، فإن جميع المبيعات نهائية بمجرد كشف الكود أو تحميل الملف، باستثناء الحالات التالية:',
      exceptions: [
        { title: 'كود غير فعال أو تالف', desc: 'إذا ثبت وجود خلل فني في الكود أو الترخيص ولم نتمكن من توفير بديل صالح له.' },
        { title: 'عدم استلام الطلب نتيجة خلل نظامي', desc: 'في حال تم خصم المبلغ بنجاح دون إنشاء الطلب أو توفير رابط التحميل.' },
        { title: 'نفاد الكمية قبل إتمام المعالجة', desc: 'إذا انتهى المخزون ولم نتمكن من تزويدك بالمنتج في الوقت المناسب.' }
      ],
      supportNote: 'في حال واجهت أي استفسار بخصوص طلبك، تواصل مع فريقنا مباشرة عبر تلغرام برقم الطلب وسنساعدك فوراً.'
    },
    en: {
      title: 'Shipping & Returns Policy',
      subtitle: 'Details regarding instant digital fulfillment, replacements, and refund terms',
      backHome: 'Back to Store',
      lastUpdated: 'Last Updated: 2026',
      intro: 'Because Lokstor exclusively provides digital goods and electronic services, all deliveries are 100% automated, instant, and paperless.',
      deliveryTitle: 'Digital Delivery Policy',
      deliveryPoints: [
        'There are no physical shipments or postal parcels involved.',
        'Immediately after payment confirmation, your activation keys and download links are displayed on screen.',
        'A confirmation email containing your product details and invoice is automatically dispatched to your inbox.',
        'All purchased items remain permanently stored in your account under the "Order History" section for easy re-access.'
      ],
      returnsTitle: 'Refund & Return Policy',
      returnsDesc: 'Due to the instantaneous and non-returnable nature of digital licenses and vouchers, purchases are generally final once delivered, with exceptions for the following situations:',
      exceptions: [
        { title: 'Defective or Invalid Key', desc: 'If an activation key is verified as non-working upon delivery and our support team cannot provide a working replacement.' },
        { title: 'System Delivery Failure', desc: 'If payment was confirmed by your payment gateway but our system failed to generate your digital download link.' },
        { title: 'Out of Stock Situations', desc: 'If a product is unexpectedly unavailable before fulfillment can be completed.' }
      ],
      supportNote: 'If you have any questions or need assistance with your order, please contact our Telegram support team with your order reference ID.'
    },
    fr: {
      title: 'Livraison & Retours',
      subtitle: 'Modalités de distribution numérique immédiate et politique de retour pour les produits digitaux',
      backHome: 'Retour à la boutique',
      lastUpdated: 'Dernière mise à jour : 2026',
      intro: 'Lokstor commercialisant exclusivement des biens dématérialisés, la livraison est entièrement instantanée et électronique.',
      deliveryTitle: 'Politique de Livraison Numérique',
      deliveryPoints: [
        'Aucun colis physique n’est expédié par voie postale.',
        'Dès confirmation de votre règlement, votre lien de téléchargement ou code d’activation s’affiche instantanément à l’écran.',
        'Un e-mail récapitulatif contenant vos accès et votre reçu d’achat vous est automatiquement expédié.',
        'Vos clés et fichiers restent accessibles à tout moment dans votre espace personnel "Mes Commandes".'
      ],
      returnsTitle: 'Politique de Retour & Remboursement',
      returnsDesc: 'En raison de la délivrance instantanée et irréversible des clés d’activation et des fichiers numériques, les ventes sont définitives une fois le produit délivré, sauf dans les cas d’exception suivants :',
      exceptions: [
        { title: 'Clé défectueuse ou invalide', desc: 'Si un code s’avère non fonctionnel dès la réception et que notre support ne peut fournir une alternative valide.' },
        { title: 'Défaut de délivrance technique', desc: 'Si le paiement a été validé par la passerelle mais qu’une défaillance technique empêche l’émission de votre lien.' },
        { title: 'Rupture de stock imprévue', desc: 'Si le produit devient indisponible avant la finalisation de la commande.' }
      ],
      supportNote: 'Pour toute question relative à votre commande, contactez sans attendre notre support sur Telegram en indiquant votre numéro de référence.'
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

      <div className="space-y-8">
        {/* Delivery Section */}
        <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xs">
          <h2 className="text-xl font-bold text-[var(--store-text)] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[var(--store-primary)]" />
            <span>{data.deliveryTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[var(--store-text-muted)] leading-relaxed">
            {data.intro}
          </p>
          <ul className="space-y-2.5 pt-2">
            {data.deliveryPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[var(--store-text)]">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Returns Section */}
        <div className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
          <h2 className="text-xl font-bold text-[var(--store-text)] flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            <span>{data.returnsTitle}</span>
          </h2>
          <p className="text-xs sm:text-sm text-[var(--store-text-muted)] leading-relaxed">
            {data.returnsDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {data.exceptions.map((exc, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-[var(--store-bg)] border border-[var(--store-border)] space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{exc.title}</span>
                </div>
                <p className="text-[11px] text-[var(--store-text-muted)] leading-normal">
                  {exc.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[var(--store-border)]">
            <p className="text-xs text-[var(--store-text-muted)]">
              {data.supportNote}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
