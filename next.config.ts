import type { NextConfig } from "next";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://*.firebaseapp.com https://*.googleapis.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com data:;
  img-src 'self' data: blob: https://images.unsplash.com https://storage.googleapis.com https://*.firebasestorage.app https://firebasestorage.googleapis.com https://*.chargily.com https://*.chargily.dz https://*.chargily.net https://lh3.googleusercontent.com https://*.googleusercontent.com https://ui-avatars.com https://i.ibb.co https://*.ibb.co;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.app https://storage.googleapis.com https://*.chargily.com https://*.chargily.dz https://*.chargily.net https://accounts.google.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com;
  frame-src 'self' https://accounts.google.com https://*.google.com https://*.firebaseapp.com https://*.chargily.com https://*.chargily.dz https://*.chargily.net;
  frame-ancestors 'none';
  form-action 'self' https://accounts.google.com https://*.google.com https://*.chargily.com https://*.chargily.dz https://*.chargily.net;
  object-src 'none';
  base-uri 'self';
  navigate-to 'self' https://accounts.google.com https://*.google.com https://*.firebaseapp.com;
`.replace(/\s{2,}/g, ' ').trim();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: '*.firebasestorage.app' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'i.ibb.co' },
      { protocol: 'https', hostname: '*.ibb.co' },
    ],
  },
  serverExternalPackages: ['firebase-admin'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
