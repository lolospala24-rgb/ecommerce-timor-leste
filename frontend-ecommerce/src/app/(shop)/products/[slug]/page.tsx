import type { Metadata } from 'next';
import { ProductDetailPageContent } from '@/components/products/ProductDetailPageContent';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return { title: 'Product' };
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/products/slug/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: 'Product Not Found' };

    const json = await res.json();
    const product = json?.data?.data ?? json?.data;

    if (!product) return { title: 'Product Not Found' };

    const title = `${product.name} | E-Commerce Timor-Leste`;
    const description =
      product.description || `Buy ${product.name} online in Timor-Leste for $${product.price}.`;
    const image = product.thumbnail || product.images?.[0];

    return {
      title,
      description,
      openGraph: {
        title: product.name,
        description,
        images: image ? [image] : [],
        type: 'website',
      },
    };
  } catch {
    return { title: 'Product' };
  }
}

// Product structured data (schema.org) so search engines can show price/
// stock/rating directly in search results. Server-rendered so it's present
// in the initial HTML for every crawler, not just JS-executing ones.
async function getProductJsonLd(slug: string): Promise<Record<string, unknown> | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/api/v1/products/slug/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;

    const json = await res.json();
    const product = json?.data?.data ?? json?.data;
    if (!product) return null;

    const image = product.thumbnail || product.images?.[0];

    const jsonLd: Record<string, unknown> = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      description: product.description || undefined,
      image: image ? [image] : undefined,
      sku: product.sku || undefined,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      offers: {
        '@type': 'Offer',
        url: `${siteUrl}/products/${slug}`,
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
  } catch {
    return null;
  }
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const jsonLd = await getProductJsonLd(slug);

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify never escapes "<", so a product name/description
          // containing a literal "</script>" could otherwise break out of
          // this tag and inject arbitrary HTML/script — escaping "<" first
          // closes that off while leaving the JSON semantically identical.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      )}
      <ProductDetailPageContent slug={slug} />
    </>
  );
}
