import React from 'react';

export const dynamic = 'force-static';


export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-screen">
      <h1 className="text-3xl font-black text-white mb-8 border-b border-neutral-800 pb-4">سياسة الشحن والإرجاع</h1>
      <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-neutral-300 leading-relaxed">
        
        <p>بما أن متجر <strong>Lokstor</strong> متخصص في بيع <strong>المنتجات الرقمية فقط</strong>، فإن سياسة الشحن والإرجاع تختلف عن المتاجر التقليدية.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">سياسة التسليم (الشحن الرقمي)</h2>
        <p>لا يوجد شحن مادي للمنتجات. فور إتمام عملية الدفع بنجاح عبر بوابة Chargily، سيتم توجيهك مباشرة إلى صفحة التحميل. كما سيتم إرسال نسخة من الفاتورة ورابط التحميل إلى بريدك الإلكتروني.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">سياسة الاسترجاع (الاسترداد المالي)</h2>
        <p>نظراً لطبيعة المنتجات الرقمية، <strong>لا يمكننا تقديم عمليات استرداد أو إرجاع</strong> بعد شراء المنتج وتحميله، إلا في الحالات الاستثنائية التالية:</p>
        <ul className="list-disc list-inside space-y-2 text-neutral-400">
          <li>إذا كان الملف تالفاً أو لا يعمل بشكل صحيح ولم يتمكن الدعم الفني من حل المشكلة.</li>
          <li>إذا لم يتم تسليم المنتج (عدم ظهور رابط التحميل) بسبب خطأ تقني في النظام.</li>
        </ul>
        <p className="mt-4">إذا واجهت أي مشكلة، يرجى التواصل مع فريق الدعم الفني الخاص بنا وسنقوم بمساعدتك على الفور.</p>

      </div>
    </div>
  );
}
