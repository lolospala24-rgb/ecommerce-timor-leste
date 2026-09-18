import { SITE_URL, buildSitemapIndex, fetchTotalCount, productChunkCount } from '@/lib/sitemap';

// A plain route handler (rather than the app/sitemap.ts metadata-file
// convention) so the output can carry a human-readable comment header —
// Next.js's typed MetadataRoute.Sitemap has no field for free-text comments.
//
// This is a Sitemap INDEX, not a flat list of every URL — see
// src/lib/sitemap.ts. A single sitemap file is capped at 50,000 URLs by the
// sitemap protocol, and loading every product into memory on every request
// doesn't scale to a marketplace catalog. Instead this file only asks the
// backend for a cheap product COUNT, then points Google at however many
// chunked /sitemaps/products-N.xml files that count requires — each of
// those fetches only its own slice of the catalog when actually requested.
export const revalidate = 3600;

export async function GET() {
  const totalProducts = await fetchTotalCount('/api/v1/products');
  const chunkCount = totalProducts > 0 ? productChunkCount(totalProducts) : 0;

  const locs = [
    `${SITE_URL}/sitemaps/static.xml`,
    `${SITE_URL}/sitemaps/categories.xml`,
    `${SITE_URL}/sitemaps/sellers.xml`,
    ...Array.from({ length: chunkCount }, (_, i) => `${SITE_URL}/sitemaps/products-${i + 1}.xml`),
  ];

  return new Response(buildSitemapIndex(locs), {
    headers: { 'Content-Type': 'application/xml' },
  });
}
