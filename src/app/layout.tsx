import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { CartProvider } from '@/lib/cart-context';
import { I18nProvider } from '@/lib/i18n-context';
import { ClientLayout } from './client-layout';
import DevToolsGuard from '@/components/DevToolsGuard';

export const metadata: Metadata = {
  metadataBase: new URL('https://lokstor.vercel.app'),
  title: 'Lokstor - متجر المنتجات الرقمية في الجزائر',
  description: 'منصة بيع وشحن المنتجات الرقمية والاشتراكات في الجزائر بأفضل الأسعار والدفع بالبطاقة الذهبية و CIB.',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-round.png',
    shortcut: '/logo-round.png',
    apple: '/logo-round.png',
  },
  openGraph: {
    title: 'Lokstor - متجر المنتجات الرقمية في الجزائر',
    description: 'منصة بيع وشحن المنتجات الرقمية والاشتراكات في الجزائر بأفضل الأسعار والدفع بالبطاقة الذهبية و CIB.',
    url: 'https://lokstor.vercel.app',
    siteName: 'Lokstor',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Lokstor Store Preview',
      },
    ],
    locale: 'ar_DZ',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lokstor - متجر المنتجات الرقمية في الجزائر',
    description: 'منصة بيع وشحن المنتجات الرقمية والاشتراكات في الجزائر بأفضل الأسعار والدفع بالبطاقة الذهبية و CIB.',
    images: ['/og-image.png'],
  },
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
