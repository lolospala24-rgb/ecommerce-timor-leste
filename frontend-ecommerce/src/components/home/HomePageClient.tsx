'use client';

import { HeroSection } from '@/components/home/HeroSection';
import QuickMenu from '@/components/home/QuickMenu';
import { HomepageSections } from '@/components/home/HomepageSections';
import { TopSellers } from '@/components/home/TopSellers';
import { RecentlyViewedSection } from '@/components/products/RecentlyViewedSection';

// Product sections (Featured/New Arrivals/Popular/Local/...) are no longer
// individual hardcoded components — HomepageSections fetches the admin-
// configured section list from the backend's Homepage Section Engine in one
// call and renders all of them through one reusable renderer. Adding a new
// section (e.g. "On Sale") in the admin panel needs no frontend change.
//
// The "Explora Kategoria" category showcase used to render here too; it now
// lives as the header's All-Categories dropdown (same category data),
// so this page no longer duplicates it.
export function HomePageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <QuickMenu />
      <HomepageSections />
      <TopSellers />
      <RecentlyViewedSection wrapInSection />
    </div>
  );
}
