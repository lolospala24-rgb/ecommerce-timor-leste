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

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 border rounded-2xl overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <Skeleton
                key={i}
                className="h-[130px] sm:h-[160px] rounded-none border-r border-b"
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
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold">
              Browse Categories
            </h2>

            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Discover products by category
            </p>
          </div>

          <Link
            href="/categories"
            className="shrink-0 inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-primary font-medium hover:underline"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Carousel */}
        <div className="relative">

          {/* Left/Right Arrows — desktop only. On mobile they sat half
              outside the carousel edge and got clipped by the viewport;
              touch swipe (embla's default drag) already covers navigation
              there. */}
          {slides.length > 1 && (
          <button
            onClick={scrollPrev}
            disabled={!canScrollPrev}
            aria-label="Previous categories"
            className="
              hidden
              md:flex
              absolute
              left-0
              top-1/2
              z-20
              -translate-x-5
              -translate-y-1/2
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

          {slides.length > 1 && (
          <button
            onClick={scrollNext}
            disabled={!canScrollNext}
            aria-label="Next categories"
            className="
              hidden
              md:flex
              absolute
              right-0
              top-1/2
              z-20
              translate-x-5
              -translate-y-1/2
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10">

                    {slide.map((category) => (
                      <Link
                        key={category.id}
                        href={`/categories/${category.slug}`}
                        className="
                          group
                          relative
                          flex
                          h-[130px]
                          sm:h-[150px]
                          md:h-[170px]
                          flex-col
                          items-center
                          justify-center
                          border-r
                          border-b
                          p-2
                          sm:p-3
                          md:p-4
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
                              right-1.5
                              top-1.5
                              sm:right-2
                              sm:top-2
                              rounded-full
                              bg-primary/10
                              px-1.5
                              py-0.5
                              sm:px-2
                              sm:py-1
                              text-[9px]
                              sm:text-[10px]
                              font-semibold
                              text-primary
                            "
                          >
                            Featured
                          </span>
                        )}

                        <div
                          className="
                            mb-2
                            sm:mb-3
                            md:mb-4
                            flex
                            h-12
                            w-12
                            sm:h-16
                            sm:w-16
                            md:h-20
                            md:w-20
                            items-center
                            justify-center
                            rounded-full
                            bg-muted
                            group-hover:scale-105
                            transition
                          "
                        >
                          {category.image ? (
                            <div className="relative h-8 w-8 sm:h-11 sm:w-11 md:h-14 md:w-14">
                              <Image
                                src={category.image}
                                alt={category.name}
                                fill
                                sizes="80px"
                                className="object-contain"
                              />
                            </div>
                          ) : (
                            <FolderTree className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-muted-foreground" />
                          )}
                        </div>

                        <h3 className="line-clamp-2 text-[11px] sm:text-xs md:text-sm font-semibold">
                          {category.name}
                        </h3>

                        {!!category.productCount && category.productCount > 0 && (
                          <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
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