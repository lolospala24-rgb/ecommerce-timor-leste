'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ProductsTable } from '@/components/products/ProductsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSellerProducts } from '@/hooks/useSellerProducts';
import type { ProductStatusFilter } from '@/types/product.types';

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const page = Number(searchParams.get('page') || 1);
  const status = (searchParams.get('status') as ProductStatusFilter | null) || undefined;

  const { data, isLoading } = useSellerProducts({ page, limit: 12, status, search: search || undefined });

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage everything in your catalog."
        action={
          <Button asChild>
            <Link href="/products/new">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            updateParam('search', search || null);
          }}
        >
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="pl-9"
          />
        </form>
        <Select value={status || 'all'} onValueChange={(v) => updateParam('status', v === 'all' ? null : v)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="out-of-stock">Out of stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ProductsTable products={data?.data || []} />
            {data && (
              <div className="p-4">
                <PaginationControls
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  hasNext={data.pagination.hasNext}
                  hasPrev={data.pagination.hasPrev}
                  total={data.pagination.total}
                  onPageChange={(p) => updateParam('page', String(p))}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageContent />
    </Suspense>
  );
}
