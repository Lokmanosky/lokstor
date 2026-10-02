import HomePageClient from './HomePageClient';
import { adminDb } from '@/lib/firebaseAdmin';

export const revalidate = 60; // ISG - Revalidate page every 60 seconds (gives instant loading)

export default async function Page() {
  let products: any[] = [];
  let categories: any[] = [];
  let banners: any[] = [];

  try {
    if (adminDb) {
      // 1. Fetch Products
      const pSnap = await adminDb.collection('products').orderBy('createdAt', 'desc').get();
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

      // 2. Fetch Categories
      const cSnap = await adminDb.collection('storeCategories').get();
      cSnap.docs.forEach((d: any) => categories.push({ id: d.id, ...d.data() }));
      categories.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // 3. Fetch Banners
      const bSnap = await adminDb.collection('storeBanners').get();
      bSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.status === 'draft' || data.status === 'archived') return;
        banners.push({ id: d.id, ...data });
      });
      banners.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
  } catch (error) {
    console.error("Failed to pre-fetch homepage data:", error);
  }

  return (
    <HomePageClient 
      initialProducts={JSON.parse(JSON.stringify(products))} 
      initialCategories={JSON.parse(JSON.stringify(categories))} 
      initialBanners={JSON.parse(JSON.stringify(banners))} 
    />
  );
}
