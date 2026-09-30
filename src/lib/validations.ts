import { z } from 'zod';

// Product Schema
export const productSchema = z.object({
  name: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل').max(200, 'الاسم طويل جداً'),
  description: z.string().max(2000, 'الوصف طويل جداً'),
  price: z.number().min(0, 'السعر يجب أن يكون قيمة موجبة'),
  currency: z.string().default('dzd'),
  imageUrl: z.string().optional(),
  image: z.string().optional(),
  fileUrl: z.string().optional(),
  stock: z.number().min(0).optional(),
  stockType: z.enum(['units', 'numeric']).optional(),
  unlimitedStock: z.boolean().optional(),
  // stockLinks: any text content — URL, account credentials, activation code, instructions, etc.
  stockLinks: z.array(z.string().min(1).max(5000)).optional(),
  type: z.enum(['digital', 'subscription', 'games']).optional(),
  priceUnspecified: z.boolean().optional(),
  hasVariants: z.boolean().optional(),
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().min(0),
    originalPrice: z.number().optional(),
    image: z.string().optional(),
    badge: z.string().optional(),
    inStock: z.boolean().optional(),
  })).optional(),
  requiresCustomerInfo: z.boolean().optional(),
  requiredFields: z.array(z.object({
    id: z.string(),
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    type: z.enum(['text', 'password']).optional(),
  })).optional(),
  category: z.string().optional(),
  features: z.array(z.string().max(100)).optional(),
  status: z.enum(['published', 'draft', 'archived']).default('published'),
  fileType: z.string().optional()
});

// Checkout Schema
export const checkoutSchema = z.object({
  customerName: z.string().min(2, 'يرجى إدخال اسمك الحقيقي').max(100),
  customerEmail: z.string().email('بريد إلكتروني غير صالح').max(100),
  customerPhone: z.string().max(20).optional(),
  productId: z.string().min(1),
  paymentMethod: z.enum(['chargily', 'redotpay', 'binance']).optional().default('chargily'),
  customAmount: z.number().min(10).optional(),
  variantId: z.string().optional(),
  customFieldsData: z.record(z.string(), z.string()).optional(),
  fcmToken: z.string().optional()
});

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً')
});
