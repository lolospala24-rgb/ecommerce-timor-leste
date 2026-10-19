// Security audit finding (HIGH): this file previously had no headers()
// block at all — the admin panel controls the entire store (product/order/
// seller/finance management) yet shipped with no CSP, no HSTS, no
// clickjacking protection. frontend-ecommerce/next.config.js has the
// equivalent hardening; admin gets a stricter frame-ancestors since it
// should never legitimately be embedded anywhere.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiWsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');

// Google Maps JS API (used by SalesMap on the dashboard and
// DeliveryTrackingMap on order detail) needs its own narrow allowances on
// top of the defaults below: the loader script itself, hybrid/satellite
// tile + icon images, the XHR calls it makes internally, and — once a map
// type control or DirectionsRenderer is on screen — the Google Sans/Roboto/
// Material Symbols stylesheet + font files it injects for its own UI chrome.
const googleMapsScriptSrc = 'https://maps.googleapis.com';
const googleMapsImgSrc = 'https://maps.gstatic.com https://maps.googleapis.com https://khms0.googleapis.com https://khms1.googleapis.com';
const googleMapsConnectSrc = 'https://maps.googleapis.com';
const googleFontsStyleSrc = 'https://fonts.googleapis.com';
const googleFontsFontSrc = 'https://fonts.gstatic.com';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${googleMapsScriptSrc} https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/`,
  `style-src 'self' 'unsafe-inline' ${googleFontsStyleSrc}`,
  `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://via.placeholder.com ${googleMapsImgSrc}`,
  // Without this, media-src falls back to default-src 'self' — which
  // blocks every Cloudinary-hosted video from playing at all in the Video
  // Shop admin preview (confirmed via a real browser CSP violation: "Loading
  // media from https://res.cloudinary.com/.../video/upload/... violates
  // ... default-src 'self'"). Matches frontend-ecommerce's working media-src.
  "media-src 'self' blob: https://res.cloudinary.com http://res.cloudinary.com",
  `font-src 'self' data: ${googleFontsFontSrc}`,
  `connect-src 'self' ${apiUrl} ${apiWsUrl} ${googleMapsConnectSrc} https://www.google.com/recaptcha/`,
  "frame-src https://www.google.com/recaptcha/",
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
  },

  turbopack: {
    root: __dirname,
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
  
  // swcMinify is now enabled by default in Next.js 15+ (removed this option)
  output: 'standalone',
};

module.exports = nextConfig;