import HomePageClient from './HomePageClient';
import { adminDb } from '@/lib/firebaseAdmin';

// Revalidate once every 24 hours (86400s) on-demand to prevent bot-induced ISR loop
// Client-side onSnapshot in HomePageClient already keeps products, categories, and banners updated in real-time with 0 latency!
export const revalidate = 86400;

export function clearHomepageMemoryCache() {
  // Kept for backward compatibility with /api/admin/purge-cache
}

async function fetchFromFirestore() {
  let products: any[] = [];
  let categories: any[] = [];
  let banners: any[] = [];

  if (adminDb) {
    try {
      const [pSnap, cSnap, bSnap] = await Promise.all([
        adminDb.collection('products').orderBy('createdAt', 'desc').get(),
        adminDb.collection('storeCategories').get(),
        adminDb.collection('storeBanners').get()
      ]);

      pSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === 'draft' || data.status === 'archived') return;
        products.push({ id: d.id, ...data });
      });
      products.sort((a: any, b: any) => {
        const aO = typeof a.sortOrder === 'number' ? a.sortOrder : 999999;
        const bO = typeof b.sortOrder === 'number' ? b.sortOrder : 999999;
        if (aO !== bO) return aO - bO;
        const aT = typeof a.createdAt === 'number' ? a.createdAt : Number(a.createdAt || 0);
        const bT = typeof b.createdAt === 'number' ? b.createdAt : Number(b.createdAt || 0);
        return bT - aT;
      });

      cSnap.docs.forEach((d: any) => categories.push({ id: d.id, ...d.data() }));
      categories.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

      bSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === 'draft' || data.status === 'archived') return;
        banners.push({ id: d.id, ...data });
      });
      banners.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    } catch (err) {
      console.error("Firestore fetch error:", err);
    }
  }

  return {
    products: JSON.parse(JSON.stringify(products)),
    categories: JSON.parse(JSON.stringify(categories)),
    banners: JSON.parse(JSON.stringify(banners))
  };
}

export default async function Page() {
  const data = await fetchFromFirestore();

  return (
    <HomePageClient 
      initialProducts={data.products} 
      initialCategories={data.categories} 
      initialBanners={data.banners} 
    />
  );
}
