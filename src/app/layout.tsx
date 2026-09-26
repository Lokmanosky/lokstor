import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import { I18nProvider } from '@/lib/i18n-context';
import { ClientLayout } from './client-layout';
import DevToolsGuard from '@/components/DevToolsGuard';

export const metadata: Metadata = {
  title: 'Lokstor - متجر المنتجات الرقمية في الجزائر',
  description: 'منصة بيع المنتجات الرقمية مع خدمة الدفع الإلكتروني Chargily.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full">
      <body className="min-h-full flex flex-col bg-[var(--store-bg)] text-[var(--store-text)] antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-300">
        <DevToolsGuard />
        <I18nProvider>
          <AuthProvider>
            <CartProvider>
              <ClientLayout>{children}</ClientLayout>
            </CartProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
