'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Flame } from 'lucide-react';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import type { HomepageSection } from '@/hooks/useHomepageSections';

function useCountdown(target: string | null | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!target) {
      setRemainingMs(null);
      return;
    }
    const targetMs = new Date(target).getTime();
    const tick = () => setRemainingMs(Math.max(targetMs - Date.now(), 0));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (remainingMs == null) return null;
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    expired: remainingMs <= 0,
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 font-mono text-sm font-bold tabular-nums text-white sm:h-10 sm:w-10 sm:text-base">
        {pad(value)}
      </div>
      <span className="mt-0.5 text-[10px] uppercase tracking-wide text-white/70">{label}</span>
    </div>
  );
}

// Visually distinct from the generic ProductSection — a flash sale's whole
// point is urgency (soonest-ending promotions, live countdown), which a
// neutral section header would undersell. Product pricing/badges come
// straight from ProductCard, already Promotion-aware (see lib/pricing.ts);
// this component only adds the countdown chrome around it.
export function FlashSaleSection({ section, isFirstSection = false }: { section: HomepageSection; isFirstSection?: boolean }) {
  const { t } = useTranslation();
  const countdown = useCountdown(section.endsAt);

  // The backend already hides sections with 0 products, but a countdown
  // that hit zero between page load and now means the promotion(s) backing
  // this section just expired — better to hide it than show "00:00:00".
  if (countdown?.expired) return null;

  return (
    <section className="py-8 md:py-16">
      <div className="container-custom">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 to-orange-500">
          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/15 sm:h-10 sm:w-10">
                <Flame className="h-4 w-4 text-white sm:h-5 sm:w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white sm:text-2xl">{section.title}</h2>
                {section.subtitle && <p className="text-sm text-white/80">{section.subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {countdown && (
                <div className="flex items-center gap-1.5">
                  <CountdownBox value={countdown.hours} label="H" />
                  <span className="pb-4 text-lg font-bold text-white/70">:</span>
                  <CountdownBox value={countdown.minutes} label="M" />
                  <span className="pb-4 text-lg font-bold text-white/70">:</span>
                  <CountdownBox value={countdown.seconds} label="S" />
                </div>
              )}
              <Button variant="secondary" size="sm" className="hidden gap-1 group sm:flex" asChild>
                <Link href="/products">
                  {t('home.section.viewAll', { title: section.title })}
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4 xl:grid-cols-6">
          {section.products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              isLocal={product.isLocallyMade}
              priority={isFirstSection && index < 4}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
