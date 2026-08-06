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

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  return <ProductDetailPageContent slug={slug} />;
}
