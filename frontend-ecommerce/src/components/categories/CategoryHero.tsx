'use client';

import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { getCategoryColorPair } from './categoryTokens';
import type { Category } from '@/types/category.types';

interface CategoryHeroProps {
  category: Category;
  productCount: number;
  /** Highest real discount % among this category's currently-promoted
   *  products (derived the same way DealCarousel finds them) — omitted
   *  entirely rather than showing a made-up "up to X%" when there's none. */
  maxDiscountPercent?: number;
}

export function CategoryHero({ category, productCount, maxDiscountPercent }: CategoryHeroProps) {
  const { t } = useTranslation();
  const Icon = getCategoryIcon(category.name);
  const pair = getCategoryColorPair(category.name, category.id);
  const image = category.banner || category.image;

  return (
    <div className="relative h-40 overflow-hidden rounded-[20px]" style={{ backgroundColor: pair.tint }}>
      <span
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-40"
        style={{ backgroundColor: pair.icon }}
      />

      <div className="relative z-10 flex h-full items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-extrabold leading-tight text-[#142019]">{category.name}</h1>
          {category.description && (
            <p className="mt-1 line-clamp-2 text-[12px] text-[#2A3830]">{category.description}</p>
          )}
          <p className="mt-1.5 text-[12px] font-medium text-[#56635B]">
            {t('productList.resultCountAll', { count: productCount })}
          </p>
          {!!maxDiscountPercent && maxDiscountPercent > 0 && (
            <span className="mt-2 inline-flex items-center rounded-full bg-[#B4410F] px-2.5 py-1 text-[11px] font-bold text-white">
              {t('category.discountUpTo', { percent: maxDiscountPercent })}
            </span>
          )}
        </div>

        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_4px_14px_rgba(20,32,25,0.12)]">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" sizes="96px" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Icon className="h-10 w-10" style={{ color: pair.icon }} strokeWidth={1.75} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
