'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n/LanguageContext';

// Mirrors QuickMenu.tsx's exact structure (same section padding, same
// grid-cols-4 gap-2 sm:gap-4, same icon-circle sizing at h-12/sm:h-14) so
// swapping this for the real QuickMenu causes no layout shift. The section
// title renders for real (it's static copy, not data), matching the
// reference — only the 4 item slots (icon + label) are placeholders.
export function QuickMenuSkeleton() {
  const { t } = useTranslation();

  return (
    <section className="border-b bg-background py-6 md:py-8">
      <div className="container-custom">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('home.quickMenu.title')}
        </h2>

        <div className="grid grid-cols-4 gap-2 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 rounded-lg p-3">
              <Skeleton className="h-12 w-12 rounded-full sm:h-14 sm:w-14" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
