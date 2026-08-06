'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCategories } from '@/hooks/useCategories';
import { SearchInput } from '@/components/shared/SearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { FolderTree, ChevronRight } from 'lucide-react';

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: categories, isLoading } = useCategories({ 
    limit: 100,
    includeProducts: true,
  });

  const filteredCategories = categories?.data?.filter((category: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(query) ||
      category.nameTetum?.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query)
    );
  });

  // Build category tree
  const buildCategoryTree = (items: any[], parentId: number | null = null): any[] => {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: buildCategoryTree(items, item.id),
      }));
  };

  const categoryTree = buildCategoryTree(filteredCategories || []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">
            Browse products by category
          </p>
        </div>
        <div className="w-full sm:w-72">
          <SearchInput
            placeholder="Search categories..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
      </div>

      {categoryTree.length === 0 ? (
        <div className="text-center py-12">
          <FolderTree className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">No Categories Found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? 'No categories match your search' : 'Categories will appear here'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categoryTree.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryCard({ category }: { category: any }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group block overflow-hidden rounded-lg border bg-white transition-all hover:shadow-lg hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden bg-gray-100">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FolderTree className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {category.productCount > 0 && (
          <div className="absolute top-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
            {category.productCount} products
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        {category.nameTetum && (
          <p className="text-sm text-muted-foreground">{category.nameTetum}</p>
        )}
        {category.children && category.children.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {category.children.slice(0, 3).map((child: any) => (
              <span
                key={child.id}
                className="text-xs bg-muted px-2 py-0.5 rounded-full"
              >
                {child.name}
              </span>
            ))}
            {category.children.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{category.children.length - 3} more
              </span>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center text-sm text-primary font-medium">
          Explore
          <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}