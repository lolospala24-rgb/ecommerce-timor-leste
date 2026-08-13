'use client';

import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { useCallback, useEffect, useState } from 'react';

import {
  FolderTree,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { useCategories } from '@/hooks/useCategories';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Category } from '@/types/category.types';

export function CategoriesShowcase() {
  const { data: categories, isLoading } = useCategories({
    limit: 100,
    includeProducts: true,
  });

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(() => {
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  if (isLoading) {
    return (
      <section className="py-10">
        <div className="container-custom">
          <Skeleton className="h-8 w-40 mb-6" />

          <div className="grid grid-cols-5 md:grid-cols-10 border rounded-2xl overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-[160px] rounded-none border-r border-b"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories?.data?.length) {
    return (
      <section className="py-10 bg-background">
        <div className="container-custom">
          <h2 className="mb-6 text-2xl font-bold">Browse Categories</h2>
          <EmptyState
            title="No categories yet"
            description="Categories will appear here once they're added to the catalog."
          />
        </div>
      </section>
    );
  }

  const categoryList = categories.data as Category[];

  const parentCategories = categoryList.filter(
    (cat) => !cat.parentId
  );

  const ITEMS_PER_SLIDE = 20;

  const slides: Category[][] = [];

  for (let i = 0; i < parentCategories.length; i += ITEMS_PER_SLIDE) {
    slides.push(parentCategories.slice(i, i + ITEMS_PER_SLIDE));
  }

  return (
    <section className="py-10 bg-background">
      <div className="container-custom">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              Browse Categories
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Discover products by category
            </p>
          </div>

          <Link
            href="/categories"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative">

          {/* Left Arrow */}
          {slides.length > 1 && (
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Previous categories"
            className="
              absolute
              left-0
              top-1/2
              z-20
              -translate-x-5
              -translate-y-1/2
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              border
              bg-white
              shadow-md
              hover:shadow-lg
              disabled:pointer-events-none
              disabled:opacity-40
            "
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          )}

          {/* Right Arrow */}
          {slides.length > 1 && (
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Next categories"
            className="
              absolute
              right-0
              top-1/2
              z-20
              translate-x-5
              -translate-y-1/2
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              border
              bg-white
              shadow-md
              hover:shadow-lg
              disabled:pointer-events-none
              disabled:opacity-40
            "
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          )}

          {/* Embla */}
          <div
            ref={emblaRef}
            className="overflow-hidden rounded-2xl border bg-card"
          >
            <div className="flex">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="min-w-full"
                >
                  <div className="grid grid-cols-5 md:grid-cols-10">

                    {slide.map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        className="
                          group
                          relative
                          flex
                          h-[170px]
                          flex-col
                          items-center
                          justify-center
                          border-r
                          border-b
                          p-4
                          text-center
                          transition-all
                          duration-300
                          hover:bg-muted/30
                          hover:-translate-y-1
                        "
                      >
                        {category.isFeatured && (
                          <span
                            className="
                              absolute
                              right-2
                              top-2
                              rounded-full
                              bg-primary/10
                              px-2
                              py-1
                              text-[10px]
                              font-semibold
                              text-primary
                            "
                          >
                            Featured
                          </span>
                        )}

                        <div
                          className="
                            mb-4
                            flex
                            h-20
                            w-20
                            items-center
                            justify-center
                            rounded-full
                            bg-muted
                            group-hover:scale-105
                            transition
                          "
                        >
                          {category.image ? (
                            <div className="relative h-14 w-14">
                              <Image
                                src={category.image}
                                alt={category.name}
                                fill
                                sizes="80px"
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <FolderTree className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-sm font-semibold">
                          {category.name}
                        </h3>

                        {!!category.productCount && category.productCount > 0 && (
                          <span className="mt-2 text-xs text-muted-foreground">
                            {category.productCount} {category.productCount === 1 ? 'Product' : 'Products'}
                          </span>
                        )}
                      </Link>
                    ))}

                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}