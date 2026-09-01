'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useHomepageSections, type HomepageSection } from '@/hooks/useHomepageSections';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  TrendingUp,
  MapPin,
  Tag,
  AlertTriangle,
  FolderOpen,
  Layers,
  type LucideIcon,
} from 'lucide-react';

// One icon per rule, purely a display concern — the rule engine itself
// (backend) has no notion of icons. Falls back to Layers for any rule
// added later that isn't in this map yet, so a new rule never breaks
// rendering even before someone gets around to picking it a nicer icon.
const RULE_ICONS: Record<HomepageSection['rule'], LucideIcon> = {
  MANUAL: Sparkles,
  NEWEST: Clock,
  POPULAR: TrendingUp,
  BEST_SELLING: TrendingUp,
  LOCAL: MapPin,
  ON_SALE: Tag,
  LIMITED_STOCK: AlertTriangle,
  CATEGORY: FolderOpen,
};

function SectionSkeleton() {
  return (
    <section className="py-12 md:py-16">
      <div className="container-custom">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-96 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}

// The one reusable renderer every homepage section — present today or
// added later through the admin's Rule dropdown — goes through. It has no
// idea how NEWEST vs POPULAR vs a brand-new future rule picked its
// products; it just renders whatever the backend already resolved.
function ProductSection({ section }: { section: HomepageSection }) {
  const { t } = useTranslation();
  const Icon = RULE_ICONS[section.rule] ?? Layers;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.products.length]);

  const scrollByPage = (direction: 'prev' | 'next') => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9 * (direction === 'prev' ? -1 : 1);
    el.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <section className="py-12 md:py-16">
      <div className="container-custom">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold sm:text-3xl">{section.title}</h2>
            </div>
            {section.subtitle && (
              <p className="text-muted-foreground mt-1">{section.subtitle}</p>
            )}
          </div>

          {/* View-all link + prev/next scroll controls, grouped as one
              compact unit — the buttons scroll the row below rather than
              being decorative, and disable themselves at each end. */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Button variant="ghost" className="h-auto gap-1 p-0 group hover:bg-transparent" asChild>
              <Link href="/products">
                {t('home.section.viewAll')}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByPage('prev')}
                disabled={!canScrollPrev}
                aria-label="Previous"
                className="flex h-9 w-9 items-center justify-center rounded-full border text-foreground/70 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByPage('next')}
                disabled={!canScrollNext}
                aria-label="Next"
                className="flex h-9 w-9 items-center justify-center rounded-full border text-foreground/70 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 sm:gap-5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {section.products.map((product) => (
            <div
              key={product.id}
              className="w-[calc(50%-0.5rem)] shrink-0 snap-start sm:w-[calc(50%-0.625rem)] lg:w-[calc(25%-0.9375rem)] xl:w-[calc(20%-1rem)]"
            >
              <ProductCard product={product} isLocal={section.rule === 'LOCAL'} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomepageSections() {
  const { data: sections, isLoading } = useHomepageSections();

  if (isLoading) {
    return <SectionSkeleton />;
  }

  // Empty sections are already excluded by the backend (spec: 0 products
  // -> section hidden), so an empty/undefined result here just means there
  // are currently no active sections at all — render nothing rather than
  // an empty shell.
  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <>
      {sections.map((section) => (
        <ProductSection key={section.id} section={section} />
      ))}
    </>
  );
}
