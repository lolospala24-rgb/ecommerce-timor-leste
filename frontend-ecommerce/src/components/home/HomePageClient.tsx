'use client';

import { HeroSection } from '@/components/home/HeroSection';
import QuickMenu from '@/components/home/QuickMenu';
import { HomepageSections } from '@/components/home/HomepageSections';
import { TopSellers } from '@/components/home/TopSellers';

// Product sections (Featured/New Arrivals/Popular/Local/...) are no longer
// individual hardcoded components — HomepageSections fetches the admin-
// configured section list from the backend's Homepage Section Engine in one
// call and renders all of them through one reusable renderer. Adding a new
// section (e.g. "On Sale") in the admin panel needs no frontend change.
// QuickMenu is the same kind of admin-managed section now (Admin Dashboard
// -> Quick Menu) — it handles its own loading/empty state internally (see
// QuickMenu.tsx), so it no longer needs to borrow another section's loading
// state the way it did before it had real data of its own.
//
// The "Explora Kategoria" category showcase used to render here too; it now
// lives as the header's All-Categories dropdown (same category data), so
// this page doesn't duplicate that. A FeaturedCategories section (isFeatured
// showcase) was tried here too but removed at the user's request.
export function HomePageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <QuickMenu />
      <HomepageSections />
      <TopSellers />
    </div>
  );
}
