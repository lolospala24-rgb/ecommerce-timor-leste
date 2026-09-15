'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Download, Loader2, Plus, Power, PowerOff, Search, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { PaginationControls } from '@/components/shared/PaginationControls';
import { ProductsTable } from '@/components/products/ProductsTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
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
import {
  fetchAllSellerProducts,
  useDeleteProduct,
  useSellerProducts,
  useToggleProductStatus,
} from '@/hooks/useSellerProducts';
import { toCsv, downloadCsv } from '@/lib/csv';
import type { ProductStatusFilter } from '@/types/product.types';

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const page = Number(searchParams.get('page') || 1);
  const status = (searchParams.get('status') as ProductStatusFilter | null) || undefined;

  const { data, isLoading } = useSellerProducts({ page, limit: 12, status, search: search || undefined });
  const toggleStatus = useToggleProductStatus();
  const deleteProduct = useDeleteProduct();

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const products = data?.data || [];
  const selectedProducts = useMemo(() => products.filter((p) => selectedIds.has(p.id)), [products, selectedIds]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== 'page') params.delete('page');
    router.push(`/products?${params.toString()}`);
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      if (products.length > 0 && products.every((p) => prev.has(p.id))) return new Set();
      return new Set(products.map((p) => p.id));
    });
  };

  const runBulkStatusChange = async (targetActive: boolean) => {
    const targets = selectedProducts.filter((p) => p.isActive !== targetActive);
    if (targets.length === 0) {
      toast.error(targetActive ? 'Selected products are already active' : 'Selected products are already inactive');
      return;
    }
    setBulkBusy(true);
    const results = await Promise.allSettled(targets.map((p) => toggleStatus.mutateAsync(p.id)));
    setBulkBusy(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) toast.success(`${targets.length} product(s) ${targetActive ? 'activated' : 'deactivated'}`);
    else toast.error(`${targets.length - failed} succeeded, ${failed} failed`);
    clearSelection();
  };

  const runBulkDelete = async () => {
    setBulkBusy(true);
    const results = await Promise.allSettled(selectedProducts.map((p) => deleteProduct.mutateAsync(p.id)));
    setBulkBusy(false);
    setBulkDeleteOpen(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed === 0) toast.success(`${selectedProducts.length} product(s) deleted`);
    else toast.error(`${selectedProducts.length - failed} deleted, ${failed} failed (likely have active orders)`);
    clearSelection();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await fetchAllSellerProducts(status);
      const csv = toCsv(all, [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'price', label: 'Price' },
        { key: 'comparePrice', label: 'Compare Price' },
        { key: 'stock', label: 'Stock' },
        { key: 'isActive', label: 'Active' },
        { key: 'isFeatured', label: 'Featured' },
        { key: 'createdAt', label: 'Created At' },
      ]);
      downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(`Exported ${all.length} product(s)`);
    } catch {
      toast.error('Failed to export products');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage everything in your catalog."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
            <Button asChild>
              <Link href="/products/new">
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Link>
            </Button>
          </div>
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

      {selectedIds.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-accent/50 px-4 py-2.5">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulkStatusChange(true)}>
              <Power className="mr-1.5 h-3.5 w-3.5" /> Activate
            </Button>
            <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => runBulkStatusChange(false)}>
              <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Deactivate
            </Button>
            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" disabled={bulkBusy} onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
            </Button>
            <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={clearSelection}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ProductsTable products={products} selectedIds={selectedIds} onToggleSelect={toggleSelect} onToggleSelectAll={toggleSelectAll} />
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

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.size} product(s)?`}
        description="Products with active orders will be skipped. This can't be undone for the rest."
        confirmText="Delete"
        isLoading={bulkBusy}
        onConfirm={runBulkDelete}
      />
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
