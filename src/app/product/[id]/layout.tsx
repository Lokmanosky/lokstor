import type { Metadata } from 'next';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { INITIAL_PRODUCTS } from '@/lib/seed-data';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.loktech.store';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  let product: any = null;

  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (snap.exists()) {
      product = { id: snap.id, ...snap.data() };
    }
  } catch (err) {
    console.error('Failed to fetch product for metadata:', err);
  }

  // Fallback to initial seed products if not found in Firestore
  if (!product) {
    product = INITIAL_PRODUCTS.find((p) => p.id === id);
  }

  if (!product) {
    return {
      title: 'المنتج غير متوفر | Loktech',
      description: 'المنتج المطلوب غير موجود أو تم حذفه من متجر Loktech.',
    };
  }

  const productName = product.name || 'منتج رقمي';
  const cleanDescription = (product.description || 'اشتري الآن بأفضل الأسعار وبطرق دفع إلكترونية آمنة وسريعة.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  // Extract valid image URL
  let rawImage: string = product.image || product.imageUrl || (Array.isArray(product.images) && product.images[0]) || '';
  if (rawImage) {
    rawImage = rawImage.replace(/^"+|"+$/g, '').trim();
  }

  // Ensure absolute URL for OpenGraph and social previews
  let ogImageUrl = rawImage;
  if (!ogImageUrl) {
    ogImageUrl = `${SITE_URL}/og-image.png`;
  } else if (ogImageUrl.startsWith('/')) {
    ogImageUrl = `${SITE_URL}${ogImageUrl}`;
  }

  const pageUrl = `${SITE_URL}/product/${id}`;

  return {
    title: `${productName} | متجر Loktech`,
    description: cleanDescription,
    openGraph: {
      title: `${productName} | Loktech`,
      description: cleanDescription,
      url: pageUrl,
      siteName: 'Loktech',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          alt: productName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${productName} | Loktech`,
      description: cleanDescription,
      images: [ogImageUrl],
    },
  };
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
