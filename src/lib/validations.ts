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
  // stockLinks: any text content — URL, account credentials, activation code, instructions, etc.
  stockLinks: z.array(z.string().min(1).max(5000)).optional(),
  type: z.enum(['digital', 'subscription', 'games']).optional(),
  priceUnspecified: z.boolean().optional(),
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
  customAmount: z.number().min(10).optional()
});

// Login Schema
export const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور قصيرة جداً')
});
