import { ChargilyClient, verifySignature } from '@chargily/chargily-pay';

export const isChargilyConfigured = Boolean(process.env.CHARGILY_API_KEY);

export const getChargilyClient = () => {
  const apiKey = process.env.CHARGILY_API_KEY;
  const mode = (process.env.CHARGILY_MODE || 'test') as 'test' | 'live';
  
  if (!apiKey) {
    throw new Error('مفتاح Chargily API غير معرّف في متغيرات البيئة (CHARGILY_API_KEY)');
  }

  return new ChargilyClient({
    api_key: apiKey,
    mode: mode,
  });
};

export { verifySignature };
