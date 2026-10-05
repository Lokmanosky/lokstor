export interface DiscountCode {
  id: string;
  code: string;              // الكود مثل "SAVE20"
  type: 'percentage' | 'fixed'; // نسبة مئوية أو مبلغ ثابت
  value: number;             // قيمة الخصم (20 = 20% أو 500 = 500 د.ج)
  scope: 'all' | 'product';  // كل الموقع أو منتج محدد
  productId?: string;        // معرف المنتج (إذا كان scope = 'product')
  productName?: string;      // اسم المنتج (للعرض)
  isActive: boolean;
  usageCount: number;        // عدد مرات الاستخدام
  maxUsage?: number;         // الحد الأقصى للاستخدام (اختياري)
  minOrderAmount?: number;   // الحد الأدنى للطلب (اختياري)
  expiresAt?: number;        // تاريخ الانتهاء (timestamp، اختياري)
  createdAt: number;
}
