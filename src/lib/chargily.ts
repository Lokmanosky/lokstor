import { ChargilyClient, verifySignature } from '@chargily/chargily-pay';

// Fallback test key provided by the user so Chargily Pay works directly on Vercel and mobile without waiting for env sync
const FALLBACK_TEST_SECRET = 'test_sk_PqHHeAJIhBuCgFpFEHVb276mBO09NYQkJOmucWOg';

export const isChargilyConfigured = Boolean(process.env.CHARGILY_API_KEY || FALLBACK_TEST_SECRET);

export const getChargilyClient = () => {
  const apiKey = process.env.CHARGILY_API_KEY || FALLBACK_TEST_SECRET;
  const mode = (process.env.CHARGILY_MODE || (apiKey.startsWith('live_') ? 'live' : 'test')) as 'test' | 'live';
  
  return new ChargilyClient({
    api_key: apiKey,
    mode: mode,
  });
};

export { verifySignature };
