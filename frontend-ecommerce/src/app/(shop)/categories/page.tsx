'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCategories } from '@/hooks/useCategories';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { getCategoryIcon } from '@/lib/categoryIcons';
import { FolderTree, ChevronRight, Home, ShoppingBag, LayoutGrid, ArrowRight } from 'lucide-react';
import type { Category } from '@/types/category.types';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Purely presentational rotation — real category, real name, real
// description; only the banner color/gradient is a stylistic choice
// standing in for a real category photo (most categories in this catalog
// don't have one uploaded yet).
const BANNER_STYLES = [
  'from-emerald-500 to-emerald-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-teal-500 to-cyan-600',
];

interface CategoryNode extends Category {
  children: CategoryNode[];
}

function firstLetter(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase();
  return ALPHABET.includes(ch) ? ch : '#';
}

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: categories, isLoading } = useCategories({
    limit: 100,
    includeProducts: true,
  });

  const allCategories = (categories?.data ?? []) as Category[];

  const filteredCategories = useMemo(() => {
    if (!searchQuery) return allCategories;
    const query = searchQuery.toLowerCase();
    return allCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.nameTetum?.toLowerCase().includes(query) ||
        category.description?.toLowerCase().includes(query),
    );
  }, [allCategories, searchQuery]);

  const categoryTree = useMemo(() => {
    const buildTree = (items: Category[], parentId: number | null = null): CategoryNode[] =>
      items
        .filter((item) => (item.parentId ?? null) === parentId)
        .map((item) => ({ ...item, children: buildTree(items, item.id) }));
    return buildTree(filteredCategories).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredCategories]);

  // Directory browsing (jump to a letter) instead of numbered pages — the
  // A-Z nav below is the navigation mechanism, and with a real category
  // count in the tens rather than thousands there's no need to page.
  const groupedByLetter = useMemo(() => {
    const groups = new Map<string, CategoryNode[]>();
    for (const category of categoryTree) {
      const letter = firstLetter(category.name);
      if (!groups.has(letter)) groups.set(letter, []);
      groups.get(letter)!.push(category);
    }
    return groups;
  }, [categoryTree]);

  const availableLetters = useMemo(
    () => new Set([...groupedByLetter.keys()].filter((l) => l !== '#')),
    [groupedByLetter],
  );

  const totalProducts = allCategories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

  const handleSearch = (value: string) => setSearchQuery(value);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
          <Home className="h-3.5 w-3.5" />
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">Categories</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <LayoutGrid className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">Direktoriu Kategoria</h1>
          </div>
          <p className="text-sm text-muted-foreground sm:text-base">
            {allCategories.length} {allCategories.length === 1 ? 'kategoria' : 'kategoria'} &middot;{' '}
            {totalProducts.toLocaleString()} {totalProducts === 1 ? 'produtu' : 'produtu'} atu esplora
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search categories..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>

      {categoryTree.length === 0 ? (
        <EmptyState
          title="No categories found"
          description={
            searchQuery
              ? `No categories match "${searchQuery}". Try a different search term.`
              : 'Categories will appear here once they are added to the catalog.'
          }
          icon={<FolderTree className="h-10 w-10 text-muted-foreground" />}
          action={searchQuery ? { label: 'Clear Search', onClick: () => handleSearch('') } : undefined}
        />
      ) : (
        <>
          {/* A-Z jump nav */}
          <div className="sticky top-16 z-10 flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
            <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Direktori menurut
            </span>
            {ALPHABET.map((letter) => {
              const available = availableLetters.has(letter);
              return available ? (
                <a
                  key={letter}
                  href={`#cat-letter-${letter}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-primary transition-colors hover:bg-primary/10"
                >
                  {letter}
                </a>
              ) : (
                <span
                  key={letter}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-medium text-muted-foreground/30"
                >
                  {letter}
                </span>
              );
            })}
          </div>

          {/* Letter sections */}
          <div className="space-y-12">
            {[...groupedByLetter.entries()]
              .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
              .map(([letter, letterCategories]) => (
                <section key={letter} id={`cat-letter-${letter}`} className="scroll-mt-32">
                  <div className="flex flex-col gap-6 sm:flex-row">
                    <div className="shrink-0 sm:w-32">
                      <span className="text-5xl font-black text-muted-foreground/20">{letter}</span>
                      <ul className="mt-2 space-y-1">
                        {letterCategories.map((category) => (
                          <li key={category.id}>
                            <a
                              href={`#cat-${category.slug}`}
                              className="text-sm text-muted-foreground hover:text-primary"
                            >
                              {category.name}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex-1 space-y-6">
                      {letterCategories.map((category, i) => (
                        <CategoryDirectoryRow
                          key={category.id}
                          category={category}
                          bannerClass={BANNER_STYLES[(category.id + i) % BANNER_STYLES.length]}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              ))}
          </div>

          <div className="flex justify-center pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
            >
              <ShoppingBag className="h-4 w-4 text-primary" />
              Browse All Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

// One category "entry" in the directory: a colored banner (icon standing in
// for a real photo, most categories don't have one uploaded) plus either a
// real subcategory grid — if this category actually has children — or its
// description, since fabricating subcategories that don't exist in the
// catalog isn't an option.
function CategoryDirectoryRow({ category, bannerClass }: { category: CategoryNode; bannerClass: string }) {
  const Icon = getCategoryIcon(category.name);

  return (
    <div
      id={`cat-${category.slug}`}
      className="scroll-mt-32 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md sm:flex"
    >
      <Link
        href={`/categories/${category.slug}`}
        className={`group relative flex min-h-[160px] shrink-0 flex-col justify-end overflow-hidden bg-gradient-to-br p-5 sm:w-72 ${bannerClass}`}
      >
        <Icon className="absolute -right-4 -top-4 h-28 w-28 text-white/15" strokeWidth={1.25} />
        {category.isFeatured && (
          <span className="absolute left-4 top-4 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
            Featured
          </span>
        )}
        <Icon className="h-8 w-8 text-white" strokeWidth={1.75} />
        <h2 className="mt-3 text-xl font-bold leading-tight text-white">{category.name}</h2>
        {category.nameTetum && category.nameTetum !== category.name && (
          <p className="text-sm text-white/80">{category.nameTetum}</p>
        )}
      </Link>

      <div className="flex-1 p-5 sm:p-6">
        {category.children.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupChildrenIntoColumns(category.children).map((column, idx) => (
              <div key={idx} className="space-y-2">
                {column.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="block text-sm text-foreground/80 hover:text-primary hover:underline"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {category.description || 'Explore products in this category.'}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
          {!!category.productCount && category.productCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShoppingBag className="h-3.5 w-3.5" />
              {category.productCount} {category.productCount === 1 ? 'product' : 'products'}
            </span>
          ) : (
            <span />
          )}
          <Link
            href={`/categories/${category.slug}`}
            className="group flex shrink-0 items-center text-sm font-semibold text-primary"
          >
            Browse Category
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// Splits a flat children list into up to 3 evenly-sized columns for the
// directory grid (reference layout groups subcategories into columns).
function groupChildrenIntoColumns<T>(items: T[]): T[][] {
  const columnCount = items.length > 6 ? 3 : items.length > 3 ? 2 : 1;
  const perColumn = Math.ceil(items.length / columnCount);
  return Array.from({ length: columnCount }, (_, i) => items.slice(i * perColumn, (i + 1) * perColumn));
}
