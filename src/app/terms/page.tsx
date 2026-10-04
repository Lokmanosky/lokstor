import React from 'react';

export const dynamic = 'force-static';


export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-screen">
      <h1 className="text-3xl font-black text-white mb-8 border-b border-neutral-800 pb-4">الشروط والأحكام</h1>
      <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-neutral-300 leading-relaxed">
        
        <p>أهلاً بك في شروط وأحكام استخدام موقع Lokstor. باستخدامك لموقعنا، فإنك توافق على هذه الشروط بشكل كامل.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">1. المنتجات الرقمية</h2>
        <p>جميع المنتجات المعروضة في المتجر هي منتجات رقمية (غير ملموسة). بمجرد إتمام الدفع، ستتمكن من تحميل المنتج أو الحصول على رابط الاشتراك مباشرة.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">2. حقوق الملكية الفكرية</h2>
        <p>جميع الملفات والكتب والقوالب المباعة في متجرنا محمية بحقوق الطبع والنشر. يُمنع منعاً باتاً إعادة بيعها أو توزيعها مجاناً بدون إذن مسبق.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">3. التعديلات</h2>
        <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. استمرارك في استخدام الموقع بعد التعديلات يعني موافقتك عليها.</p>

      </div>
    </div>
  );
}
