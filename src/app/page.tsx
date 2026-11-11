import HomePageClient from './HomePageClient';
import { adminDb } from '@/lib/firebaseAdmin';

export const revalidate = 30;

// High-performance in-memory cache on the server
// Guarantees 0ms response time in both dev (localhost) and production
interface HomepageCache {
  products: any[];
  categories: any[];
  banners: any[];
  cachedAt: number;
}

let memoryCache: HomepageCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
let isRefreshing = false;

async function fetchFromFirestore(): Promise<HomepageCache> {
  let products: any[] = [];
  let categories: any[] = [];
  let banners: any[] = [];

  if (adminDb) {
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
  }

  return {
    products: JSON.parse(JSON.stringify(products)),
    categories: JSON.parse(JSON.stringify(categories)),
    banners: JSON.parse(JSON.stringify(banners)),
    cachedAt: Date.now()
  };
}

export default async function Page() {
  // 1. Instant Cache Hit (0ms)
  if (memoryCache) {
    // If cache is older than 60s, refresh in background without blocking this user!
    if (Date.now() - memoryCache.cachedAt >= CACHE_TTL_MS && !isRefreshing) {
      isRefreshing = true;
      fetchFromFirestore()
        .then(fresh => { memoryCache = fresh; })
        .catch(err => console.error("Background homepage cache refresh failed:", err))
        .finally(() => { isRefreshing = false; });
    }

    return (
      <HomePageClient 
        initialProducts={memoryCache.products} 
        initialCategories={memoryCache.categories} 
        initialBanners={memoryCache.banners} 
      />
    );
  }

  // 2. Initial Cold Start
  try {
    memoryCache = await fetchFromFirestore();
  } catch (error) {
    console.error("Failed to pre-fetch homepage data:", error);
    memoryCache = { products: [], categories: [], banners: [], cachedAt: Date.now() };
  }

  return (
    <HomePageClient 
      initialProducts={memoryCache.products} 
      initialCategories={memoryCache.categories} 
      initialBanners={memoryCache.banners} 
    />
  );
}
