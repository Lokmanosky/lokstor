import React from 'react';

export const dynamic = 'force-static';


export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-screen">
      <h1 className="text-3xl font-black text-white mb-8 border-b border-neutral-800 pb-4">الأسئلة الشائعة</h1>
      <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-neutral-300 leading-relaxed">
        
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-2">هل الدفع في الموقع آمن؟</h3>
            <p className="text-neutral-400">نعم، الدفع آمن 100%. نستخدم بوابة Chargily الرسمية لتشفير ومعالجة جميع عمليات الدفع بالبطاقة الذهبية و CIB.</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-2">كيف أحصل على المنتج بعد الدفع؟</h3>
            <p className="text-neutral-400">بمجرد تأكيد الدفع، سيظهر لك زر "تحميل" فوراً في نفس الصفحة، وستصلك رسالة عبر البريد الإلكتروني تحتوي على فاتورة ورابط مباشر لتحميل المنتج.</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-2">ماذا أفعل إذا واجهت مشكلة في التحميل؟</h3>
            <p className="text-neutral-400">لا تقلق! روابط التحميل تبقى محفوظة في حسابك. يمكنك أيضاً التواصل مع الدعم الفني بتزويدنا برقم الطلب وسنقوم بإرسال الملف لك مباشرة.</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-2">هل يمكنني استرجاع أموالي؟</h3>
            <p className="text-neutral-400">المنتجات الرقمية غير قابلة للاسترجاع بعد التحميل وفقاً لسياسة الإرجاع الخاصة بنا، ولكننا سنرد المبلغ كاملاً في حال كان الملف تالفاً ولم نتمكن من حله.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
