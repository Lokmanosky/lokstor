export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Price in DZD (د.ج)
  currency: string; // 'dzd'
  fileUrl?: string; // Storage path or URL (For single file)
  stockLinks?: string[]; // Array of unique single-use links for stock-based products
  imageUrl: string;
  image?: string;
  stock?: number;
  type?: string;
  status?: string;
  category?: string;
  features?: string[];
  fileType?: string; // PDF, ZIP, Template, etc.
  createdAt: number | string;
  updatedAt?: number | string;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  currency: string;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  chargilyInvoiceId?: string;
  chargilyCheckoutUrl?: string;
  paymentMethod?: 'chargily' | 'redotpay';
  redotpayId?: string;
  redotpayName?: string;
  status: 'pending' | 'paid' | 'failed' | 'pending_manual_review';
  amount?: number | string; // alias for productPrice from Chargily
  downloadToken?: string;
  downloadUrl?: string;
  downloadExpiresAt?: number;
  createdAt: number | string;
  paidAt?: number | string;
}

export interface CreateCheckoutInput {
  productId: string;
  customerName: string;
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
