'use client';

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
import { Grid3x3, Edit, EyeOff, Eye, Trash2 } from 'lucide-react';

export interface DisplayVariant {
  key: string | number;
  sku?: string | null;
  /** '-' for a saved variant with no SKU yet, '(auto)' for a staged one
   *  that will get one at product-creation time. */
  skuPlaceholder: string;
  attributes: Record<string, string>;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

interface VariantTableProps {
  variants: DisplayVariant[];
  emptyTitle: string;
  emptyHint: string;
  onEdit: (key: string | number) => void;
  onToggleActive: (key: string | number) => void;
  onDelete: (key: string | number) => void;
}

// Shared by VariantManager and StagedVariantManager — same compact table,
// only the row data source (live API results vs staged in-memory array)
// and the row actions' side effects differ, which stay in each caller.
export function VariantTable({
  variants,
  emptyTitle,
  emptyHint,
  onEdit,
  onToggleActive,
  onDelete,
}: VariantTableProps) {
  if (variants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Grid3x3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <p>{emptyTitle}</p>
        <p className="text-sm">{emptyHint}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Attributes</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Images</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {variants.map((variant) => (
          <TableRow key={variant.key}>
            <TableCell className="font-mono text-sm">{variant.sku || variant.skuPlaceholder}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {Object.entries(variant.attributes).map(([key, value]) => (
                  <Badge key={key} variant="secondary" className="text-xs">
                    {key}: {String(value)}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>${variant.price.toFixed(2)}</TableCell>
            <TableCell>{variant.stock}</TableCell>
            <TableCell>
              {variant.images.length > 0 ? (
                <Badge variant="outline">{variant.images.length} images</Badge>
              ) : (
                <span className="text-muted-foreground text-sm">No images</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={variant.isActive ? 'default' : 'secondary'}>
                {variant.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(variant.key)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => onToggleActive(variant.key)}>
                  {variant.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => onDelete(variant.key)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
