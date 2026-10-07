'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Category, CategoryChild } from '@/types/category.types';
import { getCategoryColorPair } from './categoryTokens';

interface SubCategoryGridProps {
  category: Category;
  children: CategoryChild[];
}

export function SubCategoryGrid({ category, children }: SubCategoryGridProps) {
  const pair = getCategoryColorPair(category.name, category.id);

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-4 min-[600px]:grid-cols-4 min-[1000px]:grid-cols-5">
      {children.map((child) => (
        <Link
          key={child.id}
          href={`/categories/${category.slug}?subcategory=${child.id}`}
          className="flex flex-col items-center gap-1.5"
        >
          <span
            className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px]"
            style={{ backgroundColor: pair.tint }}
          >
            {child.image ? (
              <Image src={child.image} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <span className="text-[22px] font-extrabold" style={{ color: pair.icon }}>
                {child.name.trim().charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <span className="line-clamp-2 text-center text-[12px] font-semibold leading-tight text-[#142019]">
            {child.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
