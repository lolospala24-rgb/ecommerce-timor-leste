'use client';

import { HeroSection } from '@/components/home/HeroSection';
import QuickMenu from '@/components/home/QuickMenu';
import { QuickMenuSkeleton } from '@/components/home/QuickMenuSkeleton';
import { HomepageSections } from '@/components/home/HomepageSections';
import { TopSellers } from '@/components/home/TopSellers';
import { useHomepageSections } from '@/hooks/useHomepageSections';

// Product sections (Featured/New Arrivals/Popular/Local/...) are no longer
// individual hardcoded components — HomepageSections fetches the admin-
// configured section list from the backend's Homepage Section Engine in one
// call and renders all of them through one reusable renderer. Adding a new
// section (e.g. "On Sale") in the admin panel needs no frontend change.
//
// The "Explora Kategoria" category showcase used to render here too; it now
// lives as the header's All-Categories dropdown (same category data), so
// this page doesn't duplicate that. A FeaturedCategories section (isFeatured
// showcase) was tried here too but removed at the user's request.
export function HomePageClient() {
  // Reuses HomepageSections' own query (React Query dedupes identical keys,
  // so this is not a second network request) purely to decide whether
  // QuickMenu — which has no data of its own to wait for — should still
  // show as a skeleton alongside the product grid below it, rather than
  // popping in ahead of everything else still loading.
  const { isLoading: isHomepageSectionsLoading } = useHomepageSections();

  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      {isHomepageSectionsLoading ? <QuickMenuSkeleton /> : <QuickMenu />}
      <HomepageSections />
      <TopSellers />
    </div>
  );
}
