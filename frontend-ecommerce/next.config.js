// Content-Security-Policy moved to src/middleware.ts — it needs a fresh
// nonce per request, which a static config file can't generate. Every
// other header here is static and fine to stay.
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