'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RemoteImage } from '@/components/shared/RemoteImage';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Copy, Trash2, EyeOff } from 'lucide-react';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface ProductsTableProps {
  products: any[];
  selectedProducts: number[];
  onSelectProduct: (id: number) => void;
  onSelectAll: (ids: number[]) => void;
  onRefresh: () => void;
}

export function ProductsTable({
  products,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
  onRefresh,
}: ProductsTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const allSelected = products.length > 0 && selectedProducts.length === products.length;
  const someSelected = selectedProducts.length > 0 && selectedProducts.length < products.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(products.map(p => p.id));
    }
  };

  const handleToggleStatus = async (product: any) => {
    setIsLoading(true);
    try {
      await api.post(`/products/${product.id}/toggle-status`);
      toast.success(`Product ${product.isActive ? 'deactivated' : 'activated'} successfully`);
      onRefresh();
    } catch (error) {
      toast.error('Failed to update product status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProduct) return;
    setIsLoading(true);
    try {
      await api.delete(`/products/${selectedProduct.id}`);
      toast.success('Product deleted successfully');
      onRefresh();
    } catch (error) {
      const message = (error as any).response?.data?.message;
      if (message === 'Cannot delete product with pending orders') {
        const confirm = window.confirm(
          'This product has pending orders and cannot be deleted. Deactivate (hide) the product instead?'
        );
        if (confirm) {
          try {
            await api.post(`/products/${selectedProduct.id}/force-delete`);
            toast.success('Product deactivated successfully');
            onRefresh();
          } catch (e) {
            toast.error('Failed to deactivate product');
          } finally {
            setIsLoading(false);
            setDeleteDialogOpen(false);
            setSelectedProduct(null);
          }
          return;
        }
      }

      toast.error(message || 'Failed to delete product');
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleClone = async (product: any) => {
    setIsLoading(true);
    try {
      await api.post(`/products/${product.id}/clone`);
      toast.success('Product cloned successfully');
      onRefresh();
    } catch (error) {
      toast.error('Failed to clone product');
    } finally {
      setIsLoading(false);
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }
    if (stock < 10) {
      return <Badge variant="warning" className="bg-yellow-500">Low Stock ({stock})</Badge>;
    }
    return <Badge variant="default">In Stock ({stock})</Badge>;
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(ref) => {
                  if (ref) {
                    ref.indeterminate = someSelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sales</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8">
                No products found
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedProducts.includes(product.id)}
                    onCheckedChange={() => onSelectProduct(product.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                      <RemoteImage
                        src={product.thumbnail}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-medium line-clamp-1">{product.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {product.sku || '-'}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{product.seller?.storeName || '-'}</TableCell>
                <TableCell>{product.category?.name || '-'}</TableCell>
                <TableCell className="font-medium">
                  ${product.price.toLocaleString()}
                  {product.comparePrice && (
                    <span className="text-xs text-muted-foreground line-through ml-1">
                      ${product.comparePrice.toLocaleString()}
                    </span>
                  )}
                </TableCell>
                <TableCell>{getStockBadge(product.stock)}</TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>{product._count?.orderItems || 0}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Product
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClone(product)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone Product
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleStatus(product)}>
                        {product.isActive ? (
                          <>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Eye className="mr-2 h-4 w-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedProduct(product);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Product
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={`Are you sure you want to delete "${selectedProduct?.name}"? This will also remove all associated orders and reviews. This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleDelete}
        isLoading={isLoading}
      />
    </>
  );
}