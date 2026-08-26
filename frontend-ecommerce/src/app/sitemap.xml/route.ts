const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const PAGE_LIMIT = 100;
const MAX_PAGES = 200; // safety cap — 20,000 items per resource, well above real usage

interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
}

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

// Escapes the 5 characters XML reserves inside text/attribute content, so a
// stray "&" or "<" in fetched data (e.g. an unusual product slug) can never
// produce invalid XML.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toUrlTag(entry: SitemapEntry): string {
  const lines = [`  <url>`, `    <loc>${escapeXml(entry.url)}</loc>`];
  if (entry.lastModified) {
    lines.push(`    <lastmod>${entry.lastModified}</lastmod>`);
  }
  lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
  lines.push(`    <priority>${entry.priority}</priority>`);
  lines.push(`  </url>`);
  return lines.join('\n');
}

// A plain route handler (rather than the app/sitemap.ts metadata-file
// convention) so the output can carry a human-readable comment header —
// Next.js's typed MetadataRoute.Sitemap has no field for free-text comments.
// All the data-fetching logic below is otherwise unchanged from that file.
export async function GET() {
  const [products, categories, sellers] = await Promise.all([
    fetchAllPages<{ slug?: string; updatedAt?: string }>('/api/v1/products'),
    fetchAllPages<{ slug?: string; updatedAt?: string }>('/api/v1/categories'),
    fetchAllPages<{ id?: number; updatedAt?: string }>('/api/v1/sellers/verified'),
  ]);

  const staticEntries: SitemapEntry[] = STATIC_PAGES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path === '' ? 'daily' : 'weekly',
    priority,
  }));

  const productEntries: SitemapEntry[] = products
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

  const categoryEntries: SitemapEntry[] = categories
    .filter((c) => c.slug)
    .map((c) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: c.updatedAt ? new Date(c.updatedAt).toISOString() : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

  const sellerEntries: SitemapEntry[] = sellers
    .filter((s) => typeof s.id === 'number')
    .map((s) => ({
      url: `${SITE_URL}/sellers/${s.id}`,
      lastModified: s.updatedAt ? new Date(s.updatedAt).toISOString() : undefined,
      changeFrequency: 'weekly',
      priority: 0.5,
    }));

  const allEntries = [...staticEntries, ...productEntries, ...categoryEntries, ...sellerEntries];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<!--
  ${SITE_URL}
  Developed by Grigorio Guterres Gusmao
  Founder & Full Stack Developer
  Phone: 74492303 | Email: guterresgusmaogrigorio@gmail.com
  GitHub: https://github.com/GrigorioGuterres
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.map(toUrlTag).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
