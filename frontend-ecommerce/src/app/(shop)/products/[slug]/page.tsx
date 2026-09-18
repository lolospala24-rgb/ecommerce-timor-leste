import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductDetailPageContent } from '@/components/products/ProductDetailPageContent';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';
const DEFAULT_SITE_NAME = 'Lolospala';

// Mirrors layout.tsx's/manifest.ts's own small copy of this fetch (each
// file intentionally keeps its own — see manifest.ts's comment — since
// cache strategy differs per call site). 5-minute revalidate matches the
// product fetch below, so both are consistent within a single response.
async function getSiteName(): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return DEFAULT_SITE_NAME;
  try {
    const res = await fetch(`${apiUrl}/api/v1/settings/public`, { next: { revalidate: 300 } });
    if (!res.ok) return DEFAULT_SITE_NAME;
    const json = await res.json();
    const settings = json?.data?.data ?? json?.data;
    return settings?.siteName || DEFAULT_SITE_NAME;
  } catch {
    return DEFAULT_SITE_NAME;
  }
}

// Single fetch reused by generateMetadata, the JSON-LD builder, and the
// page body's notFound() check — Next.js dedupes identical `fetch` calls
// within one render pass, so this is one network round trip, not three.
// Returns null for both "doesn't exist" and "exists but not public"
// (isActive: false) so every caller treats them identically: a real
// public/products/[slug] page must only ever exist for products that are
// actually meant to be publicly discoverable.
async function getPublicProduct(slug: string): Promise<Record<string, any> | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/v1/products/slug/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const product = json?.data?.data ?? json?.data;
    if (!product || product.isActive === false) return null;
    return product;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, siteName] = await Promise.all([getPublicProduct(slug), getSiteName()]);

  if (!product) {
    return { title: 'Product Not Found' };
  }

  const title = `${product.name} | ${siteName}`;
  const description =
    product.description || `Buy ${product.name} online in Timor-Leste for $${product.price}.`;
  const image = product.thumbnail || product.images?.[0];
  const url = `${SITE_URL}/products/${slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: product.name,
      description,
      url,
      siteName,
      images: image ? [image] : [],
      type: 'website',
    },
  };
}

// Product structured data (schema.org) so search engines can show price/
// stock/rating directly in search results. Server-rendered so it's present
// in the initial HTML for every crawler, not just JS-executing ones.
function buildProductJsonLd(product: Record<string, any>, slug: string): Record<string, unknown> {
  // Primary image first, then any additional distinct product images —
  // schema.org's `image` accepts an array, and Google Images can pick up
  // any of them, not just the thumbnail.
  const images = Array.from(
    new Set(
      [product.thumbnail, ...(Array.isArray(product.images) ? product.images : [])].filter(
        (url): url is string => typeof url === 'string' && url.length > 0,
      ),
    ),
  ).slice(0, 8);

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: images.length > 0 ? images : undefined,
    sku: product.sku || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${slug}`,
      priceCurrency: 'USD',
      price: typeof product.price === 'number' ? product.price.toFixed(2) : undefined,
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: product.seller?.storeName
        ? { '@type': 'Organization', name: product.seller.storeName }
        : undefined,
    },
  };

  // AggregateRating without any reviews isn't valid structured data — only
  // include it when there's at least one real review behind the number.
  if (product.totalReviews > 0 && product.rating) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.totalReviews,
    };
  }

  return jsonLd;
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getPublicProduct(slug);

  // A real HTTP 404 — not a client-rendered "not found" card served under a
  // 200 status — for a product that doesn't exist, was deleted, or was
  // deactivated by its seller/admin. Soft-404s (200 + "not found" content)
  // confuse Google into indexing dead product pages.
  if (!product) {
    notFound();
  }

  const jsonLd = buildProductJsonLd(product, slug);

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify never escapes "<", so a product name/description
        // containing a literal "</script>" could otherwise break out of
        // this tag and inject arbitrary HTML/script — escaping "<" first
        // closes that off while leaving the JSON semantically identical.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ProductDetailPageContent slug={slug} />
    </>
  );
}
