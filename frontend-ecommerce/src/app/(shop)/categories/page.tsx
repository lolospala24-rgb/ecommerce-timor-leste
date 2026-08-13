'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCategories } from '@/hooks/useCategories';
import { SearchInput } from '@/components/shared/SearchInput';
import { EmptyState } from '@/components/shared/EmptyState';
import { Pagination } from '@/components/shared/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FolderTree, ChevronRight, Home, Package, LayoutGrid } from 'lucide-react';
import type { Category } from '@/types/category.types';

const PAGE_SIZE = 12;

interface CategoryNode extends Category {
  children: CategoryNode[];
}

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
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
    return buildTree(filteredCategories);
  }, [filteredCategories]);

  const totalPages = Math.max(1, Math.ceil(categoryTree.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCategories = categoryTree.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const totalProducts = allCategories.reduce((sum, c) => sum + (c.productCount ?? 0), 0);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
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
            <h1 className="text-2xl font-bold sm:text-3xl">All Categories</h1>
          </div>
          <p className="text-sm text-muted-foreground sm:text-base">
            {allCategories.length} {allCategories.length === 1 ? 'category' : 'categories'} &middot;{' '}
            {totalProducts.toLocaleString()} {totalProducts === 1 ? 'product' : 'products'} to explore
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pagedCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={categoryTree.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              showTotal={false}
            />
          )}
        </>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryNode }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted/40">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FolderTree className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100" />
        {category.isFeatured && (
          <Badge className="absolute left-3 top-3 border-0 bg-amber-500 text-white shadow-md">
            Featured
          </Badge>
        )}
        {!!category.productCount && category.productCount > 0 && (
          <div className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Package className="h-3 w-3" />
            {category.productCount}
          </div>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        {category.nameTetum && (
          <p className="mt-0.5 text-sm text-muted-foreground">{category.nameTetum}</p>
        )}
        {category.description && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{category.description}</p>
        )}

        {category.children.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {category.children.slice(0, 3).map((child) => (
              <span
                key={child.id}
                className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
              >
                {child.name}
              </span>
            ))}
            {category.children.length > 3 && (
              <span className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground">
                +{category.children.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center text-sm font-medium text-primary">
          Browse Category
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}
