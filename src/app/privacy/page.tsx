import React from 'react';

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-screen">
      <h1 className="text-3xl font-black text-white mb-8 border-b border-neutral-800 pb-4">سياسة الخصوصية</h1>
      <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-neutral-300 leading-relaxed">
        
        <p>نحن في Lokstor نولي أهمية قصوى لخصوصية بياناتك ومعلوماتك الشخصية.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">المعلومات التي نجمعها</h2>
        <p>نجمع فقط المعلومات الضرورية لإتمام طلباتك، مثل: الاسم، وعنوان البريد الإلكتروني. نحن لا نقوم بتخزين معلومات بطاقتك الائتمانية أو بيانات الدفع في خوادمنا؛ حيث تتم جميع عمليات الدفع عبر بوابة Chargily الآمنة والمشفرة.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">كيف نستخدم معلوماتك؟</h2>
        <ul className="list-disc list-inside space-y-2 text-neutral-400">
          <li>إرسال روابط تحميل المنتجات إلى بريدك الإلكتروني.</li>
          <li>التواصل معك في حال وجود مشكلة في طلبك.</li>
          <li>إرسال تحديثات أمنية أو عروض خاصة (فقط إذا وافقت على ذلك).</li>
        </ul>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">مشاركة البيانات</h2>
        <p>نحن لا نبيع أو نشارك معلوماتك الشخصية مع أي طرف ثالث لأغراض تسويقية. يتم مشاركة البيانات فقط مع مزودي الخدمة (مثل بوابات الدفع) لإتمام عملية الشراء بنجاح.</p>

      </div>
    </div>
  );
}
