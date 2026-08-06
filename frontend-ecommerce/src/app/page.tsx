'use client';

import { useState, useEffect } from 'react';
import { HeroSection } from '@/components/home/HeroSection';
import QuickMenu from '@/components/home/QuickMenu';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { NewArrivals } from '@/components/home/NewArrivals';
import { PopularProducts } from '@/components/home/PopularProducts';
import { CategoriesShowcase } from '@/components/home/CategoriesShowcase';
import { LocalProducts } from '@/components/home/LocalProducts';
import { TopSellers } from '@/components/home/TopSellers';
import { Testimonials } from '@/components/home/Testimonials';
import { Newsletter } from '@/components/home/Newsletter';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

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
      <Testimonials />
      <Newsletter />
    </div>
  );
}