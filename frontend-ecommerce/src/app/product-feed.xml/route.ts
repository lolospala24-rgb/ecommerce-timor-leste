import { SITE_URL, API_URL, escapeXml, fetchAllPages } from '@/lib/sitemap';

// Google Merchant Center product feed (RSS 2.0 + the `g:` namespace Merchant
// Center reads: https://support.google.com/merchants/answer/7052112). This
// is infrastructure, not a submitted feed — nothing here registers Lolospala
// with Merchant Center on its own. Once a Merchant Center account exists,
// point a feed rule at this URL (Settings → Products → Feeds → add
// "Scheduled fetch" with https://lolospala.com/product-feed.xml).
//
// Reuses the same safety-capped fetchAllPages() the categories/sellers
// sub-sitemaps use rather than the sitemap's chunked fetcher — Merchant
// Center itself paginates/schedules feed fetches, so this file doesn't need
// to pre-split into multiple URLs the way the sitemap protocol's 50,000-URL
// cap forces sitemaps to.
export const revalidate = 3600;

interface FeedProduct {
  id?: number;
  name?: string;
  slug?: string;
  description?: string;
  thumbnail?: string;
  images?: string[];
  price?: number;
  stock?: number;
  brand?: string;
  isActive?: boolean;
}

async function getSiteName(): Promise<string> {
  if (!API_URL) return 'Lolospala';
  try {
    const res = await fetch(`${API_URL}/api/v1/settings/public`, { next: { revalidate: 3600 } });
    if (!res.ok) return 'Lolospala';
    const json = await res.json();
    const settings = json?.data?.data ?? json?.data;
    return settings?.siteName || 'Lolospala';
  } catch {
    return 'Lolospala';
  }
}

// Strips HTML/markdown-ish content down to plain text and a safe length —
// Merchant Center rejects descriptions containing markup.
function plainDescription(text: string | undefined, fallback: string | undefined): string {
  const source = (text || fallback || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return source.slice(0, 5000);
}

function productItemXml(product: FeedProduct, siteName: string): string {
  const link = `${SITE_URL}/products/${product.slug}`;
  const image = product.thumbnail || product.images?.[0];
  const additionalImages = (product.images || []).filter((img) => img && img !== image).slice(0, 10);
  const availability = (product.stock ?? 0) > 0 ? 'in stock' : 'out of stock';
  // Google requires either a real identifier (GTIN/MPN + brand) or an
  // explicit admission that none exists — never fabricate one to satisfy
  // the requirement (see this repo's instructions: no fake GTIN/MPN/brand).
  const identifierExists = product.brand ? 'yes' : 'no';

  const lines = [
    '  <item>',
    `    <g:id>${escapeXml(String(product.id))}</g:id>`,
    `    <title>${escapeXml(product.name || '')}</title>`,
    `    <description>${escapeXml(plainDescription(product.description, product.name))}</description>`,
    `    <link>${escapeXml(link)}</link>`,
    image ? `    <g:image_link>${escapeXml(image)}</g:image_link>` : '',
    ...additionalImages.map((img) => `    <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`),
    `    <g:availability>${availability}</g:availability>`,
    `    <g:price>${(product.price ?? 0).toFixed(2)} USD</g:price>`,
    '    <g:condition>new</g:condition>',
    product.brand ? `    <g:brand>${escapeXml(product.brand)}</g:brand>` : '',
    // No GTIN/MPN stored anywhere in the catalog today — omitted entirely
    // rather than emitted empty (an empty g:mpn tag reads to Merchant
    // Center as "provided but blank", which is worse than absent).
    `    <g:identifier_exists>${identifierExists}</g:identifier_exists>`,
    `    <g:seller_name>${escapeXml(siteName)}</g:seller_name>`,
    '  </item>',
  ];

  return lines.filter(Boolean).join('\n');
}

export async function GET() {
  const [products, siteName] = await Promise.all([
    fetchAllPages<FeedProduct>('/api/v1/products'),
    getSiteName(),
  ]);

  const activeProducts = products.filter((p) => p.isActive !== false && p.slug);

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ${SITE_URL}/product-feed.xml — Google Merchant Center product feed
  Developed by Grigorio Guterres Gusmao
  Founder & Full Stack Developer
  Phone: 74492303 | Email: guterresgusmaogrigorio@gmail.com
  GitHub: https://github.com/GrigorioGuterres
-->
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
  <title>${escapeXml(siteName)} Product Feed</title>
  <link>${escapeXml(SITE_URL)}</link>
  <description>Public product catalog for ${escapeXml(siteName)}</description>
${activeProducts.map((p) => productItemXml(p, siteName)).join('\n')}
</channel>
</rss>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
