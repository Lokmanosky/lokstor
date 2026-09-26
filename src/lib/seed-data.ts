import { Product } from '@/types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'دليل شامل لإنشاء المتاجر الإلكترونية في الجزائر',
    description: 'كتاب رقمي بصيغة PDF يحتوي على خطة عمل كاملة خطوة بخطوة لإطلاق وتنمية متجرك الإلكتروني واستراتيجيات التسويق المحلي والدفع الإلكتروني عبر Chargily.',
    price: 1500,
    currency: 'dzd',
    fileUrl: 'products/digital_ecommerce_guide_dz.pdf',
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    category: 'كتب إلكترونية',
    features: [
      'ملف PDF حقيقي بـ 120 صفحة مجهزة للتحميل',
      'استراتيجيات التسويق في الجزائر (فيس بوك وانستغرام)',
      'كيفية توثيق السجل التجاري والربط مع Chargily Pay',
      'نماذج جاهزة لعقود التوصيل وتسيير الطلبيات'
    ],
    fileType: 'PDF',
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'prod-2',
    name: 'قالب موقع إلكتروني للتجارة الرقمية (Next.js + Tailwind)',
    description: 'قالب عالي الأداء مع تصميم متجاوب يدعم اللغة العربية بالكامل RTL وجاهز للربط الفوري مع بوابة الدفع الجزائرية شارجيلي و Firebase.',
    price: 3500,
    currency: 'dzd',
    fileUrl: 'products/nextjs_store_template.zip',
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    category: 'قوالب برمجية',
    features: [
      'شفرة مصدرية مكتملة بلغة TypeScript',
      'دعم كامل لـ App Router و Tailwind CSS v4',
      'لوحة أدمن مصممة خصيصاً لتسيير المبيعات والمنتجات',
      'تحديثات مجانية وتوثيق برمجي مفصل'
    ],
    fileType: 'ZIP',
    createdAt: Date.now() - 500000,
  },
  {
    id: 'prod-3',
    name: 'دورة تطبيقية: إتقان الإعلانات الممولة في السوق الجزائري',
    description: 'سلسلة فيديوهات تعليمية عالية الجودة تتضمن استراتيجيات استهداف الزبائن في الجزائر وتقليل تكلفة الإعلان مع نصائح الشحن والدفع.',
    price: 2800,
    currency: 'dzd',
    fileUrl: 'products/fb_ads_algeria_course.zip',
    imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    category: 'كورسات فيديو',
    features: [
      'أكثر من 5 ساعات تعليمية بدقة 1080p',
      'قوالب حملات إعلانية جاهزة للاستيراد',
      'مجموعة خاصة على تلغرام للمتابعة والأسئلة',
      'شهادة إتمام وتحديثات دورية'
    ],
    fileType: 'ZIP / Video',
    createdAt: Date.now(),
  },
];
