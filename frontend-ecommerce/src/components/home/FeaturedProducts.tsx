'use client';

import Link from 'next/link';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/products/ProductCard';
import type { Product } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowRight, Sparkles } from 'lucide-react';

export function FeaturedProducts() {
  const { data: products, isLoading } = useFeaturedProducts(8);

  if (isLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary animate-pulse-soft" />
                <h2 className="text-2xl font-bold sm:text-3xl">Featured Products</h2>
              </div>
              <p className="text-muted-foreground mt-1">Handpicked products just for you</p>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-96 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return (
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold sm:text-3xl">Featured Products</h2>
          </div>
          <EmptyState
            title="No featured products yet"
            description="Check back soon — our team is curating a selection for you."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold sm:text-3xl">Featured Products</h2>
            </div>
            <p className="text-muted-foreground mt-1">
              Handpicked products just for you
            </p>
          </div>
          <Button variant="ghost" className="gap-1 group" asChild>
            <Link href="/products">
              View All
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {(products as Product[]).slice(0, 8).map((product: Product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
