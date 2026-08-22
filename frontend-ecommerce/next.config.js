const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiWsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
const firebaseAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-eval' was removed after auditing every source of eval-style
  // code: the only first-party use was a dead Leaflet fallback in the old
  // Mapbox picker (new Function(...) — deleted along with Mapbox itself;
  // 'leaflet' was never even an installed dependency, so it never worked).
  // The Google Maps JavaScript API (GoogleMapPicker.tsx) doesn't require
  // 'unsafe-eval' either in current versions — if a future Maps API
  // feature needs it, that will surface as a visible CSP console error and
  // GoogleMapPicker's own loadError state, not a silent failure.
  // 'unsafe-inline' stays: a nonce/'strict-dynamic' migration was
  // attempted via middleware and verified broken (Next.js 15.0.0 did not
  // apply the nonce to its own rendered <script> tags — checked the raw
  // HTML output), which would have blocked the entire app's JS under
  // strict-dynamic. Reverted rather than ship it broken; needs a real
  // browser-devtools debugging session to revisit safely.
  // Next.js dev-mode Fast Refresh/HMR (react-refresh-utils runtime) uses
  // eval() internally, so 'unsafe-eval' is needed in dev only; production
  // builds don't use eval-based HMR, so it stays out of the prod CSP.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''} https://apis.google.com https://maps.googleapis.com`,
  // No nonce equivalent exists for inline style *attributes* (only <style>
  // blocks) — Radix UI (positioning) and Framer Motion (animations) both
  // set styles via the DOM style attribute at runtime.
  "style-src 'self' 'unsafe-inline'",
  // https://*.googleusercontent.com: Google Sign-In profile photos
  // (lh3.googleusercontent.com etc. — Google load-balances across several
  // lh1-lh6 subdomains, so this is a wildcard rather than one hardcoded host).
  "img-src 'self' data: blob: https://res.cloudinary.com http://res.cloudinary.com https://maps.gstatic.com https://maps.googleapis.com https://*.googleusercontent.com",
  "media-src 'self' blob: https://res.cloudinary.com http://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${apiWsUrl} https://maps.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com`,
  "worker-src 'self' blob:",
  `frame-src 'self'${firebaseAuthDomain ? ` https://${firebaseAuthDomain}` : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// geolocation=(self): GoogleMapPicker's "My Location" button needs
// navigator.geolocation, which this header blocks outright — for every
// visitor, before the browser even shows a permission prompt — when set to
// (), regardless of what the user allows in their own browser settings.
// Scoped to (self) rather than opened further: still denied to any
// embedded third-party iframe, only this site's own pages can request it.
const permissionsPolicy = 'camera=(), microphone=(), geolocation=(self), payment=(), usb=()';

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