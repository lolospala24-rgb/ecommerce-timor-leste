'use client';

import { useState } from 'react';
import { ProductGrid } from '@/components/products/ProductGrid';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/useProducts';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { AlertCircle, MapPin } from 'lucide-react';

// Dedicated Local Products page — every product here is filtered by
// Product.isLocallyMade (a seller-set tag, not a category), so a local
// seller shows up regardless of which category their product sits in.
// See HomepageSections.tsx's "Discover Local Products" link and
// homepage.service.ts's resolveLocallyMade for the same underlying filter.
export default function LocalProductsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useProducts({
    page,
    limit: 24,
    isLocallyMade: true,
    isActive: true,
  });

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 text-center md:p-12">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">{t('localProducts.title')}</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t('localProducts.subtitle')}</p>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-square rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          title={t('localProducts.error.title')}
          description={t('localProducts.error.description')}
          icon={<AlertCircle className="h-10 w-10 text-muted-foreground" />}
          action={{ label: t('localProducts.error.retry'), onClick: () => refetch() }}
        />
      ) : (
        <ProductGrid
          products={data?.data || []}
          pagination={data?.pagination}
          onPageChange={handlePageChange}
          columns={4}
        />
      )}
    </div>
  );
}
