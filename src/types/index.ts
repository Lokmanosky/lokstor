export interface ProductVariant {
  id: string;
  name: string;        // e.g. "80 CP", "420 CP", "تذكرة أسبوعية"
  price: number;       // e.g. 290
  originalPrice?: number;
  image?: string;      // icon or image URL
  badge?: string;      // e.g. "الأكثر طلباً", "توفير"
  inStock?: boolean;
}

export interface GameFieldRequirement {
  id: string;
  label: string;       // e.g. "معرف اللاعب (Player ID)"
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'password';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Price in DZD (د.ج)
  originalPrice?: number;
  currency: string; // 'dzd'
  fileUrl?: string; // Storage path or URL (For single file)
  stockLinks?: string[]; // Array of unique single-use links for stock-based products
  imageUrl: string;
  images?: string[];
  image?: string;
  stock?: number;
  stockType?: 'units' | 'numeric';
  unlimitedStock?: boolean;
  type?: string;
  status?: string;
  category?: string;
  priceUnspecified?: boolean;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  requiresCustomerInfo?: boolean;
  requiredFields?: GameFieldRequirement[];
  features?: string[];
  fileType?: string; // PDF, ZIP, Template, etc.
  telegramLink?: string;
  sortOrder?: number;
  createdAt: number | string;
  updatedAt?: number | string;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  currency: string;
  customerName?: string;
  userName?: string;
  customerPhone?: string;
  customerEmail: string;
  variantId?: string;
  customAmount?: number;
  chargilyInvoiceId?: string;
  chargilyCheckoutUrl?: string;
  paymentMethod?: 'chargily' | 'redotpay' | 'binance';
  selectedVariant?: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  customFieldsData?: Record<string, string>;
  binanceUid?: string;
  redotpayId?: string;
  redotpayName?: string;
  status: 'pending' | 'paid' | 'failed' | 'pending_manual_review';
  amount?: number | string; // alias for productPrice from Chargily
  downloadToken?: string;
  downloadUrl?: string;
  downloadExpiresAt?: number;
  deliveryLink?: string;
  linkDeliveredAt?: string | number;
  createdAt: number | string;
  paidAt?: number | string;
  paymentReminderSent?: boolean;
  paymentReminderSentAt?: number;
}

export interface CreateCheckoutInput {
  productId: string;
  customerName?: string;
  userName?: string;
  customerPhone?: string;
  customerEmail: string;
}

export interface CreateCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  orderId?: string;
  error?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'customer';
  createdAt: number;
  lastLoginAt?: number;
}


export interface Review {
  id: string;
  productId?: string;
  customerName?: string;
  userName?: string;
  rating: number; // 1-5
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number | string;
}

export type AdminActionCategory =
  | 'products'    // منتجات (إضافة، تعديل، حذف، نسخ، ترتيب، تغيير سعر، صور)
  | 'orders'      // طلبات (تغيير حالة، إلغاء، حذف، تسليم، تذكير)
  | 'inventory'   // مخزون (إضافة كميات، روابط)
  | 'categories'  // أقسام (إضافة، حذف، تسمية، ترتيب)
  | 'discounts'   // أكواد الخصم (إنشاء، تعديل، تفعيل، حذف)
  | 'ticker'      // شريط إعلاني (تعديل نصوص)
  | 'reviews'     // تقييمات (موافقة، رفض، حذف)
  | 'settings';   // إعدادات (متجر، حساب)

export type AdminActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'price_change'
  | 'image_change'
  | 'reorder'
  | 'status_change'
  | 'order_cancel'
  | 'order_fulfill'
  | 'stock_update'
  | 'reminder'
  | 'bulk_action';

export interface AdminLog {
  id?: string;
  category: AdminActionCategory;
  actionType: AdminActionType;
  title: string;
  description: string;
  targetId?: string;
  targetName?: string;
  adminEmail: string;
  adminName?: string;
  adminUid?: string;
  diff?: {
    before?: any;
    after?: any;
    changes?: Record<string, { from: any; to: any; label?: string }>;
  };
  metadata?: Record<string, any>;
  createdAt: number;
}

