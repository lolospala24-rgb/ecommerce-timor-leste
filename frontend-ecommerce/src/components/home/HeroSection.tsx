'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';

import { useHeroBanners, type HeroBanner } from '@/hooks/useHeroBanners';
import { Skeleton } from '@/components/ui/skeleton';

const AUTOPLAY_INTERVAL_MS = 5000;
const DESKTOP_HERO_HEIGHT = 'h-[280px] xl:h-[320px]';

// Pure image banners — the image itself is the full designed graphic
// (title, pricing, branding all baked in by whoever designs it), so this
// just renders the image as a clickable link. No text/price overlay.
function BannerCard({ banner, imageKey, className = '', priority = false }: {
  banner: HeroBanner;
  imageKey: 'desktopImage' | 'mobileImage';
  className?: string;
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
        sizes={imageKey === 'mobileImage' ? '100vw' : '50vw'}
        priority={priority}
      />
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
              <BannerCard banner={banner} imageKey="mobileImage" className="h-full w-full" priority={index === 0} />
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
