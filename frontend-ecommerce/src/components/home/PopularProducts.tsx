'use client';

import Link from 'next/link';
import { usePopularProducts } from '@/hooks/useProducts';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ArrowRight, TrendingUp } from 'lucide-react';

export function PopularProducts() {
  const { data: products, isLoading } = usePopularProducts(8);

  if (isLoading) {
    return (
      <section id="popular-products" className="scroll-mt-20 py-12 md:py-16 bg-muted/30">
        <div className="container-custom">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary animate-pulse-soft" />
                <h2 className="text-2xl font-bold sm:text-3xl">Popular Products</h2>
              </div>
              <p className="text-muted-foreground mt-1">What customers love most right now</p>
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
      <section id="popular-products" className="scroll-mt-20 py-12 md:py-16 bg-muted/30">
        <div className="container-custom">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold sm:text-3xl">Popular Products</h2>
          </div>
          <EmptyState
            title="Nothing trending yet"
            description="Popular products will appear here once customers start shopping."
          />
        </div>
      </section>
    );
  }

  return (
    <section id="popular-products" className="scroll-mt-20 py-12 md:py-16 bg-muted/30">
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold sm:text-3xl">Popular Products</h2>
            </div>
            <p className="text-muted-foreground mt-1">What customers love most right now</p>
          </div>
          <Button variant="ghost" className="gap-1 group" asChild>
            <Link href="/products">
              View All
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
