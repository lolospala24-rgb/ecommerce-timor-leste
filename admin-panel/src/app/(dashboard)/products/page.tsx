'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useProducts } from '@/hooks/useProducts';
import { ProductsTable } from './components/ProductsTable';
import ProductFilters from './components/ProductFilters';
import { BulkActions } from './components/BulkActions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Download, RefreshCw, Package } from 'lucide-react';
import { ErrorState } from '@/components/shared/ErrorState';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type BaseFilters = {
  page: number;
  limit: number;
  search: string;
  categoryId: number | undefined;
  sellerId: number | undefined;
};

type TabOverrides = {
  status?: 'all' | 'active' | 'inactive';
  stockStatus?: 'all' | 'inStock' | 'outOfStock' | 'lowStock';
  isLocallyMade?: boolean;
};

// Each tab is now its own query (status/stockStatus/isLocallyMade applied
// server-side, see ProductsService.findAll) instead of a client-side
// .filter() over one shared, already-paginated page of results — that
// previously made both the "X products found" count and pagination wrong
// for every tab except the unfiltered default. Living inside its own
// component (rather than a top-level hook call in ProductsPage) matters:
// Radix's Tabs only mounts the active TabsContent's subtree, so only the
// visible tab's query actually runs.
function ProductsTabPanel({
  base,
  overrides,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
}: {
  base: BaseFilters;
  overrides: TabOverrides;
  selectedProducts: number[];
  onSelectProduct: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
}) {
  const { data, isLoading, isError, refetch } = useProducts({ ...base, ...overrides });

  if (isError) {
    return (
      <CardContent>
        <ErrorState description="Couldn't load products. Check your connection and try again." onRetry={() => refetch()} />
      </CardContent>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <CardDescription>
          Total {data?.pagination.total ?? 0} products found
          {selectedProducts.length > 0 && ` • ${selectedProducts.length} selected`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <ProductsTable
            products={data?.data || []}
            selectedProducts={selectedProducts}
            onSelectProduct={onSelectProduct}
            onSelectAll={onSelectAll}
            onRefresh={refetch}
          />
        )}
      </CardContent>
    </>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    categoryId: undefined as number | undefined,
    sellerId: undefined as number | undefined,
    status: 'all' as 'all' | 'active' | 'inactive',
    stockStatus: 'all' as 'all' | 'inStock' | 'outOfStock' | 'lowStock',
  });
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const base: BaseFilters = {
    page: filters.page,
    limit: filters.limit,
    search: filters.search,
    categoryId: filters.categoryId,
    sellerId: filters.sellerId,
  };

  const onSelectProduct = (id: number) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };
  const onSelectAll = (ids: number[]) => setSelectedProducts(ids);

  const handleExport = async () => {
    try {
      // api's response interceptor already unwraps to response.data, so
      // this resolves directly to the Blob — not { data: Blob }.
      const blob = await api.get<Blob>('/products/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(blob as unknown as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Products exported successfully');
    } catch {
      toast.error('Failed to export products');
    }
  };

  const handleBulkAction = () => {
    if (selectedProducts.length > 0) {
      setShowBulkDialog(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products Management</h1>
          <p className="text-muted-foreground">
            Manage all products across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['products'] })}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => router.push('/products/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Products</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="outOfStock">Out of Stock</TabsTrigger>
          <TabsTrigger value="lowStock">Low Stock</TabsTrigger>
          <TabsTrigger value="local">🇹🇱 Local</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ProductFilters filters={filters} setFilters={setFilters} />
          {selectedProducts.length > 0 && (
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {selectedProducts.length} products selected
              </p>
              <Button variant="outline" size="sm" onClick={handleBulkAction}>
                Bulk Actions ({selectedProducts.length})
              </Button>
            </div>
          )}
          <Card>
            <ProductsTabPanel
              base={base}
              overrides={{ status: filters.status, stockStatus: filters.stockStatus }}
              selectedProducts={selectedProducts}
              onSelectProduct={onSelectProduct}
              onSelectAll={onSelectAll}
            />
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Products</CardTitle>
              <CardDescription>
                Products that are currently active and visible to customers
              </CardDescription>
            </CardHeader>
            <ProductsTabPanel
              base={base}
              overrides={{ status: 'active' }}
              selectedProducts={selectedProducts}
              onSelectProduct={onSelectProduct}
              onSelectAll={onSelectAll}
            />
          </Card>
        </TabsContent>

        <TabsContent value="inactive">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Products</CardTitle>
              <CardDescription>
                Products that are hidden from customers
              </CardDescription>
            </CardHeader>
            <ProductsTabPanel
              base={base}
              overrides={{ status: 'inactive' }}
              selectedProducts={selectedProducts}
              onSelectProduct={onSelectProduct}
              onSelectAll={onSelectAll}
            />
          </Card>
        </TabsContent>

        <TabsContent value="outOfStock">
          <Card>
            <CardHeader>
              <CardTitle>Out of Stock Products</CardTitle>
              <CardDescription>
                Products with zero inventory
              </CardDescription>
            </CardHeader>
            <ProductsTabPanel
              base={base}
              overrides={{ stockStatus: 'outOfStock' }}
              selectedProducts={selectedProducts}
              onSelectProduct={onSelectProduct}
              onSelectAll={onSelectAll}
            />
          </Card>
        </TabsContent>

        <TabsContent value="lowStock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Products</CardTitle>
              <CardDescription>
                Products below their low-stock alert threshold (or below 10 units, for products without one set)
              </CardDescription>
            </CardHeader>
            <ProductsTabPanel
              base={base}
              overrides={{ stockStatus: 'lowStock' }}
              selectedProducts={selectedProducts}
              onSelectProduct={onSelectProduct}
              onSelectAll={onSelectAll}
            />
          </Card>
        </TabsContent>
        <TabsContent value="local">
          <Card>
            <CardHeader>
              <CardTitle>Local Products</CardTitle>
              <CardDescription>
                Products marked &ldquo;Locally made in Timor-Leste&rdquo; — matches Product.isLocallyMade,
                the same flag the storefront&apos;s /local-products page and homepage section use
              </CardDescription>
            </CardHeader>
            <ProductsTabPanel
              base={base}
              overrides={{ isLocallyMade: true }}
              selectedProducts={selectedProducts}
              onSelectProduct={onSelectProduct}
              onSelectAll={onSelectAll}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Perform actions on {selectedProducts.length} selected products
            </DialogDescription>
          </DialogHeader>
          <BulkActions
            productIds={selectedProducts}
            onComplete={() => {
              setShowBulkDialog(false);
              setSelectedProducts([]);
              queryClient.invalidateQueries({ queryKey: ['products'] });
            }}
            onCancel={() => setShowBulkDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}