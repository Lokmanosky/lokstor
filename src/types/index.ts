export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // Price in DZD (د.ج)
  currency: string; // 'dzd'
  fileUrl?: string; // Storage path or URL (For single file)
  stockLinks?: string[]; // Array of unique single-use links for stock-based products
  imageUrl: string;
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
  customerEmail: string;
  chargilyInvoiceId?: string;
  chargilyCheckoutUrl?: string;
  status: 'pending' | 'paid' | 'failed';
  downloadToken?: string;
  downloadUrl?: string;
  downloadExpiresAt?: number;
  createdAt: number | string;
  paidAt?: number | string;
}

export interface CreateCheckoutInput {
  productId: string;
  customerName: string;
  customerEmail: string;
}

export interface CreateCheckoutResult {
  success: boolean;
  checkoutUrl?: string;
  orderId?: string;
  error?: string;
}
