import { ChargilyClient, verifySignature } from '@chargily/chargily-pay';

// Chargily credentials are read securely strictly from environment variables (.env.local / Vercel Environment Variables)
export const isChargilyConfigured = Boolean(
  process.env.CHARGILY_API_SECRET || process.env.CHARGILY_API_KEY
);

export const getChargilyClient = () => {
  // Check both environment variable names
  const secretKey = (process.env.CHARGILY_API_SECRET || '').trim();
  const apiKeyCandidate = (process.env.CHARGILY_API_KEY || '').trim();

  // If secretKey is a valid live key, prioritize it over any stale apiKeyCandidate
  let apiKey = secretKey;
  if (!apiKey || (!apiKey.startsWith('live_sk_') && apiKeyCandidate.startsWith('live_sk_'))) {
    apiKey = apiKeyCandidate;
  }
  if (!apiKey) {
    apiKey = apiKeyCandidate || secretKey;
  }

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
