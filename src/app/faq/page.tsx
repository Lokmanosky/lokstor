'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n-context';
import { HelpCircle, ArrowLeft, ArrowRight, ShieldCheck, Mail, Clock } from 'lucide-react';
import Link from 'next/link';

export default function FAQPage() {
  const { lang, t } = useTranslation();

  const content = {
    ar: {
      title: 'الأسئلة الشائعة',
      subtitle: 'كل ما تحتاج لمعرفته حول الشراء، الدفع، واستلام المنتجات الرقمية',
      backHome: 'العودة للمتجر',
      contactBanner: 'لم تجد إجابة لسؤالك؟',
      contactDesc: 'فريق الدعم متاح دائماً على تلغرام والبريد الإلكتروني للرد على جميع استفساراتك.',
      contactBtn: 'تواصل معنا الآن',
      faqs: [
        {
          q: 'هل الدفع في الموقع آمن؟',
          a: 'نعم، الدفع آمن 100%. نستخدم بوابة Chargily الرسمية لتشفير ومعالجة جميع عمليات الدفع بالبطاقة الذهبية وبطاقة CIB وفق معايير الأمان المصرفية العالمية، كما ندعم الدفع الآمن عبر Binance Pay و RedotPay.'
        },
        {
          q: 'كيف أستلم طلبي بعد الدفع؟',
          a: 'بمجرد تأكيد الدفع بنجاح، يظهر زر التحميل أو كود التفعيل فوراً في شاشة التأكيد، كما يتم حفظه في صفحة "حسابي"، وتصلك رسالة إلكترونية آلية تحتوي على كامل بيانات التفعيل وفاتورة الشراء.'
        },
        {
          q: 'ماذا أفعل إذا واجهت مشكلة في التحميل أو التفعيل؟',
          a: 'لا تقلق! روابط التفعيل وملفاتك تبقى محفوظة دائماً في حسابك. بإمكانك أيضاً التواصل مباشرة مع فريق الدعم الفني عبر تلغرام وتزويدنا برقم طلبك وسيقوم الفريق بمساعدتك وحل المشكلة فوراً.'
        },
        {
          q: 'هل يمكنني استرجاع أموالي بعد الشراء؟',
          a: 'نظراً للطبيعة الفورية للمنتجات الرقمية والأكواد، لا يمكن استرجاع المبالغ بعد استلام الكود أو التحميل، ولكن في حال وجود عطل فني مثبت في الكود أو الملف ولم نتمكن من حله، فإننا نضمن لك استبدال المنتج أو استرجاع أموالك بالكامل.'
        },
        {
          q: 'ما هي الألعاب والاشتراكات المتاحة للشحن؟',
          a: 'نوفر شحن لمعظم الألعاب الشهيرة مثل فري فاير (Free Fire)، ببجي موبايل (PUBG)، روبلوكس (Roblox)، بالإضافة لاشتراكات الترفيه، أدوات التصميم، البرمجيات، والبطاقات الرقمية المتنوعة.'
        },
        {
          q: 'هل أحتاج لإنشاء حساب للشراء من المتجر؟',
          a: 'يمكنك إتمام الطلب كزائر باستخدام بريدك الإلكتروني فقط لتلقي الكود، ولكننا نوصي بإنشاء حساب أو تسجيل الدخول بـ Google بنقرة واحدة لتتمكن من مراجعة كل طلباتك وفواتيرك في أي وقت.'
        }
      ]
    },
    en: {
      title: 'Frequently Asked Questions',
      subtitle: 'Everything you need to know about purchasing, payments, and instant delivery',
      backHome: 'Back to Store',
      contactBanner: 'Didn’t find the answer you were looking for?',
      contactDesc: 'Our support team is always ready on Telegram and email to answer your questions.',
      contactBtn: 'Contact Support',
      faqs: [
        {
          q: 'Is paying on the website secure?',
          a: 'Yes, 100% secure. We integrate the official Chargily payment gateway for Edahabia and CIB cards, compliant with global banking encryption standards. We also support Binance Pay and RedotPay.'
        },
        {
          q: 'How do I receive my product after payment?',
          a: 'As soon as your payment is verified, your download button or activation key appears immediately on the confirmation page and is permanently stored under "My Account". A copy is also sent to your email.'
        },
        {
          q: 'What should I do if I encounter an issue with activation?',
          a: 'No worries! Your order keys and download files remain safely stored in your account. You can also reach our customer support directly via Telegram with your Order ID for immediate resolution.'
        },
        {
          q: 'Can I request a refund?',
          a: 'Because digital products and license keys are delivered instantly, purchases are generally non-refundable once delivered. However, if a key or file is defective and cannot be resolved, we guarantee a replacement or a full refund.'
        },
        {
          q: 'What games and subscriptions are supported?',
          a: 'We offer top-up services for popular games like Free Fire, PUBG Mobile, and Roblox, as well as digital streaming subscriptions, creative tools, software licenses, and gift cards.'
        },
        {
          q: 'Do I need an account to place an order?',
          a: 'You can complete a checkout as a guest simply using your email to receive your keys. However, signing up or logging in with Google is recommended to easily track all your previous purchases in one dashboard.'
        }
      ]
    },
    fr: {
      title: 'Foire Aux Questions (FAQ)',
      subtitle: 'Tout ce que vous devez savoir sur vos achats, paiements et livraisons immédiates',
      backHome: 'Retour à la boutique',
      contactBanner: 'Vous n’avez pas trouvé votre réponse ?',
      contactDesc: 'Notre équipe est à votre disposition sur Telegram et par e-mail pour répondre à toutes vos interrogations.',
      contactBtn: 'Nous contacter',
      faqs: [
        {
          q: 'Le paiement sur le site est-il sécurisé ?',
          a: 'Oui, absolument. Nous utilisons la passerelle officielle Chargily pour les cartes Edahabia et CIB avec cryptage bancaire aux normes internationales. Nous acceptons également Binance Pay et RedotPay.'
        },
        {
          q: 'Comment puis-je récupérer mon produit après le paiement ?',
          a: 'Dès validation de votre règlement, votre lien de téléchargement ou code d’activation s’affiche instantanément sur la page de confirmation et dans votre espace "Mon Compte", avec un récapitulatif par e-mail.'
        },
        {
          q: 'Que faire si je rencontre un problème lors de l’activation ?',
          a: 'Ne vous inquiétez pas ! Vos accès et liens restent enregistrés dans votre compte. Vous pouvez aussi contacter directement notre assistance Telegram avec votre numéro de commande pour une aide rapide.'
        },
        {
          q: 'Puis-je demander un remboursement ?',
          a: 'En raison de la livraison instantanée des clés et fichiers numériques, les commandes ne sont pas remboursables une fois délivrées, sauf en cas de défaillance avérée du produit non résolue par notre support.'
        },
        {
          q: 'Quels jeux et abonnements sont disponibles ?',
          a: 'Nous proposons la recharge de jeux célèbres tels que Free Fire, PUBG Mobile, Roblox, ainsi que des abonnements streaming, outils de travail et logiciels digitaux.'
        },
        {
          q: 'Faut-il obligatoirement créer un compte pour commander ?',
          a: 'Vous pouvez commander en tant qu’invité avec votre adresse e-mail. Cependant, la création d’un compte ou la connexion rapide via Google vous permet de retrouver l’historique de toutes vos clés en un clic.'
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
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--store-text)] tracking-tight">
          {data.title}
        </h1>
        <p className="text-sm text-[var(--store-text-muted)]">
          {data.subtitle}
        </p>
      </div>

      {/* FAQ Accordion / Cards */}
      <div className="space-y-4">
        {data.faqs.map((faq, index) => (
          <div key={index} className="bg-[var(--store-card)] border border-[var(--store-border)] rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-2xs hover:border-[var(--store-primary)]/40 transition-colors">
            <h3 className="text-base font-bold text-[var(--store-text)] flex items-start gap-2.5">
              <HelpCircle className="w-5 h-5 text-[var(--store-primary)] shrink-0 mt-0.5" />
              <span>{faq.q}</span>
            </h3>
            <p className="text-sm text-[var(--store-text-muted)] leading-relaxed ps-7.5">
              {faq.a}
            </p>
          </div>
        ))}
      </div>

      {/* Help Banner */}
      <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-[var(--store-primary)]/10 border border-[var(--store-primary)]/20 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-start">
          <h4 className="font-bold text-base text-[var(--store-text)]">{data.contactBanner}</h4>
          <p className="text-xs text-[var(--store-text-muted)]">{data.contactDesc}</p>
        </div>
        <a
          href="https://t.me/lokmanosky"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-2.5 rounded-xl bg-[var(--store-primary)] text-[var(--store-bg)] font-bold text-xs hover:opacity-90 transition-opacity shadow-sm shrink-0"
        >
          {data.contactBtn}
        </a>
      </div>
    </div>
  );
}
