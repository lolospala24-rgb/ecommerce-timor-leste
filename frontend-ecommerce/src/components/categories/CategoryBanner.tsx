'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { getCategoryColorPair } from './categoryTokens';
import type { Category } from '@/types/category.types';

interface CategoryBannerProps {
  category: Category;
}

// Screen 1's right-panel banner — distinct from the Screen 2 hero
// (CategoryHero): compact (96px), tinted by the category's own color pair,
// and links straight into the category detail page.
export function CategoryBanner({ category }: CategoryBannerProps) {
  const { t } = useTranslation();
  const Icon = getCategoryIcon(category.name);
  const pair = getCategoryColorPair(category.name, category.id);
  const tagline = category.description || category.nameTetum;

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="relative flex h-24 items-center overflow-hidden rounded-2xl px-4"
      style={{ backgroundColor: pair.tint }}
    >
      <div className="relative z-10 min-w-0 flex-1 pr-16">
        <h2 className="truncate text-[16px] font-extrabold text-[#142019]">{category.name}</h2>
        {tagline && <p className="mt-0.5 truncate text-[12px] text-[#56635B]">{tagline}</p>}
        <span className="mt-1 inline-flex items-center gap-0.5 text-[12px] font-bold text-[#17703F]">
          {t('category.seeAll')}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <span className="absolute -bottom-3 -right-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/70">
        <Icon className="h-8 w-8" style={{ color: pair.icon }} strokeWidth={1.75} />
      </span>
    </Link>
  );
}
