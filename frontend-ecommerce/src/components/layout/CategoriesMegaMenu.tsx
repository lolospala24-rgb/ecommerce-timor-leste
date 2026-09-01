'use client';

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

// Full mega-menu panel for the header's "All Categories" trigger: a browse
// list, a subcategory grid for the top categories, and a featured rail —
// all driven by the same real category tree /categories/tree already
// returns, nothing fabricated beyond icon choice and the generic promo copy.
export function CategoriesMegaMenu({ onNavigate }: CategoriesMegaMenuProps) {
  const { t } = useTranslation();
  const { data: tree } = useCategoryTree();
  const categories = (tree ?? []) as Category[];

  if (categories.length === 0) {
    return (
      <div className="p-6 text-sm text-muted-foreground">{t('nav.megaMenu.empty')}</div>
    );
  }

  const shopByCategory = categories.slice(0, 8);
  const featured = categories.filter((c) => c.isFeatured).slice(0, 4);
  const fallbackFeatured = featured.length > 0 ? featured : categories.slice(0, 4);

  return (
    <div className="flex w-[min(980px,calc(100vw-2rem))] max-h-[min(640px,calc(100vh-6rem))] flex-col overflow-hidden">
      <div className="flex flex-1 overflow-y-auto">
        {/* Browse Categories */}
        <div className="w-48 shrink-0 border-r bg-muted/20 py-3">
          <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nav.megaMenu.browse')}
          </p>
          <ul>
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.name);
              return (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    onClick={onNavigate}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground/85 transition-colors hover:bg-primary/5 hover:text-primary"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
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

        {/* Shop by Category */}
        <div className="flex-1 px-5 py-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nav.megaMenu.shopByCategory')}
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
            {shopByCategory.map((category) => {
              const Icon = getCategoryIcon(category.name);
              const children = (category.children ?? []) as CategoryChild[];
              return (
                <div key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    onClick={onNavigate}
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <span className="leading-tight">{category.name}</span>
                  </Link>
                  {children.length > 0 ? (
                    <ul className="space-y-1.5">
                      {children.slice(0, 5).map((child) => (
                        <li key={child.id}>
                          <Link
                            href={`/categories/${child.slug}`}
                            onClick={onNavigate}
                            className="block truncate text-sm text-muted-foreground hover:text-primary"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : !!category.productCount && category.productCount > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {category.productCount} {t('nav.megaMenu.products')}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/70">{t('nav.megaMenu.explore')}</p>
                  )}
                  <Link
                    href={`/categories/${category.slug}`}
                    onClick={onNavigate}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {t('nav.megaMenu.viewCategory')}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              );
            })}
          </div>
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
            href="/products"
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
