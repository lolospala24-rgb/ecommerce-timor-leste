'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCategoryTree } from '@/hooks/useCategories';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import {
  ChevronRight,
  ArrowRight,
  Truck,
  ShieldCheck,
  BadgeCheck,
  Headset,
  Gift,
} from 'lucide-react';
import type { Category, CategoryChild } from '@/types/category.types';

interface CategoriesMegaMenuProps {
  onNavigate?: () => void;
}

// Same keyword rule categoryIcons.ts uses for its "local" icon match — reused
// here rather than adding a second source of truth for what counts as the
// local-products category.
const isLocalCategory = (name: string) => /local/i.test(name);

// Full mega-menu panel for the header's "All Categories" trigger. Hover a
// category on the left and the center column updates to that category's
// subcategories — the center never opens a second floating panel, it just
// swaps content in place, so the menu stays put while browsing. All data
// comes from the real /categories/tree endpoint (already used by the
// Categories directory page); nothing here is fabricated beyond icon choice
// and the generic promo/trust copy already used elsewhere on the site.
export function CategoriesMegaMenu({ onNavigate }: CategoriesMegaMenuProps) {
  const { t } = useTranslation();
  const { data: tree } = useCategoryTree();
  const categories = (tree ?? []) as Category[];

  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    if (categories.length > 0 && activeId === null) {
      setActiveId(categories[0].id);
    }
  }, [categories, activeId]);

  if (categories.length === 0) {
    return <div className="p-6 text-sm text-muted-foreground">{t('nav.megaMenu.empty')}</div>;
  }

  const activeCategory = categories.find((c) => c.id === activeId) ?? categories[0];
  const activeChildren = (activeCategory.children ?? []) as CategoryChild[];
  const featured = categories.filter((c) => c.isFeatured).slice(0, 4);
  const fallbackFeatured = featured.length > 0 ? featured : categories.slice(0, 4);

  return (
    <div className="flex w-[min(880px,calc(100vw-2rem))] max-h-[min(640px,calc(100vh-6rem))] flex-col overflow-hidden">
      <div className="flex flex-1 overflow-y-auto">
        {/* Browse Categories */}
        <div className="w-56 shrink-0 border-r bg-muted/20 py-3">
          <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nav.megaMenu.browse')}
          </p>
          <ul onMouseLeave={() => setActiveId(activeCategory.id)}>
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.name);
              const isActive = category.id === activeCategory.id;
              const isLocal = isLocalCategory(category.name);
              return (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    onClick={onNavigate}
                    onMouseEnter={() => setActiveId(category.id)}
                    onFocus={() => setActiveId(category.id)}
                    className={`flex items-center gap-2.5 border-l-2 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? 'border-primary bg-primary/10 font-medium text-primary'
                        : isLocal
                          ? 'border-secondary/50 text-foreground/85 hover:bg-secondary/5 hover:text-secondary'
                          : 'border-transparent text-foreground/85 hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    {category.image ? (
                      <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-muted">
                        <Image src={category.image} alt="" fill sizes="20px" className="object-cover" />
                      </span>
                    ) : (
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-primary' : isLocal ? 'text-secondary' : 'text-muted-foreground'
                        }`}
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    {isLocal && !isActive && (
                      <span className="shrink-0 rounded-full bg-secondary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">
                        TL
                      </span>
                    )}
                    <ChevronRight
                      className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/50'}`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t px-4 pt-2">
            <Link
              href="/categories"
              onClick={onNavigate}
              className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t('nav.megaMenu.viewAll')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Active category's subcategories — swaps in place on hover,
            never a second floating panel. */}
        <div className="flex-1 px-6 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
            {activeCategory.name}
          </p>
          {activeChildren.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {activeChildren.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  onClick={onNavigate}
                  className="truncate rounded-md px-2 py-1.5 text-sm text-foreground/80 transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {!!activeCategory.productCount && activeCategory.productCount > 0
                ? `${activeCategory.productCount} ${t('nav.megaMenu.products')}`
                : t('nav.megaMenu.noSubcategories')}
            </p>
          )}
          <Link
            href={`/categories/${activeCategory.slug}`}
            onClick={onNavigate}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {t('nav.megaMenu.viewCategory')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Featured Categories */}
        <div className="hidden w-60 shrink-0 border-l bg-muted/10 p-4 xl:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nav.megaMenu.featured')}
          </p>
          <div className="space-y-2.5">
            {fallbackFeatured.map((category) => {
              const Icon = getCategoryIcon(category.name);
              return (
                <Link
                  key={category.id}
                  href={`/categories/${category.slug}`}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-xl border bg-background p-2.5 transition-shadow hover:shadow-sm"
                >
                  <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
                    {category.image ? (
                      <Image src={category.image} alt={category.name} fill sizes="44px" className="object-cover" />
                    ) : (
                      <Icon className="h-5 w-5 text-primary" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{category.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {!!category.productCount && category.productCount > 0
                        ? `${category.productCount} ${t('nav.megaMenu.products')}`
                        : t('nav.megaMenu.explore')}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <Link
            href="/deals"
            onClick={onNavigate}
            className="mt-3 flex items-center gap-3 rounded-xl bg-gradient-to-br from-primary to-blue-700 p-3.5 text-white transition-opacity hover:opacity-95"
          >
            <Gift className="h-8 w-8 shrink-0 text-white/90" strokeWidth={1.5} />
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-tight">{t('nav.megaMenu.promoTitle')}</span>
              <span className="mt-0.5 block text-xs text-white/80">{t('nav.megaMenu.promoSubtitle')}</span>
            </span>
          </Link>
        </div>
      </div>

      {/* Trust badges */}
      <div className="grid shrink-0 grid-cols-2 gap-3 border-t bg-muted/20 px-5 py-3 sm:grid-cols-4">
        {[
          { icon: Truck, label: t('nav.megaMenu.trust.delivery') },
          { icon: ShieldCheck, label: t('nav.megaMenu.trust.payment') },
          { icon: BadgeCheck, label: t('nav.megaMenu.trust.original') },
          { icon: Headset, label: t('nav.megaMenu.trust.support') },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
