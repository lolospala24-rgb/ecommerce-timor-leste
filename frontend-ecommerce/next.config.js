const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiWsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' was removed after auditing every source of eval-style
  // code: the only first-party use was a dead Leaflet fallback in
  // MapboxPicker.tsx (new Function(...) — deleted, 'leaflet' was never
  // even an installed dependency, so it never worked), and Mapbox GL now
  // uses its official CSP-compliant build (mapbox-gl-csp + workerClass),
  // which doesn't need it either.
  // 'unsafe-inline' stays: a nonce/'strict-dynamic' migration was
  // attempted via middleware and verified broken (Next.js 15.0.0 did not
  // apply the nonce to its own rendered <script> tags — checked the raw
  // HTML output), which would have blocked the entire app's JS under
  // strict-dynamic. Reverted rather than ship it broken; needs a real
  // browser-devtools debugging session to revisit safely.
  "script-src 'self' 'unsafe-inline' https://apis.google.com",
  // No nonce equivalent exists for inline style *attributes* (only <style>
  // blocks) — Radix UI (positioning) and Framer Motion (animations) both
  // set styles via the DOM style attribute at runtime.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com http://res.cloudinary.com https://api.mapbox.com https://*.tiles.mapbox.com",
  "media-src 'self' blob: https://res.cloudinary.com http://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${apiWsUrl} https://api.mapbox.com https://events.mapbox.com https://*.tiles.mapbox.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
  "worker-src 'self' blob:",
  `frame-src 'self'${firebaseAuthDomain ? ` https://${firebaseAuthDomain}` : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const permissionsPolicy = 'camera=(), microphone=(), geolocation=(), payment=(), usb=()';

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
          { key: 'Permissions-Policy', value: permissionsPolicy },
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