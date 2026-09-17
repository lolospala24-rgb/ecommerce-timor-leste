// Same hardening posture as admin-panel/next.config.ts — this app also
// handles a seller's financial and store data, so it gets the same
// strict frame-ancestors/CSP treatment, not the more permissive
// storefront config.
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const apiWsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com http://res.cloudinary.com https://images.unsplash.com",
  "font-src 'self' data:",
  `connect-src 'self' ${apiUrl} ${apiWsUrl} https://www.google.com/recaptcha/`,
  "frame-src https://www.google.com/recaptcha/",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const permissionsPolicy = 'camera=(), microphone=(), payment=(), usb=()';

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
    ],
    formats: ['image/webp'],
  },

  turbopack: {
    root: __dirname,
  },

  rewrites: async () => {
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
  output: 'standalone',
};

module.exports = nextConfig;
