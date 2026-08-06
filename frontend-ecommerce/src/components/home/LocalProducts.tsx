'use client';

import Link from 'next/link';
import { useLocalProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin } from 'lucide-react';

export function LocalProducts() {
  const { data, isLoading, isError } = useLocalProducts(8);
  const products = data?.products ?? [];
  const category = data?.category;

  const sectionTitle = category?.name ?? 'Local Products';

  if (isLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold sm:text-3xl">{sectionTitle}</h2>
          </div>
          <p className="text-muted-foreground">Loading local products...</p>
        </div>
      </section>
    );
  }

  if (isError || products.length === 0) {
    return (
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold sm:text-3xl">{sectionTitle}</h2>
          </div>
          <p className="text-muted-foreground">No local products found.</p>
        </div>
      </section>
    );
  }
  const sectionSubtitle =
    category?.description ?? category?.nameTetum ?? null;
  const viewAllHref = category?.slug ? `/categories/${category.slug}` : '/products';

  return (
    <section className="py-12 md:py-16">
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold sm:text-3xl">{sectionTitle}</h2>
            </div>
            {sectionSubtitle && (
              <p className="text-muted-foreground mt-1">{sectionSubtitle}</p>
            )}
          </div>
          <Button variant="ghost" className="gap-1 group" asChild>
            <Link href={viewAllHref}>
              View All
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
