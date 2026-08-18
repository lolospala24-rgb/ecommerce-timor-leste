const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiWsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
// Firebase Auth's popup sign-in calls the Identity Toolkit/Secure Token REST
// APIs directly from the browser (blocked by a bare connect-src 'self'), and
// uses a hidden iframe on the project's authDomain for cross-window session
// sync (blocked by a bare frame-src 'self') — both silently fail as the
// generic Firebase "auth/internal-error" without these.
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js needs 'unsafe-inline'/'unsafe-eval' for its runtime + hydration scripts.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Tailwind/Mapbox GL inject inline styles at runtime.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com http://res.cloudinary.com https://images.unsplash.com https://via.placeholder.com https://api.mapbox.com https://*.tiles.mapbox.com",
  // Video-shopping feed plays videos hosted on Cloudinary (see VideoPlayer)
  // — without this, <video src> falls back to default-src 'self' and every
  // video is silently blocked by the browser.
  "media-src 'self' blob: https://res.cloudinary.com http://res.cloudinary.com",
  "font-src 'self' data:",
  // API calls (REST + websocket) go straight to the backend, plus Mapbox's
  // geocoding/styles/telemetry endpoints and Firebase Auth's REST APIs
  // (Google sign-in — see firebaseAuthDomain comment above).
  `connect-src 'self' ${apiUrl} ${apiWsUrl} https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
  // Mapbox GL renders via web workers loaded from blob: URLs.
  "worker-src 'self' blob:",
  `frame-src 'self'${firebaseAuthDomain ? ` https://${firebaseAuthDomain}` : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        pathname: '/**',
      },
    ],
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/v1/:path*`,
      },
    ];
  },

  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          // Browsers ignore this over plain HTTP, so it's a no-op for the
          // bare-IP fallback and harmless in local dev — only takes effect
          // once a browser sees it over https://lolospala.com. No `preload`
          // (that requires submitting the domain to browsers' built-in
          // preload lists, which is effectively irreversible).
          { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
        ],
      },
    ];
  },


  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  
  poweredByHeader: false,
  
  reactStrictMode: true,
  
  output: 'standalone',
};

module.exports = nextConfig;