'use client';

import { useState } from 'react';
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
import { ProductForm } from './components/ProductForm';
import { Plus, Download, RefreshCw, Package } from 'lucide-react';

export default function ProductsPage() {
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);

  const { data, isLoading, refetch } = useProducts(filters);

  const handleExport = async () => {
    window.location.href = '/api/products/export';
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
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
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
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ProductFilters filters={filters} setFilters={setFilters} />
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Total {data?.pagination?.total || 0} products found
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
                <>
                  {selectedProducts.length > 0 && (
                    <div className="mb-4 flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {selectedProducts.length} products selected
                      </p>
                      <Button variant="outline" size="sm" onClick={handleBulkAction}>
                        Bulk Actions ({selectedProducts.length})
                      </Button>
                    </div>
                  )}
                  <ProductsTable
                    products={data?.data || []}
                    selectedProducts={selectedProducts}
                    onSelectProduct={(id) => {
                      setSelectedProducts(prev =>
                        prev.includes(id)
                          ? prev.filter(p => p !== id)
                          : [...prev, id]
                      );
                    }}
                    onSelectAll={(ids) => {
                      setSelectedProducts(ids);
                    }}
                    onRefresh={refetch}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <ProductFilters filters={filters} setFilters={setFilters} />
          <Card>
            <CardHeader>
              <CardTitle>Active Products</CardTitle>
              <CardDescription>
                Products that are currently active and visible to customers
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
                  products={(data?.data || []).filter(p => p.isActive)}
                  selectedProducts={selectedProducts}
                  onSelectProduct={(id) => {
                    setSelectedProducts(prev =>
                      prev.includes(id)
                        ? prev.filter(p => p !== id)
                        : [...prev, id]
                    );
                  }}
                  onSelectAll={(ids) => {
                    setSelectedProducts(ids);
                  }}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
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
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <ProductsTable
                  products={(data?.data || []).filter(p => !p.isActive)}
                  selectedProducts={selectedProducts}
                  onSelectProduct={(id) => {
                    setSelectedProducts(prev =>
                      prev.includes(id)
                        ? prev.filter(p => p !== id)
                        : [...prev, id]
                    );
                  }}
                  onSelectAll={(ids) => {
                    setSelectedProducts(ids);
                  }}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
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
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <ProductsTable
                  products={(data?.data || []).filter(p => p.stock === 0)}
                  selectedProducts={selectedProducts}
                  onSelectProduct={(id) => {
                    setSelectedProducts(prev =>
                      prev.includes(id)
                        ? prev.filter(p => p !== id)
                        : [...prev, id]
                    );
                  }}
                  onSelectAll={(ids) => {
                    setSelectedProducts(ids);
                  }}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lowStock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Products</CardTitle>
              <CardDescription>
                Products with stock below 10 units
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
                  products={(data?.data || []).filter(p => p.stock > 0 && p.stock < 10)}
                  selectedProducts={selectedProducts}
                  onSelectProduct={(id) => {
                    setSelectedProducts(prev =>
                      prev.includes(id)
                        ? prev.filter(p => p !== id)
                        : [...prev, id]
                    );
                  }}
                  onSelectAll={(ids) => {
                    setSelectedProducts(ids);
                  }}
                  onRefresh={refetch}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Product Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product. Fill in all the required information.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            onSuccess={() => {
              setShowCreateDialog(false);
              refetch();
            }}
            onCancel={() => setShowCreateDialog(false)}
          />
        </DialogContent>
      </Dialog>

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
              refetch();
            }}
            onCancel={() => setShowBulkDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}