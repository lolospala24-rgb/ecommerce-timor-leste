'use client';

import Image from 'next/image';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { cn } from '@/lib/utils';
import { getCategoryColorPair } from './categoryTokens';
import type { Category, CategoryChild } from '@/types/category.types';

interface SubCategorySelectorProps {
  category: Category;
  children: CategoryChild[];
  activeSubcategoryId?: number;
  onSelect: (subcategoryId?: number) => void;
}

export function SubCategorySelector({ category, children, activeSubcategoryId, onSelect }: SubCategorySelectorProps) {
  const { t } = useTranslation();
  if (children.length === 0) return null;
  const pair = getCategoryColorPair(category.name, category.id);

  return (
    <div className="flex gap-3 overflow-x-auto px-4 py-1" data-lenis-prevent>
      <SelectorItem
        label={t('productList.categoryAll')}
        active={!activeSubcategoryId}
        onClick={() => onSelect(undefined)}
        pair={pair}
      />
      {children.map((child) => (
        <SelectorItem
          key={child.id}
          label={child.name}
          image={child.image}
          active={activeSubcategoryId === child.id}
          onClick={() => onSelect(child.id)}
          pair={pair}
        />
      ))}
    </div>
  );
}

function SelectorItem({
  label,
  image,
  active,
  onClick,
  pair,
}: {
  label: string;
  image?: string | null;
  active: boolean;
  onClick: () => void;
  pair: { tint: string; icon: string };
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-[74px] shrink-0 flex-col items-center gap-1.5">
      <span
        className={cn('relative flex h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full')}
        style={{
          backgroundColor: active ? '#17703F' : pair.tint,
          boxShadow: active ? '0 0 0 3px #E3F1E8' : undefined,
        }}
      >
        {image ? (
          <Image src={image} alt="" fill className="object-cover" sizes="60px" />
        ) : (
          <span
            className="text-[18px] font-extrabold"
            style={{ color: active ? '#FFFFFF' : pair.icon }}
          >
            {label.trim().charAt(0).toUpperCase()}
          </span>
        )}
      </span>
      <span
        className="line-clamp-2 text-center text-[11px] leading-tight"
        style={{ color: active ? '#0F5530' : '#56635B', fontWeight: active ? 700 : 500 }}
      >
        {label}
      </span>
    </button>
  );
}
