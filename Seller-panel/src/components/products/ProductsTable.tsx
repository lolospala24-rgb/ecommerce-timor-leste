'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MoreVertical, Pencil, Trash2, Power, Star } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Box } from 'lucide-react';
import { useDeleteProduct, useToggleProductStatus } from '@/hooks/useSellerProducts';
import type { SellerProduct } from '@/types/product.types';

export function ProductsTable({ products }: { products: SellerProduct[] }) {
  const [deleteTarget, setDeleteTarget] = useState<SellerProduct | null>(null);
  const deleteProduct = useDeleteProduct();
  const toggleStatus = useToggleProductStatus();

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Box}
        title="No products found"
        description="Try adjusting your filters, or add your first product."
        action={
          <Link href="/products/new" className="text-sm font-medium text-primary hover:underline">
            + Add Product
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const lowThreshold = product.lowStockThreshold ?? 10;
            const isLow = product.stock > 0 && product.stock < lowThreshold;
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <Link href={`/products/${product.id}`} className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md border bg-muted">
                      {product.thumbnail && (
                        <Image src={product.thumbnail} alt={product.name} width={40} height={40} unoptimized className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku || `#${product.id}`}</p>
                    </div>
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{product.category?.name || '—'}</TableCell>
                <TableCell className="text-sm tabular-nums">
                  ${product.price.toFixed(2)}
                  {product.comparePrice && product.comparePrice > product.price && (
                    <span className="ml-1.5 text-xs text-muted-foreground line-through">${product.comparePrice.toFixed(2)}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={product.stock === 0 ? 'destructive' : isLow ? 'secondary' : 'outline'} className={isLow ? 'bg-warning/15 text-warning border-0' : ''}>
                    {product.stock === 0 ? 'Out of stock' : `${product.stock} units`}
                  </Badge>
                </TableCell>
                <TableCell>
                  {product._count.reviews > 0 ? (
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      {product.rating.toFixed(1)}
                      <span className="text-xs text-muted-foreground">({product._count.reviews})</span>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No reviews</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? 'default' : 'secondary'}>{product.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}`}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleStatus.mutate(product.id)}>
                        <Power className="mr-2 h-4 w-4" /> {product.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(product)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete product?"
        description={`"${deleteTarget?.name}" will be permanently removed. Products with active orders can't be deleted.`}
        confirmText="Delete"
        isLoading={deleteProduct.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteProduct.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
      />
    </>
  );
}
