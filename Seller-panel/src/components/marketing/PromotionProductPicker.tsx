'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Package, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { EmptyState } from '@/components/shared/EmptyState';
import { useSellerProducts } from '@/hooks/useSellerProducts';

export interface PickedProduct {
  id: number;
  name: string;
  thumbnail: string | null;
  price: number;
  stock: number;
}

interface PromotionProductPickerProps {
  selected: Map<number, PickedProduct>;
  onChange: (next: Map<number, PickedProduct>) => void;
}

// A lightweight, promotion-specific product picker — deliberately not the
// full ProductsTable, which carries seller-management actions (edit/
// delete/activate) that have no place inside a "pick products for this
// promotion" step. Reuses the same useSellerProducts()/search/pagination
// as the main Products page, and the same Set-of-ids selection idea, just
// keyed to a Map so a selection made on page 1 survives paging to page 2.
export function PromotionProductPicker({ selected, onChange }: PromotionProductPickerProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading } = useSellerProducts({ page, limit: 8, status: 'active', search: search || undefined });
  const products = data?.data || [];

  const toggle = (product: PickedProduct) => {
    const next = new Map(selected);
    if (next.has(product.id)) next.delete(product.id);
    else next.set(product.id, product);
    onChange(next);
  };

  const removeSelected = (id: number) => {
    const next = new Map(selected);
    next.delete(id);
    onChange(next);
  };

  const selectedList = Array.from(selected.values());

  return (
    <div className="space-y-4">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput);
        }}
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search your products…"
          className="pl-9"
        />
      </form>

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products found"
            description="Try a different search, or add products to your catalog first."
            className="border-0 py-10"
          />
        ) : (
          <>
            <div className="divide-y">
              {products.map((product) => {
                const checked = selected.has(product.id);
                return (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-accent/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        toggle({ id: product.id, name: product.name, thumbnail: product.thumbnail, price: product.price, stock: product.stock })
                      }
                    />
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                      {product.thumbnail && (
                        <Image src={product.thumbnail} alt={product.name} width={40} height={40} unoptimized className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${product.price.toFixed(2)} · {product.stock} in stock
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
            {data && (
              <div className="border-t p-3">
                <PaginationControls
                  page={data.pagination.page}
                  totalPages={data.pagination.totalPages}
                  hasNext={data.pagination.hasNext}
                  hasPrev={data.pagination.hasPrev}
                  total={data.pagination.total}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">
          Selected products <span className="text-muted-foreground">({selectedList.length})</span>
        </p>
        {selectedList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No products selected yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedList.map((product) => (
              <Badge key={product.id} variant="secondary" className="gap-1.5 py-1.5 pl-2.5 pr-1.5 font-normal">
                {product.name}
                <button
                  type="button"
                  onClick={() => removeSelected(product.id)}
                  className="rounded-full p-0.5 hover:bg-background/60"
                  aria-label={`Remove ${product.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
