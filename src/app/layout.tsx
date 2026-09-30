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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lokstor',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var savedTheme = localStorage.getItem('store-theme');
                if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else if (savedTheme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--store-bg)] text-[var(--store-text)] antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
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
