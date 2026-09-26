'use client';

import { useEffect } from 'react';

/*
 * ملاحظة أمنية هامة:
 * هذا المكون لا يعتبر حماية أمنية حقيقية، بل هو مجرد رادع بسيط للمستخدم العادي (منع كليك يمين والاختصارات).
 * أي مطور ويب محترف يمكنه بسهولة تخطي هذا المنع (مثلاً عبر تعطيل الجافاسكريبت).
 * لذلك، لا تعتمد على هذا المكون لحماية الكود الحساس.
 * تأكد دائماً أن جميع البيانات الحساسة، التراخيص، ومفاتيح الـ API محصورة ومحمية داخل الـ API Routes في السيرفر فقط.
 */

export default function DevToolsGuard() {
  useEffect(() => {
    // تفعيل التعطيل فقط في بيئة الإنتاج، وعدم تعطيل شيء في بيئة التطوير
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
      }
      
      // Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
      }
      
      // Ctrl+U
      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
