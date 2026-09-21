'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowRight, Grid3x3, Truck, Wallet, Sparkles } from 'lucide-react';

import { useHeroBanners, type HeroBanner } from '@/hooks/useHeroBanners';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/LanguageContext';

const AUTOPLAY_INTERVAL_MS = 5000;

// Splits off the last word of a title so it can be rendered in the accent
// color (e.g. "...online iha Timor-Leste" -> "Timor-Leste" highlighted) — a
// common hero pattern that adds visual focus without any per-banner admin
// field. Titles are free-text, so this degrades gracefully: a one-word
// title just highlights that whole word, never breaks or misrenders.
function splitLastWord(title: string): [string, string] {
  const lastSpace = title.trim().lastIndexOf(' ');
  if (lastSpace === -1) return ['', title.trim()];
  return [title.slice(0, lastSpace + 1), title.slice(lastSpace + 1)];
}

// One slide = one admin-managed banner: badge/headline/subtitle/CTA on one
// side, a decorative image on the other. Unlike the old pure-image banner,
// content here is real data (see HeroBanner) rendered by this component,
// not baked into the image itself — that's what lets admins edit copy
// without re-exporting a graphic.
//
// Mobile gets a compact card: image bleeds in from the edge behind a short
// text column with one CTA — the old stacked layout (badge, two-line title,
// subtitle, two buttons, three trust rows, then a separate image block)
// pushed the rest of the homepage a full extra scroll below the fold on a
// phone. Trust signals and the secondary "browse categories" CTA still get
// their room back from `sm:` up, where there's actual space for them.
function HeroSlide({ banner, priority = false }: {
  banner: HeroBanner;
  priority?: boolean;
}) {
  const { t } = useTranslation();
  const href = banner.buttonUrl || '/products';
  const mobileImage = banner.mobileImage || banner.desktopImage;
  const [titleLead, titleAccent] = splitLastWord(banner.title);

  const trustItems = [
    { icon: Truck, label: t('hero.trustDelivery') },
    { icon: Wallet, label: t('hero.trustCod') },
    { icon: Sparkles, label: t('hero.trustLocal') },
  ];

  return (
    <div className="min-w-0 flex-[0_0_100%] px-1">
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card">
        {/* Soft brand-colored glow behind the image side — adds depth
            without a generic gradient wash across the whole banner. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 hidden h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl md:block"
        />

        <div className="relative flex min-h-[220px] items-center sm:min-h-0 sm:grid sm:grid-cols-2 sm:gap-8 sm:p-8 md:gap-10 md:p-10">
          <div className="relative z-10 w-[58%] p-4 xs:w-1/2 sm:w-auto sm:p-0 sm:text-left">
            {banner.badge && (
              <span className="mb-2 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary sm:mb-3 sm:px-3 sm:text-xs">
                {banner.badge}
              </span>
            )}
            <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {titleLead}
              <span className="text-primary">{titleAccent}</span>
            </h1>
            {banner.subtitle && (
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground sm:mt-3 sm:line-clamp-none sm:text-base">
                {banner.subtitle}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-3 sm:mt-5">
              <Link
                href={href}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:gap-2 sm:px-6 sm:py-3 sm:text-sm"
              >
                {banner.buttonText || t('hero.shopNow')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4" />
              </Link>
              <Link
                href="/categories"
                className="hidden items-center gap-2 rounded-lg border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex"
              >
                <Grid3x3 className="h-4 w-4" />
                {t('hero.browseCategories')}
              </Link>
            </div>

            {/* Trust signals — surfaced right under the CTAs, not buried in
                the footer, since trust (not product discovery) is the main
                adoption barrier for first-time online shoppers locally.
                Hidden on mobile, where the compact card has no room for a
                third row of content without pushing back past one screen. */}
            <div className="mt-5 hidden flex-wrap items-center gap-x-5 gap-y-2 sm:flex">
              {trustItems.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image bleeds in from the trailing edge on mobile (bottom-anchored,
              partially cropped by the card) instead of sitting in its own
              full-width block below the text — that single change is most of
              what makes the card feel like one compact banner instead of two
              stacked sections. From sm: up it goes back to a normal contained
              box beside the text, where the extra width means it doesn't need
              to overlap anything. */}
          <div className="absolute inset-y-0 right-0 w-[46%] xs:w-1/2 sm:relative sm:inset-auto sm:aspect-[4/3] sm:w-full">
            <Image
              src={banner.desktopImage}
              alt={banner.title}
              fill
              className="hidden object-contain object-bottom sm:block sm:object-center"
              sizes="(min-width: 640px) 40vw, 0px"
              priority={priority}
            />
            <Image
              src={mobileImage}
              alt={banner.title}
              fill
              className="object-contain object-bottom sm:hidden"
              sizes="(max-width: 639px) 45vw, 0px"
              priority={priority}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroCarousel({ banners }: { banners: HeroBanner[] }) {
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
    <div className="container-custom py-4 sm:py-8">
      <div className="relative">
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {banners.map((banner, index) => (
              <HeroSlide
                key={banner.id}
                banner={banner}
                priority={index === 0}
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
    <div className="container-custom py-4 sm:py-8">
      <Skeleton className="h-[420px] w-full rounded-xl sm:h-[320px]" />
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
