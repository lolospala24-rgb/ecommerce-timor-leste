import type { Metadata } from 'next';
import { CategoryPageContent } from '@/components/categories/CategoryPageContent';

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    return { title: 'Category' };
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/categories/slug/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { title: 'Category Not Found' };

    const json = await res.json();
    const category = json?.data?.data ?? json?.data;

    return {
      title: `${category?.name || 'Category'} | E-Commerce Timor-Leste`,
      description: category?.description || `Shop ${category?.name} products online.`,
      openGraph: {
        title: category?.name,
        description: category?.description,
        images: category?.banner || category?.image ? [category.banner || category.image] : [],
      },
    };
  } catch {
    return { title: 'Category' };
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  return <CategoryPageContent slug={slug} />;
}
