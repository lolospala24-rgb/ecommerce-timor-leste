'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight } from 'lucide-react';

import { useHeroBanners, type HeroBanner } from '@/hooks/useHeroBanners';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';

const AUTOPLAY_INTERVAL_MS = 5000;
const DESKTOP_HERO_HEIGHT = 'h-[280px] xl:h-[320px]';

function BannerContent({ banner, compact = false }: { banner: HeroBanner; compact?: boolean }) {
  const hasDiscount = banner.comparePrice != null && banner.price != null && banner.comparePrice > banner.price;
  const discountPercent = hasDiscount
    ? Math.round(((banner.comparePrice! - banner.price!) / banner.comparePrice!) * 100)
    : 0;

  return (
    <div className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      {banner.badge && (
        <span className={`mb-2 w-fit rounded-full bg-white/15 backdrop-blur-sm text-white font-semibold border border-white/20 ${compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}>
          {banner.badge}
        </span>
      )}
      <h3 className={`font-bold text-white leading-tight line-clamp-2 ${compact ? 'text-base' : 'text-lg sm:text-xl'}`}>
        {banner.title}
      </h3>
      {banner.subtitle && (
        <p className={`text-white/80 line-clamp-1 ${compact ? 'text-xs mt-0.5' : 'text-sm mt-1'}`}>
          {banner.subtitle}
        </p>
      )}
      {(banner.price != null || hasDiscount) && (
        <div className="mt-2 flex items-center gap-2">
          {banner.price != null && (
            <span className={`font-bold text-white ${compact ? 'text-sm' : 'text-base'}`}>
              {formatCurrency(banner.price)}
            </span>
          )}
          {hasDiscount && (
            <>
              <span className="text-white/50 text-xs line-through">{formatCurrency(banner.comparePrice!)}</span>
              <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                -{discountPercent}%
              </span>
            </>
          )}
        </div>
      )}
      {banner.buttonText && (
        <span className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white font-semibold text-black transition-transform group-hover:scale-105 ${compact ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'}`}>
          {banner.buttonText}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}

function BannerCard({ banner, imageKey, className = '', compact = false, priority = false }: {
  banner: HeroBanner;
  imageKey: 'desktopImage' | 'mobileImage';
  className?: string;
  compact?: boolean;
  priority?: boolean;
}) {
  const href = banner.buttonUrl || '/products';
  const image = (imageKey === 'mobileImage' ? banner.mobileImage : null) || banner.desktopImage;

  return (
    <Link
      href={href}
      className={`group relative block h-full w-full overflow-hidden rounded-2xl bg-muted ${className}`}
    >
      <Image
        src={image}
        alt={banner.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes={compact ? '100vw' : '50vw'}
        priority={priority}
      />
      <BannerContent banner={banner} compact={compact} />
    </Link>
  );
}

// Matches the real Shopee homepage hero: one large banner on the left plus
// up to two smaller banners stacked on the right, each its own rounded
// card with a visible gap between them (not a seamless borderless merge).
// Caps at 3 banners because that's the composition this layout is built
// for — additional configured banners don't have a slot here.
function DesktopHeroGrid({ banners }: { banners: HeroBanner[] }) {
  const shown = banners.slice(0, 3);
  if (shown.length === 0) return null;

  if (shown.length === 1) {
    return (
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
          <BannerCard banner={shown[0]} imageKey="desktopImage" className={`w-full ${DESKTOP_HERO_HEIGHT}`} priority />
        </div>
      </div>
    );
  }

  if (shown.length === 2) {
    return (
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
          <div className={`grid grid-cols-2 gap-3 ${DESKTOP_HERO_HEIGHT}`}>
            {shown.map((banner, index) => (
              <BannerCard key={banner.id} banner={banner} imageKey="desktopImage" className="h-full w-full" priority={index === 0} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const [main, ...secondary] = shown;
  return (
    <div className="hidden lg:block">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
        <div className={`grid gap-3 ${DESKTOP_HERO_HEIGHT}`} style={{ gridTemplateColumns: '2fr 1fr' }}>
          <BannerCard banner={main} imageKey="desktopImage" className="h-full w-full" priority />
          <div className="grid gap-3" style={{ gridTemplateRows: `repeat(${secondary.length}, 1fr)` }}>
            {secondary.map((banner) => (
              <BannerCard key={banner.id} banner={banner} imageKey="desktopImage" className="h-full w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileHeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAutoplay = useCallback(() => {
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (!emblaApi || banners.length <= 1) return;
    stopAutoplay();
    autoplayTimer.current = setInterval(() => emblaApi.scrollNext(), AUTOPLAY_INTERVAL_MS);
  }, [emblaApi, banners.length, stopAutoplay]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('pointerDown', stopAutoplay);
    emblaApi.on('pointerUp', startAutoplay);
    startAutoplay();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('pointerDown', stopAutoplay);
      emblaApi.off('pointerUp', startAutoplay);
      stopAutoplay();
    };
  }, [emblaApi, startAutoplay, stopAutoplay]);

  return (
    <div className="lg:hidden px-4 sm:px-6 py-4">
      <div ref={emblaRef} className="overflow-hidden rounded-2xl">
        <div className="flex">
          {banners.map((banner, index) => (
            <div key={banner.id} className="relative aspect-[4/3] min-w-0 flex-[0_0_100%]">
              <BannerCard banner={banner} imageKey="mobileImage" className="h-full w-full" compact priority={index === 0} />
            </div>
          ))}
        </div>
      </div>

      {banners.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => emblaApi?.scrollTo(index)}
              aria-label={`Go to banner ${index + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                selectedIndex === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HeroSkeleton() {
  return (
    <>
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
          <Skeleton className={`w-full rounded-2xl ${DESKTOP_HERO_HEIGHT}`} />
        </div>
      </div>
      <div className="lg:hidden px-4 sm:px-6 py-4">
        <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
      </div>
    </>
  );
}

export function HeroSection() {
  const { data: banners, isLoading, isError } = useHeroBanners();

  if (isLoading) {
    return (
      <section>
        <HeroSkeleton />
      </section>
    );
  }

  // No configured/active banners (or the request failed) — the rest of the
  // homepage (QuickMenu, CategoriesShowcase, HomepageSections) still renders
  // fine without a hero, so this section simply omits itself rather than
  // showing broken/fake placeholder content.
  if (isError || !banners || banners.length === 0) {
    return null;
  }

  return (
    <section>
      <DesktopHeroGrid banners={banners} />
      <MobileHeroCarousel banners={banners} />
    </section>
  );
}
