'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FolderTree } from 'lucide-react';
import type { CategoryChild } from '@/types/category.types';
import { cn } from '@/lib/utils';

interface CategorySubcategoriesProps {
  children: CategoryChild[];
  activeSubcategoryId?: number;
  onSelect?: (subcategoryId?: number) => void;
}

export function CategorySubcategories({
  children,
  activeSubcategoryId,
  onSelect,
}: CategorySubcategoriesProps) {
  if (!children.length) return null;

  return (
    <section className="space-y-4" id="subcategories">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <FolderTree className="h-5 w-5 text-primary" />
        Subcategories
      </h2>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" data-lenis-prevent>
        <button
          type="button"
          onClick={() => onSelect?.(undefined)}
          className={cn(
            'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
            !activeSubcategoryId
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background hover:border-primary/40',
          )}
        >
          All
        </button>

        {children.map((child) => {
          const isActive = activeSubcategoryId === child.id;
          const content = (
            <>
              {child.image ? (
                <span className="relative h-8 w-8 overflow-hidden rounded-full shrink-0">
                  <Image src={child.image} alt="" fill className="object-cover" sizes="32px" />
                </span>
              ) : null}
              <span className="truncate">{child.name}</span>
              <span className="text-xs opacity-70">({child.productCount ?? 0})</span>
            </>
          );

          if (onSelect) {
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => onSelect(child.id)}
                className={cn(
                  'shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:border-primary/40',
                )}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={child.id}
              href={`/categories/${child.slug}`}
              className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/40 transition-colors"
            >
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
