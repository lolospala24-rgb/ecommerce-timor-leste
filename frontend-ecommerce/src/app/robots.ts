import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';

// Next.js serves this at /robots.txt automatically — no route file needed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/account/',
        '/cart',
        '/checkout',
        '/login',
        '/register',
        '/forgot-password',
        '/reset-password/',
        '/orders',
        '/orders/',
        '/orders-shop',
        '/orders-shop/',
        '/api/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
