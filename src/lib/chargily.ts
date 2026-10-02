import { ChargilyClient, verifySignature } from '@chargily/chargily-pay';

export const isChargilyConfigured = Boolean((process.env.CHARGILY_API_SECRET || '').trim());

export const getChargilyClient = () => {
  const apiKey = (process.env.CHARGILY_API_SECRET || '').replace(/^"|"$/g, '').trim();

  if (!apiKey) {
    throw new Error('CHARGILY_API_SECRET is not configured');
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
