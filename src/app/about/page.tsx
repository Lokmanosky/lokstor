import React from 'react';

export default function Page() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 min-h-screen">
      <h1 className="text-3xl font-black text-white mb-8 border-b border-neutral-800 pb-4">من نحن</h1>
      <div className="prose prose-invert prose-neutral max-w-none space-y-6 text-neutral-300 leading-relaxed">
        
        <p>مرحباً بكم في <strong>Lokstor</strong>، وجهتكم الأولى للمنتجات الرقمية في الجزائر.</p>
        <p>تأسس متجرنا بهدف توفير أفضل المنتجات الرقمية (كتب PDF، قوالب جاهزة، واشتراكات) بأسعار تنافسية وطرق دفع محلية آمنة وموثوقة مثل البطاقة الذهبية وبطاقة CIB.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">رؤيتنا</h2>
        <p>نسعى لأن نكون المنصة الرائدة في شمال أفريقيا والوطن العربي لتوفير المحتوى الرقمي الموثوق، وتمكين صناع المحتوى من بيع منتجاتهم بكل سهولة.</p>
        <h2 className="text-xl font-bold text-white mt-8 mb-4">لماذا تختارنا؟</h2>
        <ul className="list-disc list-inside space-y-2 text-neutral-400">
          <li>تسليم فوري وتلقائي مباشرة بعد الدفع.</li>
          <li>دفع إلكتروني آمن عبر بوابة Chargily المعتمدة.</li>
          <li>منتجات أصلية بجودة عالية.</li>
          <li>دعم فني متواجد لمساعدتك في أي وقت.</li>
        </ul>

      </div>
    </div>
  );
}
