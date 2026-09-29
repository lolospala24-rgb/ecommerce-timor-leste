'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useQuickMenu, type QuickMenuItem } from '@/hooks/useQuickMenu';
import { getQuickMenuIconDefinition } from '@/lib/quickMenuIcons';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { QuickMenuSkeleton } from './QuickMenuSkeleton';
import { cn } from '@/lib/utils';

// Data-driven — admin-managed via Admin Dashboard -> Quick Menu (backend:
// GET /quick-menu, already filtered to isActive + within schedule and
// ordered by displayOrder). No hardcoded item list here anymore; the 4
// "default" items from the original design now just live as seeded
// database rows the admin can edit/reorder/add to/remove freely.
function QuickMenuTile({ item }: { item: QuickMenuItem }) {
  const isUpload = item.iconType === 'UPLOAD' && item.iconUrl;
  const def = getQuickMenuIconDefinition(item.iconKey);
  const Icon = def.icon;

  const content = (
    <>
      <div className="relative">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md sm:h-14 sm:w-14',
            isUpload ? 'bg-muted/60 p-2.5' : def.color,
          )}
        >
          {isUpload ? (
            <Image src={item.iconUrl!} alt="" width={28} height={28} className="h-full w-full object-contain" unoptimized />
          ) : (
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.75} />
          )}
        </div>
        {item.badge && (
          <span className="absolute -right-1.5 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
            {item.badge}
          </span>
        )}
      </div>

      <span className="text-center text-xs font-medium text-foreground/80 group-hover:text-foreground sm:text-sm">
        {item.title}
      </span>
    </>
  );

  const className = 'group flex flex-col items-center gap-2.5 rounded-lg p-3 transition-colors hover:bg-muted/60';

  if (item.linkType === 'EXTERNAL') {
    return (
      <a
        href={item.link}
        target={item.openInNewTab ? '_blank' : undefined}
        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={item.link} target={item.openInNewTab ? '_blank' : undefined} className={className}>
      {content}
    </Link>
  );
}

export default function QuickMenu() {
  const { t } = useTranslation();
  const { data: items, isLoading, isError } = useQuickMenu();

  if (isLoading) {
    return <QuickMenuSkeleton />;
  }

  // No active items (none configured yet, or the request failed) — the
  // rest of the homepage still renders fine without it, so this section
  // simply omits itself rather than showing an empty/broken shell. Same
  // convention HeroSection already uses for its own empty/error case.
  if (isError || !items || items.length === 0) {
    return null;
  }

  return (
    <section className="border-b bg-background py-4 md:py-6">
      <div className="container-custom">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('home.quickMenu.title')}
        </h2>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-4 md:grid-cols-8 sm:gap-4">
          {items.map((item) => (
            <QuickMenuTile key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
