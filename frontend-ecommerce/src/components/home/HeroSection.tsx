'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight } from 'lucide-react';

import { useHeroBanners, type HeroBanner } from '@/hooks/useHeroBanners';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/LanguageContext';

const AUTOPLAY_INTERVAL_MS = 5000;

// One slide = one admin-managed banner: badge/headline/subtitle/CTA on one
// side, a decorative image on the other. Unlike the old pure-image banner,
// content here is real data (see HeroBanner) rendered by this component,
// not baked into the image itself — that's what lets admins edit copy
// without re-exporting a graphic.
function HeroSlide({ banner, priority = false, shopNowLabel }: {
  banner: HeroBanner;
  priority?: boolean;
  shopNowLabel: string;
}) {
  const href = banner.buttonUrl || '/products';
  const mobileImage = banner.mobileImage || banner.desktopImage;

  return (
    <div className="min-w-0 flex-[0_0_100%] px-1">
      <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-emerald-50/60 shadow-sm">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-2 md:items-center md:gap-8 md:p-10">
          <div className="text-center md:text-left">
            {banner.badge && (
              <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
                {banner.badge}
              </span>
            )}
            <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl md:text-4xl">
              {banner.title}
            </h1>
            {banner.subtitle && (
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                {banner.subtitle}
              </p>
            )}
            <Link
              href={href}
              className="group mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:scale-105"
            >
              {banner.buttonText || shopNowLabel}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className="relative aspect-[4/3] w-full sm:aspect-square md:aspect-[4/3]">
            <Image
              src={banner.desktopImage}
              alt={banner.title}
              fill
              className="hidden object-contain md:block"
              sizes="(min-width: 768px) 40vw, 0px"
              priority={priority}
            />
            <Image
              src={mobileImage}
              alt={banner.title}
              fill
              className="object-contain md:hidden"
              sizes="(max-width: 767px) 80vw, 0px"
              priority={priority}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
  const { t } = useTranslation();
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
    <div className="container-custom py-6 sm:py-8">
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {banners.map((banner, index) => (
              <HeroSlide
                key={banner.id}
                banner={banner}
                priority={index === 0}
                shopNowLabel={t('hero.shopNow')}
              />
            ))}
          </div>
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5 sm:bottom-6 sm:left-10 sm:translate-x-0">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                aria-label={`Go to banner ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  selectedIndex === index ? 'w-6 bg-primary' : 'w-1.5 bg-primary/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="container-custom py-6 sm:py-8">
      <Skeleton className="h-[420px] w-full rounded-2xl sm:h-[320px]" />
    </div>
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
  // homepage (QuickMenu, HomepageSections) still renders fine without a
  // hero, so this section simply omits itself rather than showing
  // broken/fake placeholder content.
  if (isError || !banners || banners.length === 0) {
    return null;
  }

  return (
    <section>
      <HeroCarousel banners={banners} />
    </section>
  );
}
