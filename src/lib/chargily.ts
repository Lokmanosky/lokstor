import { ChargilyClient, verifySignature } from '@chargily/chargily-pay';

// Chargily credentials are read securely strictly from environment variables (.env.local / Vercel Environment Variables)
export const isChargilyConfigured = Boolean(
  process.env.CHARGILY_API_KEY || process.env.CHARGILY_API_SECRET
);

export const getChargilyClient = () => {
  const apiKey = (process.env.CHARGILY_API_KEY || process.env.CHARGILY_API_SECRET || '').trim();
  const mode = (
    process.env.CHARGILY_MODE ||
    (apiKey.startsWith('live_') ? 'live' : 'test')
  ) as 'test' | 'live';
  
  return new ChargilyClient({
    api_key: apiKey,
    mode: mode,
  });
};

export { verifySignature };
