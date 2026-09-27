'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useFeaturedCategories } from '@/hooks/useCategories';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';

// Surfaces Category.isFeatured (admin-toggled) as a homepage showcase strip.
// This endpoint (GET /categories/featured) already existed and was fully
// working, just never rendered anywhere on the storefront — this is its
// first real consumer. Deliberately category-discovery only (icon/image +
// name + product count linking to the category page), not a product grid:
// admins already have a purpose-built way to spotlight one category's
// actual products on the homepage (Homepage Sections -> rule "CATEGORY"),
// so duplicating that here would just be two mechanisms doing the same job.
export function FeaturedCategories() {
  const { t } = useTranslation();
  const { data: categories, isLoading } = useFeaturedCategories();

  if (isLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="text-center mb-8">
            <Skeleton className="mx-auto h-7 w-56" />
            <Skeleton className="mx-auto mt-2 h-4 w-72" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container-custom">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-primary">
            <LayoutGrid className="h-5 w-5" />
            <span className="text-sm font-medium">{t('home.featuredCategories.badge')}</span>
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.featuredCategories.title')}</h2>
          <p className="text-muted-foreground mt-1">{t('home.featuredCategories.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((category: any) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/categories"
            className="text-primary hover:underline font-medium inline-flex items-center gap-1 group"
          >
            {t('home.featuredCategories.viewAll')}
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: any }) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const Icon = getCategoryIcon(category.name);
  // This endpoint returns Prisma's raw `_count.products` shape, unlike
  // findAll()/getCategoryTree() which flatten it to `productCount`.
  const productCount = category._count?.products ?? category.productCount ?? 0;

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col items-center rounded-xl border bg-card p-4 text-center transition-colors hover:border-primary/30 hover:bg-muted/20"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary/10">
        {category.image && !imageError ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            sizes="56px"
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
      <h3 className="mt-3 w-full truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
        {category.name}
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {productCount} {t('home.featuredCategories.products')}
      </p>
    </Link>
  );
}
