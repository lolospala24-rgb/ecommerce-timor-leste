'use client';

import { HeroSection } from '@/components/home/HeroSection';
import QuickMenu from '@/components/home/QuickMenu';
import { CategoriesShowcase } from '@/components/home/CategoriesShowcase';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { LocalProducts } from '@/components/home/LocalProducts';
import { NewArrivals } from '@/components/home/NewArrivals';
import { PopularProducts } from '@/components/home/PopularProducts';
import { TopSellers } from '@/components/home/TopSellers';

// Each section below fetches and loads its own data independently (with its
// own skeleton/loading state), so the page renders progressively instead of
// blocking behind one artificial top-level spinner.
export function HomePageClient() {
  return (
    <div className="flex flex-col min-h-screen">
      <HeroSection />
      <QuickMenu />
      <CategoriesShowcase />
      <FeaturedProducts />
      <LocalProducts />
      <NewArrivals />
      <PopularProducts />
      <TopSellers />
    </div>
  );
}
