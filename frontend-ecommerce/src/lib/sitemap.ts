// Shared building blocks for the sitemap index (/sitemap.xml) and its
// chunked sub-sitemaps (/sitemaps/*.xml) — kept in one place so there is
// exactly one sitemap system, not a duplicate one per route file.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';
export const API_URL = process.env.NEXT_PUBLIC_API_URL;

// The sitemap protocol caps a single file at 50,000 URLs / 50MB. 5,000 is a
// comfortable margin under that limit while still keeping the number of
// files reasonable — a catalog of 1,000,000 products means 200 chunk files,
// each one cheap to generate and independently cacheable.
export const PRODUCT_CHUNK_SIZE = 5000;
// Matches FilterProductDto's @Max(100) on the products list endpoint — the
// largest single page the backend will accept.
const BACKEND_PAGE_LIMIT = 100;
const PAGES_PER_CHUNK = PRODUCT_CHUNK_SIZE / BACKEND_PAGE_LIMIT;
// How many backend page-fetches run at once per chunk request. Bounded so a
// cold cache (first crawl of a chunk after it expires) doesn't fire 50
// simultaneous queries at the backend — small batches keep DB load steady.
const FETCH_CONCURRENCY = 8;
// Same safety cap already used for categories/sellers (comfortably above
// any realistic catalog size for those two resources).
const MAX_FULL_FETCH_PAGES = 200;

export interface SitemapEntry {
  url: string;
  lastModified?: string;
  changeFrequency: string;
  priority: number;
}

// Escapes the 5 characters XML reserves inside text/attribute content, so a
// stray "&" or "<" in fetched data (e.g. an unusual product slug) can never
// produce invalid XML.
export function escapeXml(value: string): string {
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

const HEADER_COMMENT = `<!--
  ${SITE_URL}
  Developed by Grigorio Guterres Gusmao
  Founder & Full Stack Developer
  Phone: 74492303 | Email: guterresgusmaogrigorio@gmail.com
  GitHub: https://github.com/GrigorioGuterres
-->`;

export function buildUrlset(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
${HEADER_COMMENT}
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(toUrlTag).join('\n')}
</urlset>
`;
}

export function buildSitemapIndex(locs: string[]): string {
  const entries = locs
    .map((loc) => `  <sitemap>\n    <loc>${escapeXml(loc)}</loc>\n  </sitemap>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
${HEADER_COMMENT}
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>
`;
}

interface BackendPage<T> {
  items: T[];
  total: number;
  hasNext: boolean;
}

async function fetchBackendPage<T>(path: string, page: number, limit: number): Promise<BackendPage<T>> {
  if (!API_URL) return { items: [], total: 0, hasNext: false };
  const separator = path.includes('?') ? '&' : '?';
  try {
    const res = await fetch(`${API_URL}${path}${separator}page=${page}&limit=${limit}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { items: [], total: 0, hasNext: false };
    const json = await res.json();
    return {
      items: json?.data?.data ?? [],
      total: json?.data?.pagination?.total ?? 0,
      hasNext: Boolean(json?.data?.pagination?.hasNext),
    };
  } catch {
    return { items: [], total: 0, hasNext: false };
  }
}

// Cheap — the backend always runs a COUNT() regardless of the requested
// page size, so limit=1 costs the same as any other page.
export async function fetchTotalCount(path: string): Promise<number> {
  const { total } = await fetchBackendPage<unknown>(path, 1, 1);
  return total;
}

// Used for categories/sellers: resources that stay small even at marketplace
// scale, so one file covering all of them (bounded by the same safety cap
// the original single-file sitemap used) is simpler than chunking.
export async function fetchAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  while (page <= MAX_FULL_FETCH_PAGES) {
    const { items: pageItems, hasNext } = await fetchBackendPage<T>(path, page, 100);
    items.push(...pageItems);
    if (!hasNext) break;
    page += 1;
  }
  return items;
}

// Fetches exactly the backend pages that make up product chunk `chunkIndex`
// (1-indexed) — never the whole catalog. PRODUCT_CHUNK_SIZE is a multiple of
// BACKEND_PAGE_LIMIT, so chunk boundaries always align to whole backend
// pages; no partial-page slicing is needed.
export async function fetchProductChunk<T>(chunkIndex: number): Promise<T[]> {
  const startPage = (chunkIndex - 1) * PAGES_PER_CHUNK + 1;
  const pageNumbers = Array.from({ length: PAGES_PER_CHUNK }, (_, i) => startPage + i);

  const items: T[] = [];
  let exhausted = false;
  for (let i = 0; i < pageNumbers.length && !exhausted; i += FETCH_CONCURRENCY) {
    const batch = pageNumbers.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map((page) => fetchBackendPage<T>('/api/v1/products', page, 100)),
    );
    for (const result of results) {
      items.push(...result.items);
      // Backend ran out of pages before this chunk filled up (catalog
      // shrank since the count was read, or this is the last chunk) — stop
      // issuing further page requests.
      if (!result.hasNext) {
        exhausted = true;
        break;
      }
    }
  }
  return items;
}

export function productChunkCount(totalProducts: number): number {
  return Math.max(1, Math.ceil(totalProducts / PRODUCT_CHUNK_SIZE));
}
