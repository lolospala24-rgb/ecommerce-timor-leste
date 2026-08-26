const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';

// A plain route handler (rather than the app/robots.ts metadata-file
// convention) so the output can carry a human-readable comment header —
// Next.js's typed MetadataRoute.Robots has no field for free-text comments.
const BODY = `# ${SITE_URL}
# Developed by Grigorio Guterres Gusmao
# Founder & Full Stack Developer
# Phone: 74492303 | Email: guterresgusmaogrigorio@gmail.com
# GitHub: https://github.com/GrigorioGuterres

User-Agent: *
Allow: /
Disallow: /account/
Disallow: /cart
Disallow: /checkout
Disallow: /login
Disallow: /register
Disallow: /forgot-password
Disallow: /reset-password/
Disallow: /orders
Disallow: /orders/
Disallow: /orders-shop
Disallow: /orders-shop/
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function GET() {
  return new Response(BODY, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
