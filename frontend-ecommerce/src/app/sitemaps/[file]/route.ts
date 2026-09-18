import {
  SITE_URL,
  buildUrlset,
  fetchAllPages,
  fetchProductChunk,
  fetchTotalCount,
  productChunkCount,
  type SitemapEntry,
} from '@/lib/sitemap';

interface RouteParams {
  params: Promise<{ file: string }>;
}

const STATIC_PAGES: { path: string; priority: number }[] = [
  { path: '', priority: 1 },
  { path: '/products', priority: 0.8 },
  { path: '/categories', priority: 0.7 },
  { path: '/sellers', priority: 0.6 },
  { path: '/videos', priority: 0.5 },
  { path: '/about', priority: 0.4 },
  { path: '/contact', priority: 0.4 },
  { path: '/faq', priority: 0.3 },
  { path: '/help', priority: 0.3 },
  { path: '/returns', priority: 0.3 },
  { path: '/seller/register', priority: 0.4 },
];

function xmlResponse(body: string) {
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}

function notFoundResponse() {
  return new Response('Not Found', { status: 404 });
}

async function buildStaticEntries(): Promise<SitemapEntry[]> {
  return STATIC_PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority,
  }));
}

async function buildCategoryEntries(): Promise<SitemapEntry[]> {
  const categories = await fetchAllPages<{ slug?: string; updatedAt?: string }>('/api/v1/categories');
  return categories
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
}

async function buildSellerEntries(): Promise<SitemapEntry[]> {
  const sellers = await fetchAllPages<{ id?: number; updatedAt?: string }>('/api/v1/sellers/verified');
  return sellers
    .filter((s) => typeof s.id === 'number')
    .map((s) => ({
      url: `${SITE_URL}/sellers/${s.id}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt).toISOString() : undefined,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));
}

async function buildProductChunkEntries(chunkIndex: number): Promise<SitemapEntry[] | null> {
  // Re-validate the chunk number against the current product count — a
  // stale/out-of-range request (e.g. the catalog shrank, or a crawler
  // guessed a URL) gets a real 404 rather than a bogus empty sitemap.
  const totalProducts = await fetchTotalCount('/api/v1/products');
  const chunkCount = totalProducts > 0 ? productChunkCount(totalProducts) : 0;
  if (chunkIndex < 1 || chunkIndex > chunkCount) return null;

  const products = await fetchProductChunk<{ slug?: string; updatedAt?: string }>(chunkIndex);
  return products
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));
}

// Chunked sub-sitemaps referenced by the index at /sitemap.xml — see
// src/lib/sitemap.ts for why product URLs are chunked instead of listed in
// one file. Each of the four file kinds below is cached independently
// (revalidate) so a crawler re-fetching an already-generated chunk doesn't
// re-trigger the underlying backend calls until it actually goes stale.
export const revalidate = 3600;

export async function GET(_request: Request, { params }: RouteParams) {
  const { file } = await params;

  if (file === 'static.xml') {
    return xmlResponse(buildUrlset(await buildStaticEntries()));
  }

  if (file === 'categories.xml') {
    return xmlResponse(buildUrlset(await buildCategoryEntries()));
  }

  if (file === 'sellers.xml') {
    return xmlResponse(buildUrlset(await buildSellerEntries()));
  }

  const productMatch = /^products-(\d+)\.xml$/.exec(file);
  if (productMatch) {
    const chunkIndex = parseInt(productMatch[1], 10);
    const entries = await buildProductChunkEntries(chunkIndex);
    if (!entries) return notFoundResponse();
    return xmlResponse(buildUrlset(entries));
  }

  return notFoundResponse();
}
