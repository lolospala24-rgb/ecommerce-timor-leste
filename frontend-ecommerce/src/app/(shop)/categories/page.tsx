'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Search, ShoppingCart } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useCartStore } from '@/stores/cartStore';
import { useTranslation } from '@/lib/i18n/LanguageContext';
import { CategoryRail } from '@/components/categories/CategoryRail';
import { CategoryBanner } from '@/components/categories/CategoryBanner';
import { SubCategoryGrid } from '@/components/categories/SubCategoryGrid';
import { PopularSearchChips } from '@/components/categories/PopularSearchChips';
import { EmptyState } from '@/components/shared/EmptyState';
import type { Category } from '@/types/category.types';

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function CategoriesSkeleton() {
  return (
    <div className="flex h-[calc(100vh-128px)]">
      <div className="w-24 shrink-0 space-y-2 bg-[#F4F6F3] px-2 py-3 min-[600px]:w-[120px]">
        {[...Array(7)].map((_, i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-[14px] bg-[#E4E9E5]" />
        ))}
      </div>
      <div className="flex-1 space-y-5 p-4">
        <div className="h-24 animate-pulse rounded-2xl bg-[#F4F6F3]" />
        <div className="h-4 w-28 animate-pulse rounded bg-[#F4F6F3]" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 w-16 animate-pulse rounded-[18px] bg-[#F4F6F3]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const cartCount = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  const { data, isLoading } = useCategories({ limit: 100, includeProducts: true });
  const allCategories = useMemo(() => (data?.data ?? []) as Category[], [data]);

  // Same flat-list -> tree shaping the old directory page used (parentId
  // grouping) — the API itself returns a flat list here (unlike
  // /categories/tree), this is the real business logic kept as-is.
  const tree = useMemo<CategoryNode[]>(() => {
    const buildTree = (parentId: number | null): CategoryNode[] =>
      allCategories
        .filter((c) => (c.parentId ?? null) === parentId)
        .map((c) => ({ ...c, children: buildTree(c.id) }));
    return buildTree(null);
  }, [allCategories]);

  const filteredTree = useMemo(() => {
    if (!searchQuery) return tree;
    const q = searchQuery.toLowerCase();
    const matches = (c: CategoryNode): boolean =>
      c.name.toLowerCase().includes(q) ||
      !!c.nameTetum?.toLowerCase().includes(q) ||
      c.children.some(matches);
    return tree.filter(matches);
  }, [tree, searchQuery]);

  // First load selects the first category; search narrowing the rail keeps
  // the selection valid (falls back to the new first match) instead of
  // pointing at a now-hidden category.
  useEffect(() => {
    if (filteredTree.length === 0) {
      setSelectedId(undefined);
      return;
    }
    if (!filteredTree.some((c) => c.id === selectedId)) {
      setSelectedId(filteredTree[0].id);
    }
  }, [filteredTree, selectedId]);

  const selectedCategory = filteredTree.find((c) => c.id === selectedId);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F3]">
      <div className="border-b border-[#EEF1EE] bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label={t('category.backAria')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-[19px] font-extrabold text-[#142019]">{t('category.title')}</h1>
          <Link
            href="/cart"
            aria-label={t('category.cartAria')}
            className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4F6F3] text-[#142019]"
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B4410F] px-1 text-[10px] font-semibold text-white">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#56635B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('category.searchPlaceholder')}
            aria-label={t('category.searchAria')}
            className="h-[46px] w-full rounded-xl border border-transparent bg-[#F4F6F3] pl-9 pr-4 text-[14px] text-[#142019] outline-none focus:border-[#17703F]"
          />
        </div>
      </div>

      {isLoading ? (
        <CategoriesSkeleton />
      ) : filteredTree.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={searchQuery ? t('category.emptySearch') : t('category.noCategories')}
            icon={<Search className="h-10 w-10 text-muted-foreground" />}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <CategoryRail categories={filteredTree} selectedId={selectedId} onSelect={(c) => setSelectedId(c.id)} />

          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {selectedCategory && (
                <motion.div
                  key={selectedCategory.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5 p-4"
                >
                  <CategoryBanner category={selectedCategory} />

                  {selectedCategory.children.length > 0 && (
                    <div>
                      <h3 className="mb-2.5 text-[15px] font-extrabold text-[#142019]">
                        {t('category.subCategoryTitle')}
                      </h3>
                      <SubCategoryGrid category={selectedCategory} children={selectedCategory.children} />
                    </div>
                  )}

                  <PopularSearchChips />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
