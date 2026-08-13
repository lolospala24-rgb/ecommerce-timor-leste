'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  ShoppingBag, 
  Truck, 
  Shield, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Star,
  Sparkles,
  TrendingUp,
  Store
} from 'lucide-react';

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { data: featuredProducts, isLoading } = useFeaturedProducts(5);

  // Slides data with product images. `comparePrice` is the only real
  // "before discount" figure the backend provides — a slide only claims a
  // discount when comparePrice is genuinely higher than the current price,
  // never a fabricated markup.
  const slides = featuredProducts?.map((product: any) => {
    const hasRealDiscount = product.comparePrice != null && product.comparePrice > product.price;
    return {
      id: product.id,
      title: product.name,
      subtitle: product.nameTetum || 'Featured Product',
      description: product.description?.substring(0, 120) + '...' || 'Discover amazing products from local sellers',
      image: product.images?.[0] || product.thumbnail || '/images/placeholder.png',
      price: product.price,
      originalPrice: hasRealDiscount ? product.comparePrice : null,
      rating: product.rating || 0,
      reviewCount: product.totalReviews || 0,
      slug: product.slug,
      storeName: product.seller?.storeName || 'Local Seller',
      storeLogo: product.seller?.logo,
      isFeatured: product.isFeatured || false,
      cta: 'Shop Now',
      ctaLink: `/products/${product.slug}`,
    };
  }) || [];

  // Fallback slides if no products
  const fallbackSlides = [
    {
      id: 1,
      title: 'Welcome to E-commerce Timor-Leste',
      subtitle: 'Your Trusted Online Marketplace',
      description: 'Discover thousands of products from local sellers across Timor-Leste. Shop with confidence and support local businesses.',
      image: '/images/placeholder.png',
      price: null,
      originalPrice: null,
      rating: null,
      reviewCount: null,
      slug: '/products',
      storeName: null,
      storeLogo: null,
      isFeatured: false,
      discount: null,
      cta: 'Start Shopping',
      ctaLink: '/products',
    },
    {
      id: 2,
      title: 'Support Local Businesses',
      subtitle: 'Buy from Timorese Sellers',
      description: 'Connect with verified sellers from all 13 municipalities. Find unique products made with love in Timor-Leste.',
      image: '/images/placeholder.png',
      price: null,
      originalPrice: null,
      rating: null,
      reviewCount: null,
      slug: '/sellers',
      storeName: null,
      storeLogo: null,
      isFeatured: false,
      discount: null,
      cta: 'Explore Sellers',
      ctaLink: '/sellers',
    },
  ];

  const displaySlides = slides.length > 0 ? slides : fallbackSlides;

  // Navigation functions
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % displaySlides.length);
  }, [displaySlides.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + displaySlides.length) % displaySlides.length);
  }, [displaySlides.length]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      nextSlide();
    }
    if (touchStart - touchEnd < -75) {
      prevSlide();
    }
  };

  // Auto-play slides
  useEffect(() => {
    if (!isAutoPlaying || displaySlides.length <= 1) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, nextSlide, displaySlides.length]);

  // Pause auto-play on hover
  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  const current = displaySlides[currentSlide];
  const discountPercent = current.originalPrice && current.price
    ? Math.round(((current.originalPrice - current.price) / current.originalPrice) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="relative h-[60vh] min-h-[400px] max-h-[600px] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading featured products...</p>
        </div>
      </div>
    );
  }

  return (
    <section 
      className="relative h-[60vh] min-h-[400px] max-h-[600px] overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        {current.image && current.image !== '/images/placeholder.png' ? (
          <>
            <Image
              src={current.image}
              alt={current.title}
              fill
              className="object-cover transition-transform duration-700 scale-105"
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/50" />
        )}
      </div>

      {/* Content Container */}
      <div className="relative h-full flex items-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left Content */}
          <div className="space-y-4 sm:space-y-5 animate-in slide-in-left">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {current.isFeatured && (
                <span className="inline-flex items-center gap-1.5 bg-amber-500/20 backdrop-blur-sm text-amber-300 text-xs font-semibold px-3 py-1 rounded-full border border-amber-500/30">
                  <Sparkles className="h-3.5 w-3.5" />
                  Featured
                </span>
              )}
              {discountPercent > 0 && (
                <span className="inline-flex items-center gap-1.5 bg-red-600/20 backdrop-blur-sm text-red-400 text-xs font-semibold px-3 py-1 rounded-full border border-red-600/30">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {discountPercent}% OFF
                </span>
              )}
              {current.storeName && (
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1 rounded-full border border-white/10">
                  <Store className="h-3.5 w-3.5" />
                  {current.storeName}
                </span>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                {current.title}
              </h1>
              <p className="text-xl sm:text-2xl md:text-3xl text-white/80 font-medium mt-1">
                {current.subtitle}
              </p>
            </div>

            {/* Description - Hidden on mobile, shown on tablet+ */}
            <p className="hidden sm:block text-white/70 text-base md:text-lg max-w-lg line-clamp-2">
              {current.description}
            </p>

            {/* Price & Rating */}
            <div className="flex flex-wrap items-center gap-4">
              {current.price && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    ${current.price.toFixed(2)}
                  </span>
                  {current.originalPrice && (
                    <span className="text-white/40 text-sm line-through">
                      ${current.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              )}
              {current.rating && (
                <div className="flex items-center gap-1.5 text-white/80 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                  <span className="font-medium text-sm">{current.rating.toFixed(1)}</span>
                  {current.reviewCount && (
                    <span className="text-white/40 text-xs">({current.reviewCount})</span>
                  )}
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-3 pt-1">
              <Button 
                size="lg" 
                className="gap-2 text-base shadow-lg hover:shadow-xl transition-all bg-white text-primary hover:bg-white/90"
                asChild
              >
                <Link href={current.ctaLink}>
                  {current.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 hover:text-white hover:border-white/30"
                asChild
              >
                <Link href="/products">Browse All</Link>
              </Button>
            </div>

            {/* Trust Badges - Responsive grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2 max-w-md">
              {[
                { icon: Truck, label: 'Free Delivery' },
                { icon: Shield, label: 'Secure Shopping' },
                { icon: Clock, label: '24/7 Support' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-1.5 text-white/50 text-xs sm:text-sm">
                  <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Product Preview Card */}
          <div className="hidden lg:flex justify-end items-center">
            {current.price && current.image && current.image !== '/images/placeholder.png' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20 shadow-2xl max-w-xs w-full animate-in slide-in-right">
                {/* Product Image */}
                <div className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
                  <Image
                    src={current.image}
                    alt={current.title}
                    fill
                    className="object-cover"
                    sizes="300px"
                  />
                  {discountPercent > 0 && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      -{discountPercent}%
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="mt-4 space-y-2">
                  <h3 className="text-white font-semibold line-clamp-1 text-sm">
                    {current.title}
                  </h3>
                  {current.storeName && (
                    <p className="text-white/40 text-xs">{current.storeName}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-white">
                        ${current.price.toFixed(2)}
                      </span>
                      {current.originalPrice && (
                        <span className="text-white/30 text-xs line-through ml-2">
                          ${current.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <Button size="sm" className="gap-1 text-xs" asChild>
                      <Link href={current.ctaLink}>
                        View
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      {displaySlides.length > 1 && (
        <>
          {/* Desktop Arrows */}
          <div className="hidden sm:block">
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all hover:scale-110 border border-white/10"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2.5 rounded-full bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 transition-all hover:scale-110 border border-white/10"
              aria-label="Next slide"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 sm:gap-2">
            {displaySlides.map((_: unknown, index: number) => (
              <button
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  currentSlide === index
                    ? 'w-8 sm:w-10 bg-white'
                    : 'w-4 sm:w-5 bg-white/30 hover:bg-white/50'
                }`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Mobile Swipe Indicator */}
          <div className="sm:hidden absolute bottom-12 left-1/2 -translate-x-1/2 z-10 text-white/20 text-xs flex items-center gap-2">
            <span className="w-8 h-0.5 bg-white/20 rounded-full" />
            <span>Swipe</span>
            <span className="w-8 h-0.5 bg-white/20 rounded-full" />
          </div>
        </>
      )}

      {/* Auto-play Progress Bar */}
      {isAutoPlaying && displaySlides.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-10">
          <div 
            className="h-full bg-white/60 rounded-r-full transition-all duration-[5000ms] ease-linear"
            style={{ width: '100%' }}
            key={currentSlide}
          />
        </div>
      )}

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background/20 to-transparent pointer-events-none" />
      <div className="absolute top-10 right-10 w-32 sm:w-48 h-32 sm:h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-24 sm:w-36 h-24 sm:h-36 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      {/* Slide Counter (Desktop) */}
      {displaySlides.length > 1 && (
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1 text-white/60 text-xs sm:text-sm">
          {currentSlide + 1} / {displaySlides.length}
        </div>
      )}
    </section>
  );
}