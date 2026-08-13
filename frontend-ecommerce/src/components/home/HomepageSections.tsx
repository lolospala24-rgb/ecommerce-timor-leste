'use client';

import Link from 'next/link';
import { useHomepageSections, type HomepageSection } from '@/hooks/useHomepageSections';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
  const Icon = RULE_ICONS[section.rule] ?? Layers;

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
          <Button variant="ghost" className="gap-1 group" asChild>
            <Link href="/products">
              View All
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {section.products.map((product) => (
            <ProductCard key={product.id} product={product} isLocal={section.rule === 'LOCAL'} />
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
