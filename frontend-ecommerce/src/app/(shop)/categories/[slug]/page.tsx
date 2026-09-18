import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryPageContent } from '@/components/categories/CategoryPageContent';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://lolospala.com';
const DEFAULT_SITE_NAME = 'Lolospala';

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

// Single fetch reused by generateMetadata and the page body's notFound()
// check — Next.js dedupes identical `fetch` calls within one render pass.
async function getPublicCategory(slug: string): Promise<Record<string, any> | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/v1/categories/slug/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const category = json?.data?.data ?? json?.data;
    if (!category || category.isActive === false) return null;
    return category;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [category, siteName] = await Promise.all([getPublicCategory(slug), getSiteName()]);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  const url = `${SITE_URL}/categories/${slug}`;

  return {
    title: `${category.name} | ${siteName}`,
    description: category.description || `Shop ${category.name} products online.`,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: category.name,
      description: category.description,
      url,
      siteName,
      images: category.banner || category.image ? [category.banner || category.image] : [],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;

  // Real HTTP 404 for a category that doesn't exist or was deactivated —
  // CategoryPageContent's own client-side notFound() call only affects
  // client-side navigations, not the initial server response status.
  const category = await getPublicCategory(slug);
  if (!category) {
    notFound();
  }

  return <CategoryPageContent slug={slug} />;
}
