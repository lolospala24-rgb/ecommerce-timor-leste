import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PAGE_LIMIT = 100;
const MAX_PAGES = 200; // safety cap — 20,000 items per resource, well above real usage

async function fetchAllPages<T>(path: string): Promise<T[]> {
  if (!API_URL) return [];

  const items: T[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const separator = path.includes('?') ? '&' : '?';
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}${separator}page=${page}&limit=${PAGE_LIMIT}`, {
        next: { revalidate: 3600 },
      });
    } catch {
      break;
    }
    if (!res.ok) break;

    const json = await res.json();
    const pageItems: T[] = json?.data?.data ?? [];
    const pagination = json?.data?.pagination;
    items.push(...pageItems);

    if (!pagination?.hasNext) break;
    page += 1;
  }

  return items;
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

// Next.js serves this at /sitemap.xml automatically — no route file needed.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, sellers] = await Promise.all([
    fetchAllPages<{ slug?: string; updatedAt?: string }>('/api/v1/products'),
    fetchAllPages<{ slug?: string; updatedAt?: string }>('/api/v1/categories'),
    fetchAllPages<{ id?: number; updatedAt?: string }>('/api/v1/sellers/verified'),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const categoryEntries: MetadataRoute.Sitemap = categories
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const sellerEntries: MetadataRoute.Sitemap = sellers
    .filter((s) => typeof s.id === 'number')
    .map((s) => ({
      url: `${SITE_URL}/sellers/${s.id}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt) : undefined,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

  return [...staticEntries, ...productEntries, ...categoryEntries, ...sellerEntries];
}
