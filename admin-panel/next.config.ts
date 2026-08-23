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
// tile + icon images, and the XHR calls it makes internally.
const googleMapsScriptSrc = 'https://maps.googleapis.com';
const googleMapsImgSrc = 'https://maps.gstatic.com https://maps.googleapis.com https://khms0.googleapis.com https://khms1.googleapis.com';
const googleMapsConnectSrc = 'https://maps.googleapis.com';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${googleMapsScriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://res.cloudinary.com http://res.cloudinary.com https://images.unsplash.com https://via.placeholder.com ${googleMapsImgSrc}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${apiWsUrl} ${googleMapsConnectSrc}`,
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
        protocol: 'http',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
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
  
  rewrites: async () => {
    // Make sure NEXT_PUBLIC_API_URL is defined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
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